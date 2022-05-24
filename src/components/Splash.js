import React from 'react';
import HyphenContext from './HyphenContext';

class Splash extends React.Component {
  render() {
    let message;
    if (this.context.signer) {
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
}

Splash.contextType = HyphenContext;

export default Splash;