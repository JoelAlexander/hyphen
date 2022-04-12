import React from 'react';
import FaucetContract from './../contracts/Faucet.sol/Faucet.json';
const ethers = require("ethers");

const faucetAddress = "0x0Ff4f87B22b795a672fC12884a09087EBdE021cB";

class Faucet extends React.Component {

  constructor(props) {
    super(props);
    const contract = this.props.accessDeployedContract(faucetAddress, FaucetContract.abi);
    this.state = {
      contract: contract,
      balance: null,
      block: null
    };
  };

  componentDidMount() {
    this.updateFaucetBalance();
  }

  updateFaucetBalance = () => {
    this.state.contract.balance().then((result) => {
      this.setState({
        balance: result
      });
    });

    if (this.props.address) {
      this.state.contract.canUseAtBlock(this.props.address).then((result) => {
        this.setState({
          block: result
        });
      });
    }
  };

  payFaucet = () => {
    this.props.executeTransaction(
      this.state.contract.pay({value: "100000000000000000000"}),
      (receipt) => this.updateFaucetBalance(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  claimDisbursement = () => {
    this.props.executeTransaction(
      this.state.contract.claim(),
      (receipt) => this.updateFaucetBalance(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  render() {
    var balanceMessage = "Faucet Balance: ";
    if (this.state.balance) {
      balanceMessage += Number(ethers.utils.formatEther(this.state.balance)).toFixed(0) + " ETH";
    }

    var stateMessage = "Can use at block: " + this.state.block;

    return <div>
      <p>{stateMessage}</p>
      <p>{balanceMessage}</p>
      <button onClick={this.claimDisbursement}>Claim faucet disbursement</button>
      <button onClick={this.payFaucet}>Fund faucet with 100 Eth</button>
    </div>;
  }
}

export default Faucet;