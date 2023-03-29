import React from 'react';

const TransactionFeed = ({ transactions }) => {
  return (
    <div className="transactions">
      {transactions}
    </div>
  );
};

export default TransactionFeed;
