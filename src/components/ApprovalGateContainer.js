import React, { useContext, useState } from 'react';
import HyphenContext from '../context/HyphenContext'
import Button from 'react-bootstrap/Button';
import useIsApprovedForAll from '../hooks/useIsApprovedForAll';

const ApprovalGateContainer = ({ addressOrName, children }) => {
  const context = useContext(HyphenContext)
  const address = context.getResolvedAddress(addressOrName)
  const displayName = context.getDisplayName(address)
  const [isApproved, handleApprove, handleDisapprove] = useIsApprovedForAll(address);
  const [showInfo, setShowInfo] = useState(false);

  const connectMessage = `Connect to ${displayName}?`
  const disconnectMessage = `Disconnect from ${displayName}?`
  const connectedMessage = `🔗${displayName}`

  return (
      <div style={{display: 'flex', flexDirection: 'column', width: '100%', margin: '1em'}}>
        <div style={{display: 'flex', flexDirection: 'row-reverse'}}>
          {isApproved && <Button variant="light" onClick={() => setShowInfo(!showInfo)} style={{ marginLeft: '10px' }}>{connectedMessage}</Button>}
          {showInfo && isApproved && (
              <Button variant="danger" onClick={() => {
                  handleDisapprove();
                  setShowInfo(false);
              }}>
                {disconnectMessage}
              </Button>
          )}
        </div>
        {isApproved && <div>{children}</div>}
        {!isApproved && <div>
            <span>{connectMessage}</span>
            <div style={{ color: 'grey' }}>Explanation about the connection and permissions.</div>
            <Button variant="primary" onClick={handleApprove}>Connect</Button>
          </div>}
      </div>
  );
}

export default ApprovalGateContainer;