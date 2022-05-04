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
    if (
      prevProps.blockNumber != this.props.blockNumber ||
      (prevProps.provider && !this.props.provider)
    ) {
      this.update();
    }
  }

  update = () => {
    if (!this.props.signer || !this.props.provider) {
      this.setState({
        address: null,
        balance: null,
        ensName: null
      });
      return;
    }

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
    const shortenHex = (raw) => {
      return raw.slice(0, 5) + "..." + raw.slice(raw.length - 3);
    };

    var balanceMessage = "\u{200D}";
    if (this.state.balance) {
      balanceMessage += Number(ethers.utils.formatEther(this.state.balance)).toFixed(3) + " ETH";
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

    const accountStatusBlock = <div style={{
      display: "inline-flex",
      height: "100%",
      flexFlow: "column",
      justifyContent: "center",
      whiteSpace: "nowrap",
      marginRight: "2em",
      paddingTop: "1em",
      paddingBottom: "1em"
    }}>
      <p style={{margin: ".5em"}}>{addressMessage}</p>
      <p style={{margin: ".5em"}}>{balanceMessage}</p>
    </div>;

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
      return <div key={transaction.key} style={{
        display: "inline-flex",
        height: "100%",
        flexFlow: "column",
        justifyContent: "center",
        paddingTop: "1em",
        paddingBottom: "1em"
      }}>
        <p style={{margin: ".5em"}}>{transactionHash}</p>
        <p style={{margin: ".5em"}}>{status}</p>
      </div>
    });

    return <div style={{
      display: "flex",
      flexDirection: "row-reverse",
      textAlign: "right",
      position: "sticky",
      top: "0em",
      background: "white",
      borderBottom: "1px dotted"
    }}>
      {accountStatusBlock}
      <div style={{
        height: "100%",
        display: "inline-flex",
        overflowX: "scroll",
        flexDirection: "row-reverse",
        marginLeft: "6em"
      }}>
        {transactions}
      </div>
    </div>;
  }
}

export default StatusBar;