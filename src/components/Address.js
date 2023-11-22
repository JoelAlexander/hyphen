import { useState, useEffect, useContext } from 'react'
import HyphenContext from '../context/HyphenContext'
import { usePromise } from 'react-use'
import { shortenHex } from '../Utils'
const ethers = require('ethers')

const Address = ({ address }) => {
  const mounted = usePromise()
  const context = useContext(HyphenContext)
  const [ensName, setEnsName] = useState(context.getCachedEnsName(address))

  useEffect(() => {
    if (ethers.utils.isAddress(address)) {
      mounted(context.getEnsName(address)).then(setEnsName)
    } else {
      setEnsName(address)
    }
  }, [])

  const shortenedAddress = address ? shortenHex(address) : '\u{200D}'
  const displayValue = ensName ? ensName : shortenedAddress
  return displayValue
};

export default Address
