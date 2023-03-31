import React from 'react';

const TransactionFeed = ({ transactions }) => {
  const isEmpty = transactions.length === 0;

  return (
    <div className="transaction-feed-container">
      <div className="transactions">
        {isEmpty ? (
          <p className="empty-message">No transactions to show</p>
        ) : (
          transactions
        )}
      </div>
    </div>
  );
};

export default TransactionFeed;