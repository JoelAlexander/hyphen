import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const Address = ({ address, ensName }) => {
  const shortenHex = (raw) => raw.slice(0, 5) + "..." + raw.slice(raw.length - 3);
  const shortenedAddress = address ? shortenHex(address) : '\u{200D}';
  const displayValue = ensName ? ensName : shortenedAddress;
  return (
    <div>
      <p style={{ margin: ".5em" }}>{displayValue}</p>
    </div>
  );
};

export default Address;
