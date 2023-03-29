import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import TransactionFeed from './TransactionFeed';
import Transaction from './Transaction';
import AccountStatus from './AccountStatus';
const ethers = require("ethers");

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
