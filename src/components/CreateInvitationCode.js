import React, { useState, useContext } from 'react';
import HyphenContext from './HyphenContext';

const ethers = require("ethers");

const CreateInvitationCode = () => {
  const context = useContext(HyphenContext);
  const [newWallet, setNewWallet] = useState(null);

  const createInvitation = async () => {
    const wallet = ethers.Wallet.createRandom();
    const amount = ethers.utils.parseEther('0.005');
    const gasLimit = 21000;
    const gasPrice = await context.signer.getGasPrice();

    context.executeTransaction(
      context.signer.sendTransaction({
        to: wallet.address,
        value: amount,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        type: 0x0
      }),
      (receipt) => {
        setNewWallet(wallet);
      },
      (error) => context.addMessage(JSON.stringify(error))
    );
  };

  return (
    <div>
      <h3>Create Invitation Code</h3>
      <button onClick={createInvitation}>Create</button>
      {newWallet && (
        <div>
          <p>Public Key: {newWallet.address}</p>
          <p>Private Key: {newWallet.privateKey}</p>
        </div>
      )}
    </div>
  );
};

export default CreateInvitationCode;