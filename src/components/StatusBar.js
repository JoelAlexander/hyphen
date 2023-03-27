import { CopyToClipboard } from 'react-copy-to-clipboard';
import React, { useEffect } from 'react';
import HyphenContext from './HyphenContext';
import { toEthAmountString } from '../Utils';
const ethers = require("ethers");

const Toast = () => {
  return (
    <div className="toast">Copied to clipboard!</div>
  );
};

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
    if (!this.context.signer) {
      return;
    }

    this.context.signer.getBalance().then((balance) => {
      this.setState({
        balance: balance
      });
    });

    this.context.signer.getAddress().then((address) => {
      this.context.provider.lookupAddress(address).then((ensName) => {
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
        notificationPermission: permission,
        toastVisible: false
      });
    });
  };

  render() {
    const shortenHex = (raw) => {
      return raw.slice(0, 5) + "..." + raw.slice(raw.length - 3);
    };

    var balanceMessage = "\u{200D}";
    if (this.state.balance) {
      balanceMessage += toEthAmountString(this.state.balance);
    }

    var addressMessage = "\u{200D}";
    if (this.state.ensName) {
      addressMessage += this.state.ensName;
    } else if (this.state.address) {
      addressMessage += shortenHex(this.state.address);
    }

    var blockNumberMessage = "\u{200D}";
    if (this.props.blockNumber) {
      blockNumberMessage += "Current Block: " + this.props.blockNumber;
    }

    // var enableNotificationsButton;
    // if (this.state.notificationPermission !== 'granted') {
    //   enableNotificationsButton = <button onClick={this.enableNotifications}>🔔</button>;
    // } 

    const accountStatusBlock =
      <CopyToClipboard
        text={this.state.address || ''}
        onCopy={() => {
          this.setState({toastVisible: true});
          setTimeout(() => this.setState({toastVisible: false}), 3000);
        }}
      >
        <div className="account-status-block">
        <p style={{margin: ".5em"}}>{addressMessage}</p>
        <p style={{margin: ".5em"}}>{balanceMessage}</p>
        {this.state.copied ? <span style={{color: 'green'}}>Copied.</span> : null}
    </div></CopyToClipboard>;

    const transactions = this.props.entries && this.props.entries.filter((entry) => {
      return entry.type === "transaction";
    })
    .map((transaction) => {

      let status = "\u{200D}";
      if (transaction.transactionReceipt) {
        if (transaction.transactionReceipt.status) {
          status += "Confirmed!";
        } else {
          status += "Unsucessful.";
        }
      }

      const transactionHash = shortenHex(transaction.key);
      return <div className="transaction" key={transaction.key}>
        <p style={{margin: ".5em"}}>{transactionHash}</p>
        <p style={{margin: ".5em"}}>{status}</p>
      </div>
    });

    return <div className="status-bar">
      {accountStatusBlock}
      <div className="transactions">
        {transactions}
      </div>
      {this.state.toastVisible && <Toast />}
    </div>;
  }
}

StatusBar.contextType = HyphenContext;

export default StatusBar;