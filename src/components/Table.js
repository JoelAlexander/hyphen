import React from 'react';
const ethers = require("ethers");

const accountAddress = "0x7c65D04C226d47fA70ba3f1913443684547AF18F";
const accountPrivateKey = "0xd89a25235e8ed445265fdb7d3a878abf1c7d701f628191ac62dffa8e914f6868";

class Table extends React.Component {

  constructor(props) {
    super(props);
    const wallet =
      new ethers.Wallet(
        accountPrivateKey,
        new ethers.providers.JsonRpcProvider(
          { url: 'https://crypto.joelalexander.me'},
          { name: 'home', chainId: 5904 }));
    this.state = {
      wallet: wallet
    };
  }

  componentDidMount() {
    this.update();
  }

  update = () => {
    this.state.wallet.getBalance().then((balance) => {
      this.setState({
        balance: balance
      });
    });
  };

  take = () => {
    this.props.provider.getGasPrice().then((gasPrice) => {
      this.state.wallet.getBalance().then((balance) => {
        this.props.executeTransaction(
          this.state.wallet.sendTransaction({
            to: this.props.signer.getAddress(),
            value: balance.sub(gasPrice.mul(21000)),
            gasLimit: 21000,
            gasPrice: gasPrice,
            type: 0x0
          }),
          (receipt) => this.update(),
          (error) => this.props.addMessage(JSON.stringify(error)));
      });
    });
  };

  put = (v) => {
    this.props.executeTransaction(
      this.props.signer.sendTransaction({
        to: "0x95CB9d0e4901199aAf18703a791Ca1Cd50A3beBB",
        value: v
      }),
      (receipt) => this.update(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  render() {
    let message;
    if (this.state.balance) {
      message = ethers.utils.formatEther(this.state.balance) + " ETH";
    }
    return <div style={{width: "100%"}}>
      <h1>Table balance: {message}</h1>
      <button onClick={() => this.put(ethers.BigNumber.from("10000000000000000"))}>Put 0.01 ETH on Table</button>
      <button onClick={this.take}>Take ETH from Table</button>
    </div>;
  }
}

export default Table;