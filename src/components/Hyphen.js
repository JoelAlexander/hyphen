import { hot } from 'react-hot-loader'
import React, { useState, useEffect } from 'react'
import { usePromise } from 'react-use'
import {Outlet, RouterProvider, Route, Link, createBrowserRouter, createRoutesFromElements, useLocation } from 'react-router-dom'
import HyphenContext from './HyphenContext'
import ItemShare from './ItemShare.js'
import Account from './Account.js'
import Counter from './Counter.js'
import Thumbs from './Thumbs.js'
import StatusBar from './StatusBar.js'
import Onboarding from './Onboarding'
import ActivityToast from './ActivityToast'
import Faq from './Faq.js'
import Toast from './Toast'
import './Hyphen.css'
import './NavMenu.css'
const ethers = require("ethers")

const menuItems = {
  'Account': { emoji: '👤', path: '/account' },
  'Terabytes': { emoji: '🔗', path: '/terabytes' },
  'Thumbs': { emoji: '👍', path: '/thumbs' },
  // 'Item Share': { emoji: '🔗', component: ItemShare, path: '/tool-library' },
  // 'Counter': { emoji: '🔔', component: Counter, path: '/counter' },
  // 'Help': { emoji: '❓', component: Faq, path: '/help' }
}

const getSubMenu = (path) => {
  if (path.length === 0) return menuItems
  return path.reduce((obj, key) => (obj && obj[key] && obj[key].submenu) ? obj[key].submenu : null, menuItems)
}

const NavMenu = ({ items }) => {
  return <div className="nav-menu">
    {items && Object.entries(items).map(([label, item], index) => (
      <Link key={index} to={item.path}>
        <div
          className="nav-menu-item">
          <span role="img" aria-label={label}>
            {item.emoji}
          </span>
          <p>{label}</p>
        </div>
      </Link>
    ))}
  </div>
}

const HyphenOutlet = ({ entries, blockNumber, address, signer, name, setSigner, setAddress, setHouseWallet, setName, logout, isInFlightTransactions }) => {
  const [menuStack, setMenuStack] = useState([])
  const currentMenu = getSubMenu(menuStack)

  const statusBar = signer && name ?
    <StatusBar
      logout={logout}
      syncing={isInFlightTransactions}
      address={address || 'logged-out'}
      blockNumber={blockNumber}
      entries={entries} /> : null

  const location = useLocation()
  const onboarding = (!signer || !name) && <Onboarding setSigner={setSigner} setAddress={setAddress} setHouseWallet={setHouseWallet} setName={setName} />
  const navMenu = location.pathname === '/' ? <NavMenu items={currentMenu} /> : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'inline-block', width: '100%' }}>
        {statusBar}
      </div>
      <div style={{ display: 'inline-block', flex: '1', width: '100%', height: '100%' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          paddingLeft: '2em',
          paddingRight: '2em' }}>
          <div className="main-content">
            {onboarding || navMenu || <Outlet />}
          </div>
        </div>
      </div>
    </div>)
}

const Hyphen = ({ provider, configuration }) => {
  const mounted = usePromise()
  const [entries, setEntries] = useState([])
  const [blockNumber, setBlockNumber] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [signer, setSigner] = useState(null)
  const [balance, setBalance] = useState(null)
  const [address, setAddress] = useState(null)
  const [name, setName] = useState(null)
  const [houseWallet, setHouseWallet] = useState(null)
  const [unsentTransactions, setUnsentTransactions] = useState([])
  const [inProgressTransaction, setInProgressTransaction] = useState(null)
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [connectedContracts, setConnectedContracts] = useState({})
  const [isPolling, setIsPolling] = useState(true)
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(6)
  const [activityToasts, setActivityToasts] = useState([])
  const [addressCache, setAddressCache] = useState({})

  useEffect(() => {
    const intervalId = setInterval(() => {
      mounted(provider.getBlockNumber())
        .then((latestBlockNumber) => {
          console.log(`BlockNumber: ${latestBlockNumber}`)
          setBlockNumber(_ => latestBlockNumber)
        })
    }, pollingIntervalSeconds * 1000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!signer) {
      setBalance(null)
      return;
    }
    mounted(signer.getBalance())
      .then((latestBalance) => setBalance(_ => latestBalance))
  }, [blockNumber, signer]);

  useEffect(() => {
    if (activityToasts.length > 0) {
      const timer = setTimeout(() => {
        setActivityToasts(activityToasts.slice(1))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [activityToasts])

  useEffect(() => {
    provider.polling = isPolling;
    provider.pollingInterval = pollingIntervalSeconds * 1000;
  }, [isPolling, pollingIntervalSeconds])

  useEffect(() => {
    if (unsentTransactions.length === 0 || inProgressTransaction !== null) {
      return
    }

    const [[populateTransaction, resolve, reject], ...rest] = unsentTransactions;
    setInProgressTransaction([populateTransaction, resolve, reject]);
    setUnsentTransactions(rest);
  }, [unsentTransactions, inProgressTransaction])

  useEffect(() => {
    if (inProgressTransaction === null) {
      return
    }

    const [populateTransaction, resolve, reject] = inProgressTransaction;
    populateTransaction()
      .then(transactionRequest => {
        return signer.sendTransaction(transactionRequest)
          .then(transactionResponse => {
            const transactionHash = transactionResponse.hash
            setPendingTransactions((prev) => {
              return [...prev, [transactionHash]]
            })
            return transactionResponse.wait().then((receipt) => {
              if (receipt.status) {
                return receipt
              } else {
                return Promise.reject(receipt)
              }
            }).finally(() => {
              setPendingTransactions(prev => {
                return [...prev].filter(hash => hash != transactionHash)
              })
            })
          })
      }).then(resolve, reject)
      .finally(() => setInProgressTransaction(null))
  }, [inProgressTransaction])

  const enqueueTransaction = (populateTransaction) => {
    return new Promise((resolve, reject) => {
      setUnsentTransactions(previousUnsetTransactions => [...previousUnsetTransactions, [populateTransaction, resolve, reject]])
    })
  }

  const getCachedEnsName = (address) => {
    return addressCache[address]
  }

  const getEnsName = (address) => {
    const cached = getCachedEnsName(address)
    if (cached) {
      return Promise.resolve(cached)
    } else {
      return provider.lookupAddress(address)
        .then((result) => {
          setAddressCache(prevState => ({...prevState, [address]: result}))
          return result
        })
    }
  }

  const getResolvedAddress = (ensName) => {
    return configuration.resolvedAddresses[ensName]
  }

  const getContract = (address, abi) => {
    if (!abi) {
      abi = configuration.contracts[address]
    }

    // Use resolved address to avoid unnecessary name lookups
    // upon interaction.
    if (configuration.resolvedAddresses[address]) {
      address = configuration.resolvedAddresses[address]
    }

    if (connectedContracts[address]) {
      return connectedContracts[address]
    }

    const contractInterface = new ethers.utils.Interface(abi)
    const contract = new ethers.Contract(address, abi, signer ? signer : provider)
    const returnedContract = new Proxy({}, {
      get: (_, prop) => {
        try {
          const functionFragment = contractInterface.getFunction(prop)
          if (functionFragment.stateMutability === 'view' ) {
            return (...args) => {
              return contract.callStatic[prop](...args)
            }
          } else {
            return (...args) => {
              return enqueueTransaction(() => {
                return contract.populateTransaction[prop](...args)
              })
            }
          }
        } catch {
          return contract[prop]
        }
      },
    })
    connectedContracts[address] = returnedContract
    return returnedContract
  }

  const logout = () => {
    setMenuStack([])
    setContractCalls({})
    setEntries([])
    setBlockNumber(null)
    setToastVisible(false)
    setConnectedContracts({})
    setSigner(null)
    setAddress(null)
    setName(null)
    setHouseWallet(null)
    setUnsentTransactions([])
    setInProgressTransaction(null)
    setPendingTransactions([])
    setActivityToasts([])
  }

  const executeTransaction = (transactionRequest) => {
    if (!signer) {
      return Promise.reject("No signer")
    }

    return enqueueTransaction(() => {
      return signer.populateTransaction(transactionRequest)
    })
  }

  const showToast = () => {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  const addActivityToast = (address, message) => {
    setActivityToasts(previousToasts => [...previousToasts, { address, message }])
  }

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path='/' element={<HyphenOutlet entries={entries} blockNumber={blockNumber} address={address} signer={signer} name={name} setSigner={setSigner} setAddress={setAddress} setHouseWallet={setHouseWallet} setName={setName} logout={logout} isInFlightTransactions={pendingTransactions.length !== 0} />}>
        <Route path='account' element={<Account />} />
        <Route path='terabytes' element={<Thumbs />} />
        <Route path='thumbs' element={<Thumbs />} />
      </Route>
    )
  )

  return (<HyphenContext.Provider value={{
    blockNumber: blockNumber,
    configuration: configuration,
    provider: provider,
    getResolvedAddress: getResolvedAddress,
    getEnsName: getEnsName,
    getCachedEnsName: getCachedEnsName,
    getContract: getContract,
    executeTransaction: executeTransaction,
    signer: signer,
    balance: balance,
    address: address,
    name: name,
    houseWallet: houseWallet,
    showToast: showToast,
    addActivityToast: addActivityToast
  }}>
    <RouterProvider router={router} />
    {toastVisible && <Toast />}
    {activityToasts.length > 0 && <ActivityToast toast={activityToasts[0]} />}
  </HyphenContext.Provider>)
}

export default hot(module)(Hyphen)
