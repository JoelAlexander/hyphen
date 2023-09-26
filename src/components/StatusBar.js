import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from '../context/HyphenContext';
import AccountStatus from './AccountStatus';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import Address from './Address';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './StatusBar.css';
const ethers = require("ethers");

const StatusBar = ({ syncing, logout }) => {
  const [showModal, setShowModal] = useState(false);
  const [target, setTarget] = useState(undefined);

  const context = useContext(HyphenContext);
  const address = context.address

  const handleCloseModal = () => setShowModal(false);
  const handleOpenModal = (e) => {
    setShowModal(true);
    setTarget(e.target);
  };

  return (
    <div className="status-bar">
      <AccountStatus
        address={address}
        balance={context.balance}
        onClick={handleOpenModal} />
      {syncing && <div className="bouncing-dots">
        <div className="dot"/>
        <div className="dot"/>
        <div className="dot"/>
        <div className="dot"/>
        <div className="dot"/>
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
