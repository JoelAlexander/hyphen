import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import { CopyToClipboard } from 'react-copy-to-clipboard'
const ethers = require('ethers')

const Address = ({ address }) => {
  const context = useContext(HyphenContext)
  const [ensName, setEnsName] = useState(null)

  useEffect(() => {
    const fetchENSName = async () => {
      const fetchedName = await context.getEnsName(address)
      setEnsName(fetchedName)
    }

    if (ethers.utils.isAddress(address)) {
      fetchENSName()
    } else {
      setEnsName(address)
    }
  }, [address])

  const shortenHex = (raw) => raw.slice(0, 5) + "..." + raw.slice(raw.length - 3)
  const shortenedAddress = address ? shortenHex(address) : '\u{200D}'
  const displayValue = ensName ? ensName : shortenedAddress
  return displayValue
};

export default Address
