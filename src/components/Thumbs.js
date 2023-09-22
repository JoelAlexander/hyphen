import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import ThumbsContract from '../../artifacts/contracts/Thumbs.sol/Thumbs.json'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import moment from 'moment'
import context from 'react-bootstrap/esm/AccordionContext'
const ethers = require("ethers")

const OneDayBlocks = 14400
const OneMonthBlocks = OneDayBlocks * 30

const mergeAndSortEvents = (events) => {
  const allEvents = [].concat(...events)

  return allEvents.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    } else if (a.transactionIndex !== b.transactionIndex) {
      return a.transactionIndex - b.transactionIndex
    } else if (a.args.id.toString() !== b.args.id.toString()) {
      return a.args.id.toString().localeCompare(b.args.id.toString())
    } else if (a.event !== b.event) {
      return a.event.localeCompare(b.event)
    } else {
      return 0
    }
  })
}

const updateProposed = (blockNumber, addr, topic, memo) => {
  const topicString = topic.toString()
  const proposal = { proposer: addr, blockNumber: blockNumber }
  return (topics) => {
    const existingTopic = topics[topicString]
    if (existingTopic) {
      return { ...topics,
        [topicString]: {
          ...existingTopic,
          proposals: [...existingTopic.proposals, proposal],
          memo: memo
        }
      }
    } else {
      return { ...topics,
        [topicString]: {
          memo: memo,
          proposals: [proposal],
          recalls: [],
          thumbsUp: {},
          thumbsDown: {},
        }
      }
    }
  }
}

const updateRecalled = (blockNumber, addr, topic, memo) => {
  const topicString = topic.toString()
  const recall = { proposer: addr, blockNumber: blockNumber }
  return (topics) => {
    const existingTopic = topics[topicString]
    if (existingTopic) {
      return { ...topics,
        [topicString]: {
          ...existingTopic,
          recalls: [...existingTopic.recalls, recall],
          memo: memo
        }
      }
    } else {
      return { ...topics,
        [topicString]: {
          memo: memo,
          proposals: [],
          recalls: [recall],
          thumbsUp: {},
          thumbsDown: {},
        }
      }
    }
  }
}

const updateThumbsUp = (blockNumber, addr, topic, memo) => {
  const topicString = topic.toString()
  return (topics) => {
    const newThumbsUp = { memo: memo, blockNumber: blockNumber }
    const existingTopic = topics[topicString]
    if (existingTopic) {
      const existingThumbsForAddress = existingTopic.thumbsUp[addr]
      if (existingThumbsForAddress) {
        return { ...topics,
          [topicString]: {
            ...existingTopic,
            thumbsUp: {
              ...existingTopic.thumbsUp,
              [addr]: [...existingThumbsForAddress, newThumbsUp]
            }
          }
        }
      } else {
        return { ...topics,
          [topicString]: {
            ...existingTopic,
            thumbsUp: {
              ...existingTopic.thumbsUp,
              [addr]: [newThumbsUp]
            }
          }
        }
      }
    }
    return topics
  }
}

const updateThumbsDown = (blockNumber, addr, topic, memo) => {
  const topicString = topic.toString()
  return (topics) => {
    const newThumbsDown = { memo: memo, blockNumber: blockNumber }
    const existingTopic = topics[topicString]
    if (existingTopic) {
      const existingThumbsForAddress = existingTopic.thumbDown[addr]
      if (existingThumbsForAddress) {
        return { ...topics,
          [topicString]: {
            ...existingTopic,
            thumbsDown: {
              ...existingTopic.thumbsDown,
              [addr]: [...existingThumbsForAddress, newThumbsDown]
            }
          }
        }
      } else {
        return { ...topics,
          [topicString]: {
            ...existingTopic,
            thumbsDown: {
              ...existingTopic.thumbsDown,
              [addr]: [newThumbsDown]
            }
          }
        }
      }
    }
    return topics
  }
}

const useEventDigest = (contract, startBlock, handlers) => {
  const context = useContext(HyphenContext)
  const [state, setState] = useState({})

  const digestEvents = (events) => {
    setState(mergeAndSortEvents(events).reduce((result, event) => {
      return handlers[event.event].digestEvent(event.blockNumber, ...event.args)(result)
    }, state))
  }

  useEffect(() => {
    Promise.all(Object.entries(handlers).map(([eventName, {filterArgs}]) => {
      const startBlockToUse = startBlock ? startBlock : 0
      const filterArgsToUse = filterArgs ? filterArgs : []
      const filter = contract.filters[eventName](...filterArgsToUse)
      const queryFilter = contract.queryFilter(filter, startBlockToUse, context.blockNumber)
      return queryFilter
    })).then(digestEvents)
  }, [])

  useEffect(() => {
    const unregisterListeners = Object.entries(handlers).map(([eventName, {digestEvent, filterArgs}]) => {
      const filterArgsToUse = filterArgs ? filterArgs : []
      const filter = contract.filters[eventName](...filterArgsToUse)
      const listener = (...args) => {
        setState(digestEvent(context.blockNumber, ...args))
      }
      contract.on(filter, listener)
      return () => {
        contract.off(filter, listener)
      }
    })

    return () => {
      unregisterListeners.forEach((fn) => {fn()})
    }
  }, [context.blockNumber])

  return state
}

const useInteractiveContractState = (contract, startBlock, eventHandlers) => {
  const context = useContext(HyphenContext)
  const trueState = useEventDigest(contract, eventHandlers, startBlock)
  const [pendingEvents, setPendingEvents] = useState(
    Object.fromEntries(
      Object.entries(eventHandlers).map(([eventName, _]) => [eventName, {}])))
  const [withPendingEventFunctions, setWithPendingEventFunctions] = useState(
    Object.fromEntries(
      Object.entries(eventHandlers).map(([eventName, _]) => [eventName, () => {}])))
  const [mergedState, setMergedState] = useState({})

  useEffect(() => {
    const withPendingEventFunctions = Object.fromEntries(
      Object.entries(eventHandlers)
        .map(([eventName, _]) => {
          const withPendingEvent = (...args) => {
            const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
            const [...newPendingEvent] = args
            newPendingEvent.blockNumber = context.blockNumber
            const beforePromise = () => {
              setPendingEvents((prev) => {
                return {...prev, [eventName]: { ...prev[eventName], [actionId]: newPendingEvent}}
              })
            }
            const afterPromise = () => {
              setPendingEvents(prev => {
                const {[eventName]: { [actionId]: _, ...remainingInner }, ...remainingOuter } = prev
                return {[eventName]: { ...remainingInner }, ...remainingOuter }
              })
            }
            return (promise) => {
              return Promise.resolve(beforePromise())
                .then(promise)
                .finally(afterPromise)
            }
          }

          return [`withPending${eventName}`, withPendingEvent]
        })
    )
    setWithPendingEventFunctions(withPendingEventFunctions)
  }, context.blockNumber)

  useEffect(() => {
    const mergeFunctions = Object.entries(eventHandlers)
      .map(([eventName, { digestEvent }]) => {
        return (state) => {
          const pendingEventsForEventName =  Object.values(pendingEvents[eventName])
          return pendingEventsForEventName.reduce((result, pendingEvent) => {
            return digestEvent(pendingEvent.blockNumber, ...pendingEvent)(result)
          }, state)
        }
      })

    const newMergedState = mergeFunctions.reduce((result, mergeFunction) => {
      return mergeFunction(result)
    }, trueState)

    setMergedState(newMergedState)
  }, [trueState, pendingEvents])

  return [mergedState, withPendingEventFunctions]
}

const MeetingProposal = ({ topic, topicData, thumbsUp, thumbsDown, recall }) => {
  const context = useContext(HyphenContext)
  const [RSVP, setRSVP] = useState(false)

  const extractLabels = () => {
      const splitByColon = topicData.memo.split(":")
      if (splitByColon.length > 1) {
          return splitByColon[0]
      }
      return ""
  }

  const extractTitle = () => {
      const splitByColon = topicData.memo.split(":")
      const splitByDash = splitByColon[1].split("-")
      return splitByDash[0].trim()
  }

  const extractTime = () => {
      const splitByDash = topicData.memo.split("-")
      return splitByDash[1].split(" ")[1] + " - " + splitByDash[2].split(" ")[1]
  };

  const extractDate = () => {
      return topicData.memo.split(" ").slice(-1)[0]
  }

  const vote = (address) => {
    const thumbsUpVotes = topicData.thumbsUp[address] || []
    const thumbsDownVotes = topicData.thumbsDown[address] || []
    const latestUpVote = thumbsUpVotes.length > 0 ? thumbsUpVotes[thumbsUpVotes.length - 1].blockNumber : 0
    const latestDownVote = thumbsDownVotes.length > 0 ? thumbsDownVotes[thumbsDownVotes.length - 1].blockNumber : 0
    if (latestUpVote === 0 && latestDownVote === 0) {
      return null
    } else  {
      return (latestUpVote > latestDownVote) ? '✅' : '❌'
    }
  }

  const userVote = vote(context.address)
  const attendees = Object.keys(topicData.thumbsUp).filter(address => vote(address) === '✅').length
  const absentees = Object.keys(topicData.thumbsDown).filter(address => vote(address) === '❌').length
  const isConfirmed = attendees >= 2
  const firstProposal = topicData.proposals[0]
  const isOriginalProposer = firstProposal ? firstProposal.proposer == context.address : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', border: '1px solid #e1e1e1', borderRadius: '5px', maxWidth: '400px', margin: 'auto' }}>
      <h2>{extractLabels()} | {extractTitle()}</h2>
      <h3>{extractDate()}</h3>
      <h4>{extractTime()}</h4>

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
          {isConfirmed 
              ? <p><span role="img" aria-label="check-mark">✅</span> This meeting is confirmed</p> 
              : <p><span role="img" aria-label="cross-mark">❌</span> This meeting is not yet confirmed</p>}
          {!RSVP && userVote && <p onClick={() => setRSVP(true)}>Your response: {userVote}</p>}
          {!RSVP && !userVote && <button onClick={() => setRSVP(true)}>RSVP</button>}
          {RSVP && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => { thumbsUp(topic, ""); setRSVP(false) }}>✅</button>
                  <button onClick={() => { thumbsDown(topic, ""); setRSVP(false) }}>❌</button>
                  <button onClick={() => setRSVP(false)}>x</button>
              </div>
          )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }}>
          <p>Coming: {attendees}</p>
          <p>Not coming: {absentees}</p>
      </div>
      
      {isOriginalProposer && 
          <button style={{ background: 'red', color: 'white' }} onClick={() => recall(topic, topicData.memo)}>Cancel proposed meeting</button>}
  </div>
);
}

const Thumbs = () => {
  const context = useContext(HyphenContext)
  const address = context.address
  const contract = context.getContract('thumbs.hyphen')
  const [topics, {withPendingProposed, withPendingRecalled, withPendingThumbsUp, withPendingThumbsDown}] =
    useInteractiveContractState(
      contract,
      context.blockNumber - OneMonthBlocks,
      {
        Proposed: { digestEvent: updateProposed },
        ThumbsUp: { digestEvent: updateThumbsUp },
        ThumbsDown: { digestEvent: updateThumbsDown },
        Recalled: { digestEvent: updateRecalled }
      })
  const [displayedTopics, setDisplayedTopics] = useState([])
  const [currentMeetingIndex, setCurrentMeetingIndex] = useState(-1)
  const [isDatePickerVisible, setDatePickerVisible] = useState(false)
  const [date, setDate] = useState(moment().toDate())
  const [meetingTitle, setMeetingTitle] = useState('Team Meeting')
  const [meetingTitleError, setMeetingTitleError] = useState(false)
  const [fllChecked, setFllChecked] = useState(true)
  const [ftcChecked, setFtcChecked] = useState(true)
  const [startTime, setStartTime] = useState('5:30pm')
  const [endTime, setEndTime] = useState('8:00pm')

  const computeTopic = (memoString) => {
    const packedData = ethers.utils.solidityPack(
      ['string'],
      [memoString])
    return ethers.utils.keccak256(packedData)
  }

  const propose = (memo) => {
    return withPendingProposed(address, computeTopic(memo), memo)(contract.propose(memo))
  }

  const thumbsUp = (topic, memo) => {
    return withPendingThumbsUp(address, topic, memo)(contract.thumbsUp(topic, memo))
  }

  const thumbsDown = (topic, memo) => {
    return withPendingThumbsDown(address, topic, memo)(contract.thumbsDown(topic, memo))
  }

  const recall = (topic, memo) => {
    return withPendingRecalled(address, topic, memo)(contract.recall(memo))
  }

  useEffect(() => {
    const filterAndSortTopics = (topics) => {
      return Object.entries(topics)
        //.filter(([_, topicData]) => topicData.memo.match(/\d{2}-\d{2}-\d{4}/))
        // .filter(([_, topicData]) => {
        //   const latestProposal = topicData.proposals[topicData.proposals.length - 1]
        //   const latestProposer = latestProposal ? latestProposal.proposer : null
        //   const cancellingRecalls = latestProposal ? topicData.recalls.filter(recall => {
        //     return recall.blockNumber > latestProposal.blockNumber && recall.proposer == latestProposer
        //   }) : []
        //   return latestProposal && cancellingRecalls.length === 0
        // })
        .map(([topic, topicData]) => {
          // const dateMatch = topicData.memo.match(/\d{2}-\d{2}-\d{4}/)
          // const date = new Date(dateMatch[0]);
          // const formattedDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
          return {
            topic,
            topicData: {
              ...topicData,
              title: topicData.memo,
              date: "Foo Date"
              //title: topicData.memo.replace(dateMatch[0], '').trim(),
              //date: formattedDate,
            }
          }
        })
        .filter((item) => item !== null)
        .sort((a, b) => new Date(a.topicData.date) - new Date(b.topicData.date));
    }
    const a = filterAndSortTopics(topics)
    setDisplayedTopics(a)
  }, [topics])

  useEffect(() => {
    const today = new Date();
    const index = displayedTopics.findIndex(({ topicData }) => new Date(topicData.date) >= today)
    if (index > -1) {
      setCurrentMeetingIndex(index)
    } else {
      setCurrentMeetingIndex(displayedTopics.length - 1)
    }
  }, [displayedTopics])

  const getFullMeetingMemo = () => {
    if (date) {
      const meetingLabels = []
      if(fllChecked) meetingLabels.push("FLL")
      if(ftcChecked) meetingLabels.push("FTC")
      const formattedMeetingLabels = meetingLabels.length ? `${meetingLabels.join(", ")}: ` : ""
      return `${formattedMeetingLabels}${meetingTitle} ${startTime} - ${endTime} ${moment(date).valueOf()}`
    } else {
      return null
    }
  }

  const getMeetingTitle = () => {
    const meetingLabels = []
    if(fllChecked) meetingLabels.push("FLL")
    if(ftcChecked) meetingLabels.push("FTC")
    const formattedMeetingLabels = meetingLabels.length ? `${meetingLabels.join(", ")}: ` : ""
    return `${formattedMeetingLabels}${meetingTitle}`
  }

  const getMeetingSubtitle = () => {
    if (date) {
      const dateMoment = moment(date)
      const weekday = moment.weekdays(dateMoment.weekday())
      const month = moment.months(dateMoment.month())
      return `${weekday} ${month} ${dateMoment.date()}`
    } else {
      return null
    }
  }

  const getMeetingTime = () => {
    if (startTime || endTime) {
      return `${startTime} - ${endTime}`
    } else {
      return null
    }
  }

  const handleDateConfirm = () => {
    if (meetingTitle && date) {
      setDatePickerVisible(false)
      propose(getFullMeetingMemo())
    }
  }

  const handleCancelPickDate = () => {
    setDatePickerVisible(false)
    setDate(null)
    setMeetingTitle("")
  }

  const handlePrevious = () => {
    if (currentMeetingIndex > 0) {
      setCurrentMeetingIndex((prevIndex) => prevIndex - 1);
    }
  }
  
  const handleNext = () => {
    if (currentMeetingIndex < displayedTopics.length - 1) {
      setCurrentMeetingIndex((prevIndex) => prevIndex + 1);
    }
  }

  const activeProposal = currentMeetingIndex !== -1 && displayedTopics[currentMeetingIndex] ?
    <div style={{display: 'flex', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <MeetingProposal topic={displayedTopics[currentMeetingIndex].topic}
          topicData={displayedTopics[currentMeetingIndex].topicData}
          thumbsUp={thumbsUp}
          thumbsDown={thumbsDown}
          recall={recall}
        />
      </div>
    </div> : null

  const timeIncrements = [
    '5:00pm', '5:30pm', '6:00pm', '6:30pm', '7:00pm', '7:30pm', '8:00pm', '8:30pm', '9:00pm'
  ]

  const events = displayedTopics.map(topic => ({
    title: topic.topicData.memo,
    start: new Date(topic.topicData.date),
    end: new Date(topic.topicData.date),
  }))

  const handleMeetingTitleChanged = (e) => {
    const value = e.target.value ? e.target.value : ''
    if (/^[a-zA-Z0-9\ ]*$/.test(value)) {
      setMeetingTitle(value)
      setMeetingTitleError(false)
    } else {
      setMeetingTitleError(true)
    }
  }

  const proposeMenu = <div style={{display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'center', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.5s', transform: `translateY(${isDatePickerVisible ? '0%' : '-100%'})`}}>
    <h1>{getMeetingTitle()}</h1>
    <h2>{getMeetingSubtitle()}</h2>
    <h3>{getMeetingTime()}</h3>
    <input type="text" value={meetingTitle} onChange={handleMeetingTitleChanged} onBlur={handleMeetingTitleChanged} placeholder="Meeting Title" />
    <div style={{display: 'flex', flexDirection: 'row' }}>
      <label>
        <input type="checkbox" checked={fllChecked} onChange={() => setFllChecked(!fllChecked)} /> FLL
      </label>
      <label>
        <input type="checkbox" checked={ftcChecked} onChange={() => setFtcChecked(!ftcChecked)} /> FTC
      </label>
    </div>
    <DatePicker selected={date} onChange={setDate} inline />
    <div style={{display: 'flex', flexDirection: 'row' }}>
      <select value={startTime} onChange={e => setStartTime(e.target.value)}>
        {timeIncrements.map(time => <option key={time} value={time}>{time}</option>)}
      </select>
      <select value={endTime} onChange={e => setEndTime(e.target.value)}>
        {timeIncrements.map(time => <option key={time} value={time}>{time}</option>)}
      </select>
    </div>
    {!meetingTitle && <p><span style={{color: 'red'}}>❌</span> Please provide a meeting title.</p>}
    {meetingTitleError && <p><span style={{color: 'red'}}>❌</span> Meeting title must contain only numbers or letters</p>}
    {!date && <p><span style={{color: 'red'}}>❌</span> Please select a date for the meeting.</p>}
  </div>

  const activeComponent = <div style={{display: 'flex', position: 'relative', width: '100%', flexDirection: 'column' }}>
    {isDatePickerVisible ? proposeMenu : activeProposal}
  </div>

  return (
    <div style={{display: 'flex', flexDirection: 'column', position: 'relative', width: '100%' }}>
      {isDatePickerVisible && <button onClick={() => handleCancelPickDate(false)}>Cancel</button>}
      <div style={{display: 'flex', position: 'relative', alignItems: 'center', width: '100%', flexDirection: 'row' }}>
        {!isDatePickerVisible && <button onClick={handlePrevious} disabled={currentMeetingIndex <= 0}>Previous</button>}
        {activeComponent}
        {!isDatePickerVisible && <button onClick={handleNext} disabled={currentMeetingIndex >= displayedTopics.length - 1}>Next</button>}
      </div>
      {!isDatePickerVisible && <button onClick={() => setDatePickerVisible(true)}>Propose Meeting</button>}
      {isDatePickerVisible && <button onClick={handleDateConfirm} disabled={!meetingTitle || !date}>Confirm Proposal</button>}
    </div>
  )
}

export default Thumbs
