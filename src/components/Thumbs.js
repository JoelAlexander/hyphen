import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import './ItemShare.css'

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

const useThumbs = (contractAddress) => {
  const context = useContext(HyphenContext)
  const contract = context.getContract(contractAddress)
  const [topics, setTopics] = useState({})

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

  const digestEvents = (events) => {
    setTopics(mergeAndSortEvents(events).reduce((result, event) => {
      if (event.event === "Proposed") {
        return updateProposed(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      } else if (event.event === "ThumbsUp") {
        return updateThumbsUp(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      } else if (event.event === "ThumbsDown") {
        return updateThumbsDown(event.args.addr, event.args.topic, event.args.memo, event.blockNumber)(result);
      }
      return result;
    }, topics))
  }

  const loadTopic = (topic) => {
    if (topics[topic]) return

    const blockNumber = context.blockNumber
    const proposedFilter = contract.filters.Proposed(null, topic)
    const proposedEvents = contract.queryFilter(proposedFilter, 0, blockNumber)
  
    const upFilter = contract.filters.ThumbsUp(null, topic)
    const upEvents = contract.queryFilter(upFilter, 0, blockNumber)
  
    const downFilter = contract.filters.ThumbsDown(null, topic)
    const downEvents = contract.queryFilter(downFilter, 0, blockNumber)

    Promise.all([proposedEvents, upEvents, downEvents])
      .then(digestEvents)
  }

  const loadBlockRange = (startBlock, endBlock) => {
    const proposedFilter = contract.filters.Proposed()
    const proposedEvents = contract.queryFilter(proposedFilter, startBlock, endBlock)
  
    const upFilter = contract.filters.ThumbsUp()
    const upEvents = contract.queryFilter(upFilter, startBlock, endBlock)
  
    const downFilter = contract.filters.ThumbsDown()
    const downEvents = contract.queryFilter(downFilter, startBlock, endBlock)

    Promise.all([proposedEvents, upEvents, downEvents])
      .then(digestEvents)
  }

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
  
    contract.on("Proposed", proposedListener)
    contract.on("ThumbsUp", thumbsUpListener)
    contract.on("ThumbsDown", thumbsDownListener)
  
    return () => {
      contract.off("Proposed", proposedListener)
      contract.off("ThumbsUp", thumbsUpListener)
      contract.off("ThumbsDown", thumbsDownListener)
    }
  }, [context.blockNumber])

  const handlePropose = (memo) => {
    contract.propose(memo)
  }

  const handleThumbsUp = (topic) => {
    contract.thumbsUp(topic, "")
  }
  
  const handleThumbsDown = (topic) => {
    contract.thumbsDown(topic, "")
  }

  return {
    topics: topics,
    loadTopic: loadTopic,
    loadBlockRange: loadBlockRange,
    propose: handlePropose,
    thumbsUp: handleThumbsUp,
    thumbsDown: handleThumbsDown
  }
}

const MeetingProposal = ({ topic, topicData, thumbsUp, thumbsDown }) => {
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

  return (
    <div>
      <h2>{topicData.memo}</h2>
      {userVote && <p>Your response: {userVote}</p>}
      <button onClick={() => setRSVP(true)}>RSVP</button>
      {RSVP && (
        <>
          <button onClick={() => {thumbsUp(topic); setRSVP(false)}}>✅</button>
          <button onClick={() => {thumbsDown(topic); setRSVP(false)}}>❌</button>
          <button onClick={() => setRSVP(false)}>x</button>
        </>
      )}
      <p>Coming: {attendees}</p>
      <p>Not coming: {absentees}</p>
      {isConfirmed 
        ? <p><span role="img" aria-label="check-mark">✅</span> This meeting is confirmed</p> 
        : <p><span role="img" aria-label="cross-mark">❌</span> This meeting is not yet confirmed</p>}
    </div>
  )
}

const Thumbs = () => {
  const OneDayBlocks = 14400
  const OneMonthBlocks = OneDayBlocks * 30
  const context = useContext(HyphenContext)
  const { topics, loadBlockRange, propose, thumbsUp, thumbsDown } = useThumbs('thumbs.hyphen')
  const [date, setDate] = useState(null)
  const [isDatePickerVisible, setDatePickerVisible] = useState(false)

  useEffect(() => {
    const startBlock = Math.max(0, context.blockNumber - OneMonthBlocks)
    loadBlockRange(startBlock, context.blockNumber);
  }, []);

  const displayedTopics = Object.keys(topics)
    .filter(topic => topics[topic].memo.startsWith("Terabytes Meeting -"))
    .map(topic => [topic, topics[topic]])

  const handleDateConfirm = () => {
    setDatePickerVisible(false);
    propose(`Terabytes Meeting - ${date.toISOString().slice(0, 10)}`);
  };

  return (
    <div style={{height: '100%', width: '100%'}}>
      <div style={{overflowY: 'scroll'}}>
        {displayedTopics.map(([_topic, _topicData], index) => (
          <MeetingProposal key={index} topic={_topic} topicData={_topicData} thumbsUp={thumbsUp} thumbsDown={thumbsDown} />
        ))}
      </div>

      {isDatePickerVisible ? (
        <div>
          <DatePicker
            selected={date}
            onChange={(date) => setDate(date)}
            placeholderText="Select a date for the meeting"
            dateFormat="yyyy-MM-dd"
          />
          <button onClick={handleDateConfirm}>Confirm Proposal</button>
        </div>
      ) : (
        <button style={{height: '50px', width: '100%'}} onClick={() => setDatePickerVisible(true)}>
          Propose
        </button>
      )}
    </div>
  )
}

export default Thumbs
