import { hot } from 'react-hot-loader'
import React, { useState, useEffect, useRef } from 'react'
import { usePromise } from 'react-use'
import {Outlet, RouterProvider, Route, Link, createBrowserRouter, createRoutesFromElements, useNavigate, useLocation } from 'react-router-dom'
import HyphenContext from '../context/HyphenContext'
import useLocalSettings from '../hooks/useLocalSettings';
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
  'Item Share': { emoji: '🔗', path: '/tool-library' },
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

const HyphenOutlet = ({ entries, blockNumber, address, logout, isInFlightTransactions }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuStack, setMenuStack] = useState([])
  const currentMenu = getSubMenu(menuStack)

  useEffect(() => {
    navigate(`${location.pathname}${location.search}`)
  }, [])

  const navMenu = location.pathname === '/' ? <NavMenu items={currentMenu} /> : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'inline-block', width: '100%' }}>
      </div>
      <div style={{ display: 'inline-block', flex: '1', width: '100%', height: '100%' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
          height: '100%',
          paddingLeft: '2em',
          paddingRight: '2em' }}>
          {navMenu || <Outlet />}
        </div>
      </div>
    </div>)
}

const Hyphen = ({ provider, configuration }) => {
  const mounted = usePromise()
  const [entries, setEntries] = useState([])
  const [blockNumber, setBlockNumber] = useState(0)
  const [toastVisible, setToastVisible] = useState(false)
  const [account, setAccount] = useState(null)
  const [network, setNetwork] = useState(null)
  const [[signer, address], setSignerAndAddress] = useState([null, null])
  const [name, setName] = useState(null)
  const [zone, setZone] = useState(null)
  const [balance, setBalance] = useState(null)
  const [houseWallet, setHouseWallet] = useState(null)
  const [unsentTransactions, setUnsentTransactions] = useState([])
  const [inProgressTransaction, setInProgressTransaction] = useState(null)
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [isPolling, setIsPolling] = useState(true)
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(2)
  const [activityToasts, setActivityToasts] = useState([])
  const [addressCache, setAddressCache] = useState(
    Object.fromEntries(
      Object.entries(configuration.resolvedAddresses)
        .map(([ensName, resolvedAddress]) => [resolvedAddress, ensName])))
  const blockNumberRef = useRef(0)
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0)
  const {
    accounts,
    addAccount,
    removeAccount,
    updateAccountOrder,
    updateNetworkOrder,
    updateZoneOrder,
    addNetwork,
    removeNetwork,
    addZone,
    removeZone
  } = useLocalSettings()
  const [selectedPreselectedNetworkIndex, setSelectedNetworkIndex] = useState(null)
  const hasAccount = signer !== null && address !== null
  const selectedFingerprint = selectedAccountIndex !== null && accounts.length > selectedAccountIndex ?
    accounts[selectedAccountIndex].fingerprint : null
  const networks = selectedAccountIndex !== null && accounts.length > selectedAccountIndex ? accounts[selectedAccountIndex].networks : null

  useEffect(() => {
    if (selectedAccountIndex === null) {
      setAccount(null)
      setNetwork(null)
    } else if (accounts.length > selectedAccountIndex) {
      setAccount(accounts[selectedAccountIndex])
    }
  }, [accounts, selectedAccountIndex])

  useEffect(() => {
    if (selectedAccountIndex !== null && accounts.length > selectedAccountIndex && accounts[selectedAccountIndex].networks.length > 0) {
      setSelectedNetworkIndex(0)
    } else if (selectedAccountIndex !== null && accounts.length > selectedAccountIndex && accounts[selectedAccountIndex].networks.length == 0) {
      setSelectedNetworkIndex(null)
    }
  }, [selectedAccountIndex])

  const setLatestBlockNumber = (latestBlockNumber) => {
    console.log(`BlockNumber: ${latestBlockNumber}`)
    blockNumberRef.current = latestBlockNumber
    setBlockNumber(_ => latestBlockNumber)
  }

  useEffect(() => {
    mounted(provider.getBlockNumber()).then(setLatestBlockNumber)
    const intervalId = setInterval(() => {
      mounted(provider.getBlockNumber())
        .then(setLatestBlockNumber)
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

  const getResolvedAddress = (addressOrName) => {
    return ethers.utils.isAddress(addressOrName) ? addressOrName : configuration.resolvedAddresses[addressOrName]
  }

  const getContract = (address, abi) => {
    if (!abi) {
      if (configuration.contracts[address]) {
        abi = configuration.contracts[address]
      } else {
        throw new Error(`No ABI found for ${address}`)
      }
    }

    // Use resolved address to avoid unnecessary name lookups
    // upon interaction.
    if (configuration.resolvedAddresses[address]) {
      address = configuration.resolvedAddresses[address]
    }

    const contractInterface = new ethers.utils.Interface(abi)
    const contract = new ethers.Contract(address, abi, signer ? signer : provider)
    return new Proxy({}, {
      get: (_, prop) => {
        try {
          const functionFragment = contractInterface.getFunction(prop)
          if (functionFragment.stateMutability === 'view' ) {
            return (...args) => {
              console.log(`Making static call with block number ${blockNumberRef.current}`)
              return contract.callStatic[prop](...args, { blockTag: blockNumberRef.current })
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
  }

  const logout = () => {
    setMenuStack([])
    setContractCalls({})
    setEntries([])
    setBlockNumber(null)
    setToastVisible(false)
    setSignerAndAddress([null, null])
    setName(null)
    setZone(null)
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

  const applicationRouter = createBrowserRouter(
    createRoutesFromElements(
      <Route path='/' element={<HyphenOutlet entries={entries} blockNumber={blockNumber} address={address} signer={signer} name={name} logout={logout} />}>
        <Route path='account' element={<Account />} />
        <Route path='terabytes' element={<Thumbs />} />
        <Route path='thumbs' element={<Thumbs />} />
        <Route path='tool-library' element={<ItemShare />} />
      </Route>
    )
  )
  
  const getBlockNumber = () => {
    return blockNumberRef.current
  }

  const getDisplayName = (addressOrName) => {
    const cachedEnsName = getCachedEnsName(addressOrName)
    return ethers.utils.isAddress(addressOrName) ?
      (cachedEnsName ? cachedEnsName : addressOrName):
      addressOrName;
  }

  const signIn = (userSecret) => {
    const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(account.fingerprint + userSecret));
    const wallet = new ethers.Wallet(privateKey, provider);
    setSignerAndAddress([wallet, wallet.address])
  }

  const signOut = ()=> {
    setSignerAndAddress([null, null])
  }

  const routerProvider = signer ?
    <RouterProvider router={applicationRouter} /> :
    <Onboarding
      account={account}
      network={network}
      accounts={accounts}
      addAccount={addAccount}
      removeAccount={removeAccount}
      addNetwork={(network) => addNetwork(selectedFingerprint, network)}
      removeNetwork={(network) => removeNetwork(selectedFingerprint, network)}
      setDefaultNetwork={(network) => updateNetworkOrder(selectedFingerprint, network, 0)}
      selectNetwork={(network) => setNetwork(network)}
      signIn={signIn}
      signOut={signOut}/>

  return (<HyphenContext.Provider value={{
    getBlockNumber: getBlockNumber,
    configuration: configuration,
    provider: provider,
    getDisplayName: getDisplayName,
    getResolvedAddress: getResolvedAddress,
    getEnsName: getEnsName,
    getCachedEnsName: getCachedEnsName,
    getContract: getContract,
    executeTransaction: executeTransaction,
    signer: signer,
    balance: balance,
    address: address,
    network: network,
    name: name,
    setSignerAndAddress: setSignerAndAddress,
    setNetwork: setNetwork,
    setName: (newName) => {
      setAddressCache(prevState => {
        if (newName) {
          return {...prevState, [address]: newName}
        } else {
          const {[address]: _, ...remaining} = prevState
          return remaining
        }
      })
      setName(newName)
    },
    setZone: setZone,
    houseWallet: houseWallet,
    showToast: showToast,
    addActivityToast: addActivityToast
  }}>
    <StatusBar
      logout={logout}
      syncing={pendingTransactions.length !== 0}
      address={address || 'logged-out'}
      blockNumber={blockNumber}
      entries={entries} />
    {routerProvider}
    {toastVisible && <Toast />}
    {activityToasts.length > 0 && <ActivityToast toast={activityToasts[0]} />}
  </HyphenContext.Provider>)
}

export default hot(module)(Hyphen)
