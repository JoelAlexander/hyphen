import React, { useEffect } from 'react';
const ethers = require("ethers");

class StatusBar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      notificationPermission: Notification.permission
    };
  }

  componentDidMount() {
    this.update();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.blockNumber != this.props.blockNumber) {
      this.update();
    }
  }

  update = () => {
    this.props.signer.getBalance().then((balance) => {
      this.setState({
        balance: balance
      });
    });

    this.props.signer.getAddress().then((address) => {
      this.props.provider.lookupAddress(address).then((ensName) => {
        this.setState({
          ensName: ensName
        })
      });
      this.setState({
        address: address
      });
    });
  };

  enableNotifications = () => {
    Notification.requestPermission().then((permission) => {
      this.setState({
        notificationPermission: permission
      });
    });
  };

  render() {
    var balanceMessage;
    if (this.state.balance) {
      balanceMessage = Number(ethers.utils.formatEther(this.state.balance)).toFixed(3) + " ETH";
    }

    var addressMessage;
    if (this.state.ensName) {
      addressMessage = this.state.ensName;
    } else if (this.state.address) {
      addressMessage = this.state.address.slice(0, 5) + "..." + this.state.address.slice(this.state.address.length - 3);
    }

    var blockNumberMessage = "Current Block: " + this.props.blockNumber;

    // var enableNotificationsButton;
    // if (this.state.notificationPermission !== 'granted') {
    //   enableNotificationsButton = <button onClick={this.enableNotifications}>🔔</button>;
    // } 

    return <div style={{
      padding: "1em",
      textAlign: "right",
      position: "sticky",
      top: "0em",
      background: "white"
    }}>
      <p>{addressMessage}</p>
      <p>{balanceMessage}</p>
    </div>;
  }
}

export default StatusBar;