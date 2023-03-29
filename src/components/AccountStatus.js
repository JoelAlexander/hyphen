import React from 'react';
import Address from './Address';
import Balance from './Balance';

const AccountStatus = ({ address, ensName, balance }) => {
  return (
    <div className="account-status-block">
      <Address address={address} ensName={ensName} />
      <Balance balance={balance} />
    </div>
  );
};

export default AccountStatus;
