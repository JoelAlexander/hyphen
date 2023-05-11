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
  logout,
  blockNumber,
}) => {
  const handleCloseModal = () => setShowModal(false);
  const handleOpenModal = (e) => {
    setShowModal(true);
    setState(prevState => ({ ...prevState, target: e.target }));
  };
  const [showModal, setShowModal] = useState(false);
  const [state, setState] = useState({
    notificationPermission: Notification.permission,
    balance: null,
    toastVisible: false
  });

  const context = useContext(HyphenContext);
  const address = context.address

  useEffect(() => {
    update();
  }, [blockNumber, context.signer]);

  const update = () => {
    if (!context.signer) {
      setState(prevState => ({ ...prevState, balance: null }));
      return;
    }

    context.signer.getBalance().then((balance) => {
      setState(prevState => ({ ...prevState, balance }));
    });
  };

  const bgColor = stringToColor(loadingStatus);
  const textColor = getContrastColor(bgColor);

  return (
    <div className="status-bar">
      <AccountStatus
        address={address}
        balance={state.balance}
        onClick={handleOpenModal} />
      {loadingStatus && 
        <div className="loading-container" style={{ 'display': 'flex', 'alignItems': 'center', 'padding': '.5em', 'backgroundColor': bgColor, borderRadius: '5px' }}>
          <div className="loading-status" style={{ 'color': textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loadingStatus}</div>
          <div className="spinner" style={{ 'borderLeftColor': textColor }}/>
        </div>}
      <Overlay show={showModal} target={state.target} placement="bottom" onHide={handleCloseModal} rootClose>
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