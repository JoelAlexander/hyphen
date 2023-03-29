import React from 'react';
import { toEthAmountString } from '../Utils';

const Balance = ({ balance }) => {
  const balanceMessage = balance ? `${toEthAmountString(balance)}` : "\u{200D}";
  return (
    <p style={{ margin: ".5em" }}>{balanceMessage}</p>
  );
};

export default Balance;
