import React from 'react';

const Transaction = ({ transaction }) => {
  const status =
    transaction.transactionReceipt
      ? transaction.transactionReceipt.status
        ? "\u{200D}Confirmed!"
        : "\u{200D}Unsuccessful."
      : "\u{200D}";
  const transactionHash = transaction.key.slice(0, 5) + "..." + transaction.key.slice(transaction.key.length - 3);

  return (
    <div className="transaction">
      <p style={{ margin: ".5em" }}>{transactionHash}</p>
      <p style={{ margin: ".5em" }}>{status}</p>
    </div>
  );
};

export default Transaction;
