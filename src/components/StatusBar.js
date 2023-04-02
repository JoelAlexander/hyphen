import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import TransactionFeed from './TransactionFeed';
import Transaction from './Transaction';
import AccountStatus from './AccountStatus';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import Address from './Address';
import { CopyToClipboard } from 'react-copy-to-clipboard';
const ethers = require("ethers");

const StatusBar = ({
  logout,
  blockNumber,
  entries
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
    ensName: null,
    address: null,
    toastVisible: false
  });

  const context = useContext(HyphenContext);

  useEffect(() => {
    update();
  }, [blockNumber, context.signer]);

  const update = () => {
    if (!context.signer) {
      setState(prevState => ({ ...prevState, balance: null, ensName: null, address: null }));
      return;
    }

    context.signer.getBalance().then((balance) => {
      setState(prevState => ({ ...prevState, balance }));
    });

    context.signer.getAddress().then((address) => {
      context.provider.lookupAddress(address).then((ensName) => {
        setState(prevState => ({ ...prevState, ensName }));
      });
      setState(prevState => ({ ...prevState, address }));
    });

  };

  const transactions = entries
    ? entries
        .filter((entry) => entry.type === "transaction")
        .map((transaction) => <Transaction key={transaction.key} transaction={transaction} />)
    : [];

  return (
    <div className="status-bar">
      <AccountStatus
        address={state.address}
        ensName={state.ensName}
        balance={state.balance}
        onClick={handleOpenModal} />
      <Overlay show={showModal} target={state.target} placement="bottom" onHide={handleCloseModal} rootClose>
        <Popover id="transaction-feed-popover" title="Account Details" className="custom-popover">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="address-heading">Your Account</h4>
          </div>
          <div className="d-flex align-items-center">
            <Address address={state.address} ensName={state.ensName} />
            <CopyToClipboard text={state.address} onCopy={context.showToast}>
              <span className="clipboard-icon" style={{ cursor: "pointer" }}>📋</span>
            </CopyToClipboard>
          </div>
          <h5 className="transaction-feed-heading">Transaction Feed</h5>
          <TransactionFeed transactions={transactions} />
          <button onClick={logout}>Logout</button>
        </Popover>
      </Overlay>
    </div>
  );
};

export default StatusBar;