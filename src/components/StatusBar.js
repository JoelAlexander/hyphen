import { CopyToClipboard } from 'react-copy-to-clipboard';
import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { toEthAmountString } from '../Utils';
import TransactionFeed from './TransactionFeed';
import Transaction from './Transaction';
const ethers = require("ethers");

const Address = ({ address, ensName, onCopy }) => {
  const [state, setState] = useState({ toastVisible: false });
  const shortenedAddress = address ? shortenHex(address) : '';
  const displayValue = ensName ? ensName : shortenedAddress;
  const handleCopy = () => {
    setState(prevState => ({ ...prevState, toastVisible: true }));
    setTimeout(() => setState(prevState => ({ ...prevState, toastVisible: false })), 3000);
  };
  return (
    <div style={{ cursor: "pointer" }} >
      <CopyToClipboard text={address} onCopy={handleCopy}>
        <p style={{ margin: ".5em" }}>{displayValue}</p>
      </CopyToClipboard>
      {state.toastVisible && <Toast />}
    </div>
  );
};

const Balance = ({ balance }) => {
  const balanceMessage = balance ? `\u{200D}${toEthAmountString(balance)}` : "\u{200D}";
  return (
    <p style={{ margin: ".5em" }}>{balanceMessage}</p>
  );
};

const AccountStatus = ({ address, ensName, balance }) => {
  return (
    <div className="account-status-block">
      <Address address={address} ensName={ensName} />
      <Balance balance={balance} />
    </div>
  );
};

const Toast = () => (
  <div className="toast">Copied to clipboard!</div>
);

const shortenHex = (raw) => raw.slice(0, 5) + "..." + raw.slice(raw.length - 3);

const StatusBar = ({ blockNumber, entries }) => {
  const [state, setState] = useState({
    notificationPermission: Notification.permission,
    balance: null,
    ensName: null,
    address: null
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

  const enableNotifications = () => {
    Notification.requestPermission().then((permission) => {
      setState(prevState => ({
        ...prevState,
        notificationPermission: permission,
        toastVisible: false
      }));
    });
  };

  const balanceMessage = state.balance ? `\u{200D}${toEthAmountString(state.balance)}` : "\u{200D}";
  const addressMessage = state.ensName ? `\u{200D}${state.ensName}` : state.address ? `\u{200D}${shortenHex(state.address)}` : "\u{200D}";
  const blockNumberMessage = blockNumber ? `\u{200D}Current Block: ${blockNumber}` : "\u{200D}";

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
        balance={state.balance} />
      <TransactionFeed transactions={transactions} />
    </div>
  );
};

export default StatusBar;
