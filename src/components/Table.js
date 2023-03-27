import React from 'react';
import HyphenContext from './HyphenContext';
import { AuthorizedFaucet } from '@local-blockchain-toolbox/contract-primitives';
import { toEthAmountString } from '../Utils';
const ethers = require("ethers");

class Table extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      faucetBalance: null,
      faucetBlock: null
    };
  }

  componentDidMount() {
    this.update()
  }

  update = () => {
    this.context.houseWallet.getBalance().then((balance) => {
      this.setState({
        conciergeBalance: balance
      });
    });

    this.getFaucetContract()
      .balance().then((result) => {
      this.setState({
        faucetBalance: result
      });
    });

    this.getFaucetContract()
      .canUseAtBlock(this.context.address).then((result) => {
      this.setState({
        faucetBlock: result
      });
    });
  }

  getFaucetContract = () => {
    return new ethers.Contract("faucet.hyphen", AuthorizedFaucet.abi, this.context.signer);
  };

  claimDisbursement = () => {
    this.context.executeTransaction(
      this.getFaucetContract().use(),
      (receipt) => this.update(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  take = (amount) => {
    this.context.signer.getGasPrice().then((gasPrice) => {
      this.context.houseWallet.getBalance().then((balance) => {

        const gasAmount = 21000;
        const gasCost = gasPrice.mul(gasAmount);
        const amountPlusGas = amount.add(gasCost);
        if (balance.gte(amountPlusGas)) {
          this.context.executeTransaction(
            this.context.houseWallet.sendTransaction({
              to: this.props.address,
              value: amount,
              gasLimit: gasAmount,
              gasPrice: gasPrice,
              type: 0x0
            }),
            (receipt) => this.update(),
            (error) => this.props.addMessage(JSON.stringify(error)));
        }
      });
    });
  };

  put = (amount) => {
    this.context.signer.getGasPrice().then((gasPrice) => {
      this.context.executeTransaction(
        this.context.signer.sendTransaction({
          to: this.context.houseWallet.address,
          value: amount,
          gasLimit: 21000,
          gasPrice: gasPrice,
          type: 0x0
        }),
        (receipt) => this.update(),
        (error) => this.props.addMessage(JSON.stringify(error)));
    });
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

    const amount = ethers.BigNumber.from("10000000000000000");
    const giveMessage = "➕ " + toEthAmountString(amount, 2);
    const takeMessage = "🤲 " + toEthAmountString(amount, 2);
    const table = <div>
      <h3>🛎️ Concierge</h3>
      <p>{message}</p>
      <button onClick={() => this.put(amount)}>{giveMessage}</button>
      <button onClick={() => this.take(amount)}>{takeMessage}</button>
    </div>;

    return <div>
      {table}
      {faucet}
    </div>;
  }
}

Table.contextType = HyphenContext;

export default Table;
