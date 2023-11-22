import React, { useState, useContext } from 'react';
import HyphenContext from '../context/HyphenContext';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import Address from './Address';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './StatusBar.css';
const ethers = require("ethers");

const BouncingDots = () => {
  return <div className="bouncing-dots">
    <div className="dot"/>
    <div className="dot"/>
    <div className="dot"/>
    <div className="dot"/>
    <div className="dot"/>
  </div>
}

const StatusBar = ({ syncing }) => {
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
    <div className="status-bar" onClick={handleOpenModal}>
      <Address address={address} />
      <Overlay show={showModal} target={target} placement="bottom" onHide={handleCloseModal} rootClose>
        <Popover title="Account Details">
        </Popover>
      </Overlay>
    </div>
  );
};

export default StatusBar;
