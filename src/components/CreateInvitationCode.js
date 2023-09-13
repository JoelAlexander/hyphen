import React, { useState, useContext } from 'react';
import HyphenContext from './HyphenContext';

const ethers = require("ethers");

const CreateInvitationCode = () => {
  const context = useContext(HyphenContext);
  const [newWallet, setNewWallet] = useState(ethers.Wallet.createRandom());

  const createInvitation = async () => {
    const inviteLink = `https://hyphen.rocks/#/${newWallet.privateKey}`
    navigator.clipboard.writeText(inviteLink)
    context.showToast()

    const amount = ethers.utils.parseEther('0.01')
    const gasLimit = 21000
    const gasPrice = await context.signer.getGasPrice()
    context.executeTransaction({
      to: newWallet.address,
      value: amount,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
      type: 0x0
    })

    setNewWallet(ethers.Wallet.createRandom())
  }

  return <button onClick={createInvitation}>Create Invitation Code</button>
};

export default CreateInvitationCode;