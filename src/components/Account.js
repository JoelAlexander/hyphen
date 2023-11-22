import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from '../context/HyphenContext';
import Balance from './Balance';
import { toEthAmountString } from '../Utils';
import YourEnsName from './YourEnsName.js';
import CreateInvitationCode from './CreateInvitationCode';
import ApprovalGateContainer from './ApprovalGateContainer';

const ethers = require("ethers");

const Account = () => {
  const context = useContext(HyphenContext);
  const faucetContract = context.getContract('faucet.hyphen');
  const [faucetBalance, setFaucetBalance] = useState(null);
  const [faucetBlock, setFaucetBlock] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    update();
  }, []);

  const update = async () => {
    const faucetResult = await faucetContract.balance();
    setFaucetBalance(faucetResult);

    const canUseResult = await faucetContract.canUseAtBlock(context.address);
    setFaucetBlock(canUseResult);

    const authorizerAddress = await faucetContract.authorizer();
    const authorizerContract = context.getContract('faucetauthorizer.hyphen')
    authorizerContract.resolvedAddress.then((resolvedAddress) => {
      if (authorizerAddress !== resolvedAddress) {
        console.error('Authorizer address does not match ens')
      }
    })

    const isUserAuthorized = await authorizerContract.isAuthorized(context.address);
    setIsAuthorized(isUserAuthorized);
  };

  const claimDisbursement = () => {
    faucetContract.use().then((receipt) => update());
  };

  const toHMSTime = (seconds) => {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  };

  const balanceMessage = faucetBalance && <p>{toEthAmountString(faucetBalance)}</p>;

  const blocksUntilCanUse = !faucetBlock || !context.getBlockNumber() ? null : faucetBlock - context.getBlockNumber();
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

  return (
    <ApprovalGateContainer addressOrName={'hyphen'}>
      <Balance balance={context.balance} />
      {faucet}
      <YourEnsName />
      <CreateInvitationCode />
    </ApprovalGateContainer>
  );
};

export default Account;
