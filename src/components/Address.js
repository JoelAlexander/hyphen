import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const Address = ({ address, style }) => {
  const context = useContext(HyphenContext);
  const [ensName, setEnsName] = useState(ensName);

  // TODO: Refresh on more specific event
  useEffect(() => {
    context.provider.lookupAddress(address).then(setEnsName);
  }, [address]);

  const shortenHex = (raw) => raw.slice(0, 5) + "..." + raw.slice(raw.length - 3);
  const shortenedAddress = address ? shortenHex(address) : '\u{200D}';
  const displayValue = ensName ? ensName : shortenedAddress;
  return (
    <div style={style}>
      <p style={{ margin: ".5em" }}>{displayValue}</p>
    </div>
  );
};

export default Address;
