import React from 'react';
import Address from './Address';
import Balance from './Balance';

const AccountStatus = ({ address, ensName, balance, onClick }) => {
  return (
    <div className="account-status-block" onClick={onClick}>
      <Address address={address} ensName={ensName} />
      <Balance balance={balance} />
    </div>
  );
};

export default AccountStatus;