import React from 'react';

const sessionFeedTypeMap = {
  "message": (props) => <MessageEntry
    key={props.key}
    message={props.message} />,
  "transaction": (props) => <TransactionEntry
    key={props.key}
    transactionResponse={props.transactionResponse}
    transactionReceipt={props.transactionReceipt} />,
};

class MessageEntry extends React.Component {
  render() { return <p>{this.props.message}</p>; }
}

class TransactionEntry extends React.Component {
  render() {
    let status;
    if (this.props.transactionReceipt) {
      if (this.props.transactionReceipt.status) {
        status = <p>Confirmed!</p>;
      } else {
        status = <p>Unsucessful.</p>;
      }
    }
    return <div>
      <p>{this.props.transactionResponse.hash}</p>
      {status}
    </div>;
  }
}

class SessionFeed extends React.Component {

  render() {
    const entries = this.props.entries.map((entry, index) => {
      const type = entry.type;
      return sessionFeedTypeMap[type](entry);
    });
    let clearButton;
    if (this.props.entries.length > 0) {
      clearButton = <button onClick={this.props.clearFeed}>Clear feed</button>
    }
    return <div className="sidebar-restricted-width" style={{wordWrap: "anywhere"}}>
      {clearButton}
      {entries}
    </div>;
  }
}

export default SessionFeed;