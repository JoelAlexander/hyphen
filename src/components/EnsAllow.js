import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from '../context/HyphenContext';
import namehash from 'eth-ens-namehash';
import { usePromise } from 'react-use'
import './Hyphen.css';
import useIsApprovedForAll from '../hooks/useIsApprovedForAll'
import EthCrypto from 'eth-crypto';
const ethers = require('ethers');

const EnsAllow = ({address}) => {
  const mounted = usePromise()
  const context = useContext(HyphenContext)
  const [encrypted, setEncrypted] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    mounted(EthCrypto.encryptWithPublicKey(ethers.utils.arrayify(context.signer.publicKey), Buffer.from('hello world🌍')))
      .then(setEncrypted)
  }, [])

  useEffect(() => {
    if (encrypted) {
      mounted(EthCrypto.decryptWithPrivateKey(context.signer.privateKey, encrypted))
        .then(setResult)
    }
  }, [encrypted])

  return <p>
    {result}
  </p>
}

export default EnsAllow