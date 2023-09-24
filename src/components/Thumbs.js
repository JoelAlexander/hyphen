import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import ThumbsContract from '../../artifacts/contracts/Thumbs.sol/Thumbs.json'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import moment from 'moment'
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
      const existingThumbsForAddress = existingTopic.thumbsDown[addr]
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

const useEventDigest = (contract, startBlock, eventHandlers) => {
  const context = useContext(HyphenContext)
  const [state, setState] = useState({})

  const digestEvents = (events) => {
    setState(mergeAndSortEvents(events).reduce((result, event) => {
      return eventHandlers[event.event].digestEvent(event.blockNumber, ...event.args)(result)
    }, state))
  }

  useEffect(() => {
    Promise.all(Object.entries(eventHandlers).map(([eventName, {filterArgs}]) => {
      const startBlockToUse = startBlock ? startBlock : 0
      const filterArgsToUse = filterArgs ? filterArgs : []
      const filter = contract.filters[eventName](...filterArgsToUse)
      const queryFilter = contract.queryFilter(filter, startBlockToUse, context.blockNumber)
      return queryFilter
    })).then(digestEvents)
  }, [])

  useEffect(() => {
    const unregisterListeners = Object.entries(eventHandlers).map(([eventName, {digestEvent, filterArgs}]) => {
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
  const trueState = useEventDigest(contract, startBlock, eventHandlers)
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
              beforePromise()
              return Promise.resolve(promise)
                .finally(() => afterPromise())
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
        const pendingEventsForEventName = Object.values(pendingEvents[eventName])
        return (state) => {
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

const MeetingProposal = ({ topic, thumbsUp, thumbsDown, recall }) => {
  const context = useContext(HyphenContext)
  const [RSVP, setRSVP] = useState(false)

  const tags = topic.tags.join(', ')
  const startTime = topic.startTime
  const endTime = topic.endTime

  const timeSpan =
    startTime.isSame(endTime, 'day') ?
      `${startTime.format('h:mma')}-${endTime.format('h:mma')}` :
      `${startTime.format('h:mma')}-${endTime.format('ddd MMM D h:mma')}`

  const date = startTime.format('dddd MMMM D')

  const vote = (address) => {
    const thumbsUpVotes = topic.thumbsUp[address] || []
    const thumbsDownVotes = topic.thumbsDown[address] || []
    const latestUpVote = thumbsUpVotes.length > 0 ? thumbsUpVotes[thumbsUpVotes.length - 1].blockNumber : 0
    const latestDownVote = thumbsDownVotes.length > 0 ? thumbsDownVotes[thumbsDownVotes.length - 1].blockNumber : 0
    if (latestUpVote === 0 && latestDownVote === 0) {
      return null
    } else  {
      return (latestUpVote > latestDownVote) ? '✅' : '❌'
    }
  }

  const userVote = vote(context.address)
  const attendees = Object.keys(topic.thumbsUp).filter(address => vote(address) === '✅').length
  const absentees = Object.keys(topic.thumbsDown).filter(address => vote(address) === '❌').length
  const isConfirmed = attendees >= 2
  const firstProposal = topic.proposals[0]
  const isOriginalProposer = firstProposal ? firstProposal.proposer == context.address : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', border: '1px solid #e1e1e1', borderRadius: '5px', maxWidth: '400px', margin: 'auto' }}>
      <h2>{topic.title}</h2>
      <h3>{tags}</h3>
      <h3>{date}</h3>
      <h4>{timeSpan}</h4>

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
          {isConfirmed 
              ? <p><span role="img" aria-label="check-mark">✅</span> This meeting is confirmed</p> 
              : <p><span role="img" aria-label="cross-mark">❌</span> This meeting is not yet confirmed</p>}
          {!RSVP && userVote && <p onClick={() => setRSVP(true)}>Your response: {userVote}</p>}
          {!RSVP && !userVote && <button onClick={() => setRSVP(true)}>RSVP</button>}
          {RSVP && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => { thumbsUp(topic.topic, ""); setRSVP(false) }}>✅</button>
                  <button onClick={() => { thumbsDown(topic.topic, ""); setRSVP(false) }}>❌</button>
                  <button onClick={() => setRSVP(false)}>x</button>
              </div>
          )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }}>
          <p>Coming: {attendees}</p>
          <p>Not coming: {absentees}</p>
      </div>
      
      {isOriginalProposer && 
          <button style={{ background: 'red', color: 'white' }} onClick={() => recall(topic.memo)}>Cancel proposed meeting</button>}
  </div>
);
}

const ProposeMenu = ({submitProposal, abandonProposal}) => {
  const [date, setDate] = useState(moment())
  const [meetingTitle, setMeetingTitle] = useState('Team Meeting')
  const [meetingTitleError, setMeetingTitleError] = useState(false)
  const [fllChecked, setFllChecked] = useState(true)
  const [ftcChecked, setFtcChecked] = useState(true)
  const [startTime, setStartTime] = useState('5:30pm')
  const [endTime, setEndTime] = useState('8:30pm')

  const timeIncrements = [
    '4:30pm', '5:00pm', '5:30pm', '6:00pm', '6:30pm', '7:00pm', '7:30pm', '8:00pm', '8:30pm', '9:00pm', '9:30pm'
  ]

  const handleMeetingTitleChanged = (e) => {
    const value = e.target.value ? e.target.value : ''
    if (/^[a-zA-Z0-9\ ]*$/.test(value)) {
      setMeetingTitle(value)
      setMeetingTitleError(false)
    } else {
      setMeetingTitleError(true)
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

  const getDateWithTimeTimestamp = (timeString) => {
    let timeParts = timeString.match(/(\d+):(\d+)(am|pm)/i);
    if (timeParts) {
        let hour = parseInt(timeParts[1], 10);
        let minute = parseInt(timeParts[2], 10);
        let period = timeParts[3].toLowerCase();

        if (period === 'pm' && hour !== 12) {
            hour += 12;
        }

        if (period === 'am' && hour === 12) {
            hour = 0;
        }

        return date.hour(hour).minute(minute).second(0);
    } else {
      return date
    }
  }

  const handleSubmitProposal = () => {
    const meetingTitle = getMeetingTitle()
    const startTimeUnix = getDateWithTimeTimestamp(startTime).unix()
    const endTimeUnix = getDateWithTimeTimestamp(endTime).unix()
    submitProposal(meetingTitle, startTimeUnix, endTimeUnix)
  }

  const handleSetDate = (datePickerDate) => {
    setDate(moment(datePickerDate))
  }

  return <div style={{display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'center', justifyContent: 'center', alignItems: 'center'}}>
    {<button onClick={abandonProposal}>Abandon Proposal</button>}
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
    <DatePicker selected={date.toDate()} onChange={handleSetDate} inline />
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
    {!meetingTitleError && <button onClick={handleSubmitProposal} disabled={!meetingTitle || !date}>Confirm Proposal</button>}
  </div>
}

const Thumbs = () => {
  const context = useContext(HyphenContext)
  const address = context.address
  const contract = context.getContract('thumbs.hyphen')
  const [topics, {withPendingProposed, withPendingRecalled, withPendingThumbsUp, withPendingThumbsDown}] =
    useInteractiveContractState(
      contract,
      context.blockNumber - 10000,
      {
        Proposed: { digestEvent: updateProposed },
        ThumbsUp: { digestEvent: updateThumbsUp },
        ThumbsDown: { digestEvent: updateThumbsDown },
        Recalled: { digestEvent: updateRecalled }
      })
  const [displayedTopics, setDisplayedTopics] = useState([])
  const [currentMeetingIndex, setCurrentMeetingIndex] = useState(-1)
  const [isProposeMenuVisible, setProposeMenuVisible] = useState(false)

  const computeTopic = (memoString) => {
    const packedData = ethers.utils.solidityPack(
      ['string'],
      [memoString])
    return ethers.BigNumber.from(ethers.utils.keccak256(packedData)).toString()
  }

  const propose = (memo) => {
    const topic = computeTopic(memo)
    return withPendingProposed(address, topic, memo)(contract.propose(memo))
  }

  const thumbsUp = (topic, memo) => {
    return withPendingThumbsUp(address, topic, memo)(contract.thumbsUp(topic, memo))
  }

  const thumbsDown = (topic, memo) => {
    return withPendingThumbsDown(address, topic, memo)(contract.thumbsDown(topic, memo))
  }

  const recall = (memo) => {
    const topic = computeTopic(memo)
    return withPendingRecalled(address, topic, memo)(contract.recall(memo))
  }

  useEffect(() => {
    const filterAndSortTopics = (topics) => {
      return Object.entries(topics)
        .map(([topic, data]) => {
          const latestProposal = data.proposals[data.proposals.length - 1]
          const latestProposer = latestProposal ? latestProposal.proposer : null
          const cancellingRecalls = latestProposal ? data.recalls.filter(recall => {
            return recall.blockNumber >= latestProposal.blockNumber && recall.proposer == latestProposer
          }) : []
          if (!latestProposal || cancellingRecalls.length !== 0) {
            return null
          }

          const match = data.memo.match(/(.*):(.*)\|(\d+)\|(\d+)/)
          if (!match) {
            return null
          }

          const meetingTags = match[1].split(',').map(s => s.trim())
          const meetingTitle = match[2].trim()
          const startTime = moment.unix(match[3])
          const endTime = moment.unix(match[4])

          return {
            ...data,
            topic: topic,
            tags: meetingTags,
            title: meetingTitle,
            startTime: startTime,
            endTime: endTime
          }
        })
        .filter((item) => item !== null)
        .sort((a, b) => {
          if (a.startTime < b.startTime) return -1;
          if (a.startTime > b.startTime) return 1;
          return 0;
      });
    }
    const topicsToDisplay = filterAndSortTopics(topics)
    setDisplayedTopics(topicsToDisplay)
    if (currentMeetingIndex === -1 || currentMeetingIndex >= topicsToDisplay.length) {
      const now = moment().unix();
      const sortedTopics = topicsToDisplay.map((t, i) => [i, Math.abs(now - t.startTime)])
        .sort(([_, aDiff], [__, bDiff]) => {
          if (aDiff < bDiff) return -1;
          if (aDiff > bDiff) return 1;
          return 0;
        })
      if (sortedTopics.length > 0) {
        const closestTopic = sortedTopics[0]
        setCurrentMeetingIndex(closestTopic[0])
      } else {
        setCurrentMeetingIndex(-1)
      }
    }
  }, [topics])

  const submitProposal = (meetingTitle, startTime, endTime) => {
    setProposeMenuVisible(false)
    propose(`${meetingTitle}|${startTime}|${endTime}`)
  }

  const abandonProposal = () => {
    setProposeMenuVisible(false)
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

  const activeProposal = currentMeetingIndex !== -1 ?
    <div style={{display: 'flex', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <MeetingProposal topic={displayedTopics[currentMeetingIndex]}
          thumbsUp={thumbsUp}
          thumbsDown={thumbsDown}
          recall={recall}
        />
      </div>
    </div> : null

  const activeComponent = <div style={{display: 'flex', position: 'relative', width: '100%', flexDirection: 'column' }}>
    {isProposeMenuVisible ? <ProposeMenu submitProposal={submitProposal} abandonProposal={abandonProposal}/> : activeProposal}
  </div>

  return (
    <div style={{display: 'flex', flexDirection: 'column', position: 'relative', width: '100%' }}>
      <div style={{display: 'flex', position: 'relative', alignItems: 'center', width: '100%', flexDirection: 'row' }}>
        {!isProposeMenuVisible && <button onClick={handlePrevious} disabled={currentMeetingIndex <= 0}>Previous</button>}
        {activeComponent}
        {!isProposeMenuVisible && <button onClick={handleNext} disabled={currentMeetingIndex >= displayedTopics.length - 1}>Next</button>}
      </div>
      {!isProposeMenuVisible && <button onClick={() => setProposeMenuVisible(true)}>Propose Meeting</button>}
    </div>
  )
}

export default Thumbs
