import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { AuthorizedFaucet, IAuthorizer } from '@local-blockchain-toolbox/contract-primitives';
import { toEthAmountString } from '../Utils';
import YourEnsName from './YourEnsName.js';

const ethers = require("ethers");

const Account = (props) => {
  const context = useContext(HyphenContext);
  const [faucetBalance, setFaucetBalance] = useState(null);
  const [faucetBlock, setFaucetBlock] = useState(null);
  const [conciergeBalance, setConciergeBalance] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    update();
  }, []);

  const update = async () => {
    const balance = await context.houseWallet.getBalance();
    setConciergeBalance(balance);

    const faucetContract = getFaucetContract();
    const faucetResult = await faucetContract.balance();
    setFaucetBalance(faucetResult);

    const canUseResult = await faucetContract.canUseAtBlock(context.address);
    setFaucetBlock(canUseResult);

    const authorizerAddress = await faucetContract.authorizer();
    const authorizerContract = new ethers.Contract(authorizerAddress, IAuthorizer.abi, context.signer);
    const isUserAuthorized = await authorizerContract.isAuthorized(context.address);
    setIsAuthorized(isUserAuthorized);
  };

  const getFaucetContract = () => {
    return new ethers.Contract("faucet.hyphen", AuthorizedFaucet.abi, context.signer);
  };

  const claimDisbursement = () => {
    context.executeTransaction(
      getFaucetContract().use(),
      (receipt) => update(),
      (error) => context.addMessage(JSON.stringify(error))
    );
  };

  const take = async (amount) => {
    const gasPrice = await context.signer.getGasPrice();
    const balance = await context.houseWallet.getBalance();

    const gasAmount = 21000;
    const gasCost = gasPrice.mul(gasAmount);
    const amountPlusGas = amount.add(gasCost);
    if (balance.gte(amountPlusGas)) {
      context.executeTransaction(
        context.houseWallet.sendTransaction({
          to: context.signer.address,
          value: amount,
          gasLimit: gasAmount,
          gasPrice: gasPrice,
          type: 0x0
        }),
        (receipt) => update(),
        (error) => context.addMessage(JSON.stringify(error))
      );
    }
  };

  const put = async (amount) => {
    const gasPrice = await context.signer.getGasPrice();
    context.executeTransaction(
      context.signer.sendTransaction({
        to: context.houseWallet.address,
        value: amount,
        gasLimit: 21000,
        gasPrice: gasPrice,
        type: 0x0
      }),
      (receipt) => update(),
      (error) => context.addMessage(JSON.stringify(error))
    );
  };

  const toHMSTime = (seconds) => {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  };

  const balanceMessage = faucetBalance && <p>{toEthAmountString(faucetBalance)}</p>;

  const blocksUntilCanUse = !faucetBlock || !props.blockNumber ? null : faucetBlock - props.blockNumber;
  const faucetDisplay = (() => {
    if (isAuthorized === null || blocksUntilCanUse === null) {
      return null;
    } else if (isAuthorized && blocksUntilCanUse <= 0) {
      return <button onClick={claimDisbursement}>🤲 Claim</button>;
    } else if (isAuthorized && blocksUntilCanUse > 0) {
      return <p>⌛{toHMSTime(blocksUntilCanUse * 6)}</p>;
    } else {
      return <p>🚫</p>;
    }
  })();

  const faucet = (
    <div>
      <h3>🚰 Faucet</h3>
      {balanceMessage}
      {faucetDisplay}
    </div>
  );

  const message = conciergeBalance && toEthAmountString(conciergeBalance);
  const amount = ethers.BigNumber.from("1000000000000000");
  const giveMessage = "➕ " + toEthAmountString(amount, 3);
  const takeMessage = "🤲 " + toEthAmountString(amount, 3);
  const concierge = (
    <div>
      <h3>🛎️ Concierge</h3>
      <p>{message}</p>
      <button onClick={() => put(amount)}>{giveMessage}</button>
      <button onClick={() => take(amount)}>{takeMessage}</button>
    </div>
  );

  return (
    <div>
      {concierge}
      {faucet}
      <YourEnsName
        houseWallet={context.houseWallet} />
    </div>
  );
};

export default Account;
