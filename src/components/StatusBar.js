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

    var enableNotificationsButton;
    if (this.state.notificationPermission !== 'granted') {
      enableNotificationsButton = <button onClick={this.enableNotifications}>🔔</button>;
    } 

    return <div className="pure-g" style={{width: "100%"}}>
      <p className="pure-u-1-6">{addressMessage}</p>
      <p className="pure-u-1-6">{balanceMessage}</p>
      <p className="pure-u-1-4"></p>
      <p className="pure-u-1-12"></p>
      <p className="pure-u-1-6">{blockNumberMessage}</p>
      <p className="pure-u-1-6">{enableNotificationsButton}</p>
    </div>;
  }
}

export default StatusBar;