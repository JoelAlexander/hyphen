import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import TransactionFeed from './TransactionFeed';
import Transaction from './Transaction';
import AccountStatus from './AccountStatus';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import Address from './Address';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { stringToColor, getContrastColor} from '../Utils';
const ethers = require("ethers");

const StatusBar = ({
  loadingStatus,
  logout
}) => {
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState(false);
  const [target, setTarget] = useState(undefined);

  const context = useContext(HyphenContext);
  const address = context.address

  useEffect(() => {
    if (!context.signer) {
      setBalance(null);
      return;
    }
    context.signer.getBalance().then(setBalance);
  }, [context.blockNumber]);

  const handleCloseModal = () => setShowModal(false);
  const handleOpenModal = (e) => {
    setShowModal(true);
    setTarget(e.target);
  };

  const bgColor = stringToColor(loadingStatus);
  const textColor = getContrastColor(bgColor);

  return (
    <div className="status-bar">
      <AccountStatus
        address={address}
        balance={balance}
        onClick={handleOpenModal} />
      {loadingStatus && 
        <div className="loading-container" style={{ 'display': 'flex', 'alignItems': 'center', 'padding': '.5em', 'backgroundColor': bgColor, borderRadius: '5px' }}>
          <div className="loading-status" style={{ 'color': textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loadingStatus}</div>
          <div className="spinner" style={{ 'borderLeftColor': textColor }}/>
        </div>}
      <Overlay show={showModal} target={target} placement="bottom" onHide={handleCloseModal} rootClose>
        <Popover id="transaction-feed-popover" title="Account Details" className="custom-popover">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="address-heading">Your Account</h4>
          </div>
          <div className="d-flex align-items-center">
            <Address address={address} />
            <CopyToClipboard text={address} onCopy={context.showToast}>
              <span className="clipboard-icon" style={{ cursor: "pointer" }}>📋</span>
            </CopyToClipboard>
          </div>
          <button onClick={logout}>Logout</button>
        </Popover>
      </Overlay>
    </div>
  );
};

export default StatusBar;