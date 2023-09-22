import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import namehash from 'eth-ens-namehash';
import { usePromise } from 'react-use'
import './Hyphen.css';
import EthCrypto from 'eth-crypto';
const ethers = require('ethers');

const ZeroAddress = "0x0000000000000000000000000000000000000000"

const EnsAllow = ({address}) => {
  const mounted = usePromise()
  const context = useContext(HyphenContext)
  const ensContract = context.getContract(context.configuration.ens)
  const [isApprovedForAll, setIsApprovedForAll] = useState(null)
  const [encrypted, setEncrypted] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    mounted(ensContract.isApprovedForAll(context.address, address))
      .then(setIsApprovedForAll)

    mounted(EthCrypto.encryptWithPublicKey(ethers.utils.arrayify(context.signer.publicKey), Buffer.from('hello world🌍')))
      .then(setEncrypted)
  }, [])

  useEffect(() => {
    const approvalForAllFilter = ensContract.filters.ApprovalForAll(context.address, address, null)
    const handleApprovalForAll = (_, __, approved) => {
      setIsApprovedForAll(approved)
    }
    ensContract.on(approvalForAllFilter, handleApprovalForAll)
    return () => {
      ensContract.off(approvalForAllFilter, handleApprovalForAll)
    }
  }, [])

  useEffect(() => {
    if (encrypted) {
      mounted(EthCrypto.decryptWithPrivateKey(context.signer.privateKey, encrypted))
        .then(setResult)
    }
  }, [encrypted])

  const handleApprove = () => {
    ensContract.setApprovalForAll(address, true)
  }

  const handleDisapprove = () => {
    ensContract.setApprovalForAll(address, false)
  }

  return <p>
    {isApprovedForAll ? <button onClick={handleDisapprove}>Disallow {address} to modify your account records</button> : <button onClick={handleApprove}>Allow {address} to modify your account records</button>}
    {result}
  </p>
}

export default EnsAllow