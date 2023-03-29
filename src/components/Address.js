import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Toast from './Toast';

const Address = ({ address, ensName, onCopy }) => {
  const shortenHex = (raw) => raw.slice(0, 5) + "..." + raw.slice(raw.length - 3);
  const [state, setState] = useState({ toastVisible: false });
  const shortenedAddress = address ? shortenHex(address) : '\u{200D}';
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

export default Address;
