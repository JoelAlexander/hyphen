import React from 'react';
import Address from './Address';
import Balance from './Balance';

const AccountStatus = ({ address, balance, onClick }) => {
  return (
    <div className="account-status-block" onClick={onClick}>
      <Address address={address} />
      <Balance balance={balance} />
    </div>
  );
};

export default AccountStatus;