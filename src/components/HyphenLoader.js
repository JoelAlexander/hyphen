import React, { useEffect, useState } from 'react'
import Hyphen from './Hyphen'
import Spinner from 'react-bootstrap/Spinner'

const useENSAddresses = (ensNames, resolveName) => {
  const [addresses, setAddresses] = useState({})

  useEffect(() => {
    const pending = {}
    const ensNamesToFetch = ensNames.filter(name => addresses[name] == undefined)
    if (ensNamesToFetch.length == 0) return
    ensNamesToFetch.forEach(name => {
      pending[name] = null
    })
    setAddresses(prev => ({ ...prev, ...pending}))

    ensNamesToFetch.reduce((prevPromise, name) => {
      return prevPromise
        .then(() => resolveName(name))
        .then((addr) => {
          setAddresses(prev => ({ ...prev, [name]: addr }))
        })
    }, Promise.resolve())
  }, [])

  return addresses
}
const HyphenLoader = ({provider, configuration, contracts}) => {
  const addresses = useENSAddresses(Object.keys(contracts), (name) => provider.resolveName(name))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const allAddressesLoaded = Object.values(addresses).every(addr => addr !== null);
    setIsLoading(!allAddressesLoaded);
  }, [addresses])

  if (isLoading) {
    return <Spinner />
  } else {
    return <Hyphen provider={provider} configuration={({...configuration, contracts: contracts, resolvedAddresses: addresses})} />
  }
}

export default HyphenLoader;
