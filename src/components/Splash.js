import React, { useContext } from 'react';
import HyphenContext from './HyphenContext';

const Splash = () => {
  const context = useContext(HyphenContext);

  let message;
  if (context.signer) {
    message = "Select an app from the menu"
  } else {
    message = "Log-in to get started"
  }

  return <div style={{width: "100%"}}>
    <h1>Welcome to Hyphen</h1>
    <h3>Your local blockchain kiosk</h3>
    <h4>{message}</h4>
  </div>;
}

export default Splash;