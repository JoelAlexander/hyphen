import React from 'react';
import FaucetContract from './../contracts/Faucet.sol/Faucet.json';
import { toEthAmountString } from '../Utils';
const ethers = require("ethers");

const faucetAddress = "0x0Ff4f87B22b795a672fC12884a09087EBdE021cB";

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
      wallet: wallet,
      faucet: this.props.accessDeployedContract(faucetAddress, FaucetContract.abi),
      faucetBalance: null,
      faucetBlock: null
    };
  }

  componentDidMount() {
    this.update();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.address !== this.props.address) {
        this.update();
    }
  }

  update = () => {
    this.state.wallet.getBalance().then((balance) => {
      this.setState({
        conciergeBalance: balance
      });
    });

    this.state.faucet.balance().then((result) => {
      this.setState({
        faucetBalance: result
      });
    });

    if (this.props.address) {
      this.state.faucet.canUseAtBlock(this.props.address).then((result) => {
        this.setState({
          faucetBlock: result
        });
      });
    }
  };

  claimDisbursement = () => {
    this.props.executeTransaction(
      this.state.faucet.claim(),
      (receipt) => this.update(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  take = () => {
    this.props.provider.getGasPrice().then((gasPrice) => {
      this.state.wallet.getBalance().then((balance) => {
        this.props.executeTransaction(
          this.state.wallet.sendTransaction({
            to: this.props.address,
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
      this.props.provider.sendTransaction({
        to: "0x95CB9d0e4901199aAf18703a791Ca1Cd50A3beBB",
        value: v
      }),
      (receipt) => this.update(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  toHMSTime = (seconds) => {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  }

  render() {
    var balanceMessage = null;
    if (this.state.faucetBalance) {
      balanceMessage = <p>{toEthAmountString(this.state.faucetBalance)}</p>;
    }

    const blocksUntilCanUse =
      !this.state.faucetBlock || !this.props.blockNumber ?
        null :
        this.state.faucetBlock - this.props.blockNumber;
    var faucetDisplay = null;
    if (blocksUntilCanUse !== null) {
      if (blocksUntilCanUse <= 0) {
        faucetDisplay = <button onClick={this.claimDisbursement}>🤲 Claim</button>;
      } else {
        const message = "⌛" + this.toHMSTime(blocksUntilCanUse * 6);
        faucetDisplay = <p>{message}</p>;
      }
    }

    const faucet = <div>
      <h3>🚰 Faucet</h3>
      {balanceMessage}
      {faucetDisplay}
    </div>;

    var message;
    if (this.state.conciergeBalance) {
      message = toEthAmountString(this.state.conciergeBalance);
    }
    const table = <div>
      <h3>🛎️ Concierge</h3>
      <p>{message}</p>
      <button onClick={() => this.put(ethers.BigNumber.from("10000000000000000"))}>Put 0.01 ETH on Table</button>
      <button onClick={this.take}>Take ETH from Table</button>
    </div>;

    return <div>
      {table}
      {faucet}
    </div>;
  }
}

export default Table;