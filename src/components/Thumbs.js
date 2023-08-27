import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import ThumbsContract from '../../artifacts/contracts/Thumbs.sol/Thumbs.json'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import './ItemShare.css'
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

const updateProposed = (addr, topic, memo, blockNumber) => {
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

const updateRecalled = (addr, topic, memo, blockNumber) => {
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

const updateThumbsUp = (addr, topic, memo, _blockNumber) => {
  const topicString = topic.toString()
  const blockNumber = _blockNumber
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

const updateThumbsDown = (addr, topic, memo, _blockNumber) => {
  const blockNumber = _blockNumber
  const topicString = topic.toString()
  return (topics) => {
    const newThumbsDown = { memo: memo, blockNumber: blockNumber }
    const existingTopic = topics[topicString]
    if (existingTopic) {
      const existingThumbsForAddress = existingTopic.thumbsUp[addr]
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

const useThumbsState = (contractAddress, startBlock, endBlock) => {
  const context = useContext(HyphenContext)
  const contract = context.getContract(contractAddress, ThumbsContract.abi)
  const [topics, setTopics] = useState({})

  const digestEvents = (events) => {
    setTopics(mergeAndSortEvents(events).reduce((result, event) => {
      if (event.event === "Proposed") {
        return updateProposed(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      } else if (event.event === "ThumbsUp") {
        return updateThumbsUp(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      } else if (event.event === "ThumbsDown") {
        return updateThumbsDown(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      } else if (event.event === "Recalled") {
        return updateRecalled(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      }
      return result;
    }, topics))
  }

  useEffect(() => {
    const proposedFilter = contract.filters.Proposed()
    const proposedEvents = contract.queryFilter(proposedFilter, startBlock, endBlock)
  
    const upFilter = contract.filters.ThumbsUp()
    const upEvents = contract.queryFilter(upFilter, startBlock, endBlock)
  
    const downFilter = contract.filters.ThumbsDown()
    const downEvents = contract.queryFilter(downFilter, startBlock, endBlock)

    const recallFilter = contract.filters.Recalled()
    const recallEvents = contract.queryFilter(recallFilter, startBlock, endBlock)

    Promise.all([proposedEvents, upEvents, downEvents, recallEvents]).then(digestEvents)
  }, [])

  useEffect(() => {
    const proposedListener = (addr, topic, memo) => {
      setTopics(updateProposed(addr, topic, memo, context.blockNumber))
    }
  
    const thumbsUpListener = (addr, topic, memo) => {
      setTopics(updateThumbsUp(addr, topic, memo, context.blockNumber))
    }
  
    const thumbsDownListener = (addr, topic, memo) => {
      setTopics(updateThumbsDown(addr, topic, memo, context.blockNumber))
    }

    const recallListener = (addr, topic, memo) => {
      setTopics(updateRecalled(addr, topic, memo, context.blockNumber))
    }
  
    contract.on("Proposed", proposedListener)
    contract.on("ThumbsUp", thumbsUpListener)
    contract.on("ThumbsDown", thumbsDownListener)
    contract.on("Recalled", recallListener)
  
    return () => {
      contract.off("Proposed", proposedListener)
      contract.off("ThumbsUp", thumbsUpListener)
      contract.off("ThumbsDown", thumbsDownListener)
      contract.off("Recalled", recallListener)
    }
  }, [context.blockNumber])

  return topics
}

const useThumbs = (contractAddress) => {
  const context = useContext(HyphenContext)
  const address = context.address
  const topics = useThumbsState(contractAddress, context.blockNumber - OneMonthBlocks, context.blockNumber)
  const [pendingProposals, setPendingProposals] = useState({})
  const [pendingThumbsUp, setPendingThumbsUp] = useState({})
  const [pendingThumbsDown, setPendingThumbsDown] = useState({})
  const [pendingRecalls, setPendingRecalls] = useState({})
  const [mergedTopics, setMergedTopics] = useState({})

  const mergeProposals = (topics) => {
    return Object.values(pendingProposals)
      .reduce((result, pendingProposal) => {
        return updateProposed(address, pendingProposal.topic, pendingProposal.memo, pendingProposal.blockNumber)(result)
      }, topics)
  }

  const mergeRecalls = (topics) => {
    return Object.values(pendingRecalls)
      .reduce((result, pendingRecall) => {
        return updateRecalled(address, pendingRecall.topic, pendingRecall.memo, pendingRecall.blockNumber)(result)
      }, topics)
  }

  const mergeThumbsUp = (topics) => {
    return Object.values(pendingThumbsUp)
      .reduce((result, pendingThumb) => {
        return updateThumbsUp(address, pendingThumb.topic, pendingThumb.memo, pendingThumb.blockNumber)(result)
      }, topics)
  }

  const mergeThumbsDown = (topics) => {
    return Object.values(pendingThumbsDown)
      .reduce((result, pendingThumb) => {
        return updateThumbsDown(address, pendingThumb.topic, pendingThumb.memo, pendingThumb.blockNumber)(result)
      }, topics)
  }

  const mergePending = [
    mergeProposals,
    mergeThumbsUp,
    mergeThumbsDown,
    mergeRecalls
  ]
  
  useEffect(() => {
    setMergedTopics(mergePending.reduce((result, mergeFunction) => {
      return mergeFunction(result)
    }, topics))
  }, [topics, pendingProposals, pendingThumbsUp, pendingThumbsDown, pendingRecalls])

  const withPendingProposal = (memo, promise) => {
    const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
    const topic = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.solidityPack(['string'], [memo]))).toString()
    const proposal = { topic: topic, memo: memo, blockNumber: context.blockNumber }
    setPendingProposals(prev => {
      return { ...prev, [actionId]: proposal }
    })
    return promise.finally(() => {
      setPendingProposals(prev => {
        const { [actionId]: _, ...remaining } = prev
        return remaining
      })
    })
  }

  const withPendingRecall = (memo, promise) => {
    const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
    const topic = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.solidityPack(['string'], [memo]))).toString()
    const recall = { topic: topic, memo: memo, blockNumber: context.blockNumber }
    setPendingRecalls(prev => {
      return { ...prev, [actionId]: recall }
    })
    return promise.finally(() => {
      setPendingRecalls(prev => {
        const { [actionId]: _, ...remaining } = prev
        return remaining
      })
    })
  }

  const withPendingThumbsUp = (topic, memo, promise) => {
    const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
    const thumbUp = { topic: topic, memo: memo, blockNumber: context.blockNumber }
    setPendingThumbsUp(prev => {
        return { ...prev, [actionId]: thumbUp}
      })
    return promise.finally(() => {
      setPendingThumbsUp(prev => {
        const { [topic]: _, ...remaining } = prev
        return remaining
      })
    })
  }

  const withPendingThumbsDown = (topic, memo, promise) => {
    const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
    const thumbDown = { topic: topic, memo: memo, blockNumber: context.blockNumber }
    setPendingThumbsDown(prev => {
      return { ...prev, [actionId]: thumbDown}
    })
    return promise.finally(() => {
      setPendingThumbsDown(prev => {
        const { [topic]: _, ...remaining } = prev
        return remaining
      })
    })
  }

  return [
    mergedTopics,
    withPendingProposal,
    withPendingThumbsUp,
    withPendingThumbsDown,
    withPendingRecall
  ]
}

const MeetingProposal = ({ topic, topicData, thumbsUp, thumbsDown, recall }) => {
  const context = useContext(HyphenContext)
  const [RSVP, setRSVP] = useState(false)

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

  return (<div style={{ display: 'flex', flexDirection:'column', justifyContent: 'center', alignItems: 'center' }}>
    <h2>{topicData.title}</h2>
    <h3>{topicData.date}</h3>
    {isConfirmed 
      ? <p><span role="img" aria-label="check-mark">✅</span> This meeting is confirmed</p> 
      : <p><span role="img" aria-label="cross-mark">❌</span> This meeting is not yet confirmed</p>}
    {!RSVP && userVote && <p onClick={() => setRSVP(true)}>Your response: {userVote}</p>}
    {!RSVP && !userVote && <button onClick={() => setRSVP(true)}>RSVP</button>}
    {RSVP && (
      <div style={{ display: 'flex', flexDirection:'row' }}>
        <button onClick={() => {thumbsUp(topic, ""); setRSVP(false)}}>✅</button>
        <button onClick={() => {thumbsDown(topic, ""); setRSVP(false)}}>❌</button>
        <button onClick={() => setRSVP(false)}>x</button>
      </div>
    )}
    <p>Coming: {attendees}</p>
    <p>Not coming: {absentees}</p>
    {isOriginalProposer && <button onClick={() => recall(topicData.memo)}>Cancel proposed meeting</button>}
  </div>)
}

const Thumbs = () => {
  const context = useContext(HyphenContext)
  const contract = context.getContract('thumbs.hyphen')
  const thumbsAddress = context.getResolvedAddress('thumbs.hyphen')
  const [ topics, withPendingProposal, withPendingThumbsUp, withPendingThumbsDown, withPendingRecall] = useThumbs(thumbsAddress)
  const [displayedTopics, setDisplayedTopics] = useState([])
  const [currentMeetingIndex, setCurrentMeetingIndex] = useState(-1)
  const [date, setDate] = useState(null)
  const [isDatePickerVisible, setDatePickerVisible] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [fllChecked, setFllChecked] = useState(false)
  const [ftcChecked, setFtcChecked] = useState(false)
  const [startTime, setStartTime] = useState('5:30pm')
  const [endTime, setEndTime] = useState('8:00pm')

  const propose = (memo) => {
    return withPendingProposal(memo, contract.propose(memo))
  }

  const thumbsUp = (topic, memo) => {
    return withPendingThumbsUp(topic, memo, contract.thumbsUp(topic, memo))
  }

  const thumbsDown = (topic, memo) => {
    return withPendingThumbsDown(topic, memo, contract.thumbsDown(topic, memo))
  }

  const recall = (memo) => {
    return withPendingRecall(memo, contract.recall(memo))
  }

  useEffect(() => {
    const filterAndSortTopics = (topics) => {
      return Object.entries(topics)
        .filter(([_, topicData]) => topicData.memo.match(/\d{2}-\d{2}-\d{4}/))
        .filter(([_, topicData]) => {
          const latestProposal = topicData.proposals[topicData.proposals.length - 1]
          const latestProposer = latestProposal ? latestProposal.proposer : null
          const cancellingRecalls = latestProposal ? topicData.recalls.filter(recall => {
            return recall.blockNumber > latestProposal.blockNumber && recall.proposer == latestProposer
          }) : []
          return latestProposal && cancellingRecalls.length === 0
        })
        .map(([topic, topicData]) => {
          const dateMatch = topicData.memo.match(/\d{2}-\d{2}-\d{4}/)
          const date = new Date(dateMatch[0]);
          const formattedDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
          return {
            topic,
            topicData: {
              ...topicData,
              title: topicData.memo.replace(dateMatch[0], '').trim(),
              date: formattedDate,
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
    if (currentMeetingIndex == -1 && displayedTopics.length > 0) {
      const today = new Date();
      const index = displayedTopics.findIndex(
        ({ topicData }) =>
          new Date(topicData.date) >= today
      )
      if (index > -1) {
        setCurrentMeetingIndex(index)
      } else {
        setCurrentMeetingIndex(displayedTopics.length - 1)
      }
    }
  }, [displayedTopics])

  const getFullMeetingMemo = () => {
    if (date) {
      const meetingLabels = []
      if(fllChecked) meetingLabels.push("FLL")
      if(ftcChecked) meetingLabels.push("FTC")
      const formattedMeetingLabels = meetingLabels.length ? `${meetingLabels.join(", ")}: ` : ""
      return `${formattedMeetingLabels}${meetingTitle} ${startTime} - ${endTime} ${moment(date).format("MM-DD-YYYY")}`
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
    if (date) {
      return `${startTime} - ${endTime}`
    } else {
      return null
    }
  }

  const handleDateConfirm = () => {
    setDatePickerVisible(false)
    if (date) {
      propose(getFullMeetingMemo())
    }
};

  const handleCancelPickDate = () => {
    setDatePickerVisible(false)
    setDate(null)
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

  const visibleProposals = currentMeetingIndex > -1 ?
    [currentMeetingIndex - 1, currentMeetingIndex, currentMeetingIndex + 1]
        .filter(i => i >= 0 && i < displayedTopics.length)
        .map(i => {
          return <div key={`meeting-proposal-${i}`} style={{width: '100%', position: 'absolute', transition: 'transform 0.5s', transform: `translateX(${(i - currentMeetingIndex)*100}%)`}}>
            <MeetingProposal
              topic={displayedTopics[i].topic}
              topicData={displayedTopics[i].topicData}
              thumbsUp={thumbsUp}
              thumbsDown={thumbsDown}
              recall={recall}
            />
            
          </div>
        })
    : null

  const timeIncrements = [
    '5:00pm', '5:30pm', '6:00pm', '6:30pm', '7:00pm', '7:30pm', '8:00pm', '8:30pm', '9:00pm'
  ]

  const events = displayedTopics.map(topic => ({
    title: topic.topicData.memo,
    start: new Date(topic.topicData.date),
    end: new Date(topic.topicData.date),
  }))

  return (
    <div style={{display: 'flex', position: 'relative', height: '100%', width: '100%', flexDirection: 'column' }}>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'center', position: 'absolute', top: '8em', zIndex: '1'}}>
        {isDatePickerVisible && <button onClick={() => setDatePickerVisible(false)}>Cancel</button>}
      </div>
      <div style={{display: 'flex', position: 'relative', alignItems: 'center', height: '100%', width: '100%', flexDirection: 'row' }}>
        <button onClick={handlePrevious} disabled={currentMeetingIndex <= 0}>Previous</button>
        <div style={{display: 'flex', position: 'relative', height: '100%', width: '100%', flexDirection: 'column' }}>
          <div style={{display: 'flex', flexDirection: 'column', position: 'absolute', height: '100%', width: '100%', justifyContent: 'center', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.5s', transform: `translateY(${isDatePickerVisible ? '0%' : '-100%'})`}}>
            <h1>{getMeetingTitle()}</h1>
            <h2>{getMeetingSubtitle()}</h2>
            <h3>{getMeetingTime()}</h3>
            <input type="text" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="Meeting Title" />
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
          </div>
          <div style={{display: 'flex', position: 'absolute', height: '100%', width: '100%', transition: 'transform 0.5s', transform: `translateY(${isDatePickerVisible ? '100%' : '0%'})` }}>
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', justifyContent: 'center', height: '100%', width: '100%', overflow: 'hidden' }}>
                {visibleProposals}
            </div>
          </div>
        </div>
        <button onClick={handleNext} disabled={currentMeetingIndex >= displayedTopics.length - 1}>Next</button>
      </div>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'center', position: 'absolute', bottom: '8em', zIndex: '1'}}>
        {!isDatePickerVisible && <button onClick={() => setDatePickerVisible(true)}>Propose Meeting</button>}
        {isDatePickerVisible && <button onClick={handleDateConfirm}>Confirm Proposal</button>}
      </div>
    </div>
  )
}

export default Thumbs
