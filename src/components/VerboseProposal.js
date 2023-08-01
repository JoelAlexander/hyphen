import React, { useContext } from 'react'
import HyphenContext from './HyphenContext'

const VerboseProposal = ({ topic, topicData, thumbsUp, thumbsDown }) => {
  const context = useContext(HyphenContext)

  const allEvents = [
    ...topicData.proposals.map(proposal => ({...proposal, type: 'proposal', address: proposal.proposer })),
    ...Object.entries(topicData.thumbsUp).flatMap(([address, thumbs]) => thumbs.map(thumb => ({ ...thumb, address, type: 'up' }))),
    ...Object.entries(topicData.thumbsDown).flatMap(([address, thumbs]) => thumbs.map(thumb => ({ ...thumb, address, type: 'down' }))),
  ]

  allEvents.sort((a, b) => {
    return a.blockNumber - b.blockNumber;
  });

  const currentBlockNumber = context.blockNumber
  return (
    <>
      <button onClick={() => thumbsUp(topic)}>Thumbs Up</button>
      <button onClick={() => thumbsDown(topic)}>Thumbs Down</button>
      <div>
        <div key={topic}>
          <h2>{topicData.memo}</h2>
          <ul>
            {allEvents.map(({ address, type, blockNumber }, i) => (
              <li key={`event-${i}`}>
                {type === 'proposal' 
                  ? `${address} proposed this ${currentBlockNumber - blockNumber} blocks ago`
                  : `${address} gave a thumbs ${type} ${currentBlockNumber - blockNumber} blocks ago`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

export default VerboseProposal
