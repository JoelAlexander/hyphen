import { hot } from 'react-hot-loader'
import React, { useState, useEffect, useRef } from 'react'
import HyphenContext from './HyphenContext'
import ItemShare from './ItemShare.js'
import Account from './Account.js'
import Counter from './Counter.js'
import Recipes from './Recipes.js'
import RecipeSettings from './RecipeSettings.js'
import RecipePreparation from './RecipePreparation.js'
import StatusBar from './StatusBar.js'
import Onboarding from './Onboarding'
import ActivityToast from './ActivityToast'
import Faq from './Faq.js'
import Toast from './Toast'
import './Hyphen.css'
import './NavMenu.css'
const ethers = require("ethers")

const menuItems = {
  'Account': { emoji: '👤', component: Account },
  'Item Share': { emoji: '🔗', component: ItemShare },
  'Counter': { emoji: '🔔', component: Counter },
  'Food': { 
    emoji: '🍽️',
    submenu: {
      'Meal planning': { emoji: '📅', component: RecipePreparation },
      'Recipes': { emoji: '📚', component: Recipes },
      'Settings': { emoji: '⚙️', component: RecipeSettings },
    },
  },
  'Help': { emoji: '❓', component: Faq }
}

const getSubMenu = (path) => {
  if (path.length === 0) return menuItems
  return path.reduce((obj, key) => (obj && obj[key] && obj[key].submenu) ? obj[key].submenu : null, menuItems)
}

const getComponent = (path) => {
  const lastKey = path[path.length - 1]
  const submenu = getSubMenu(path.slice(0, -1))
  return (submenu && submenu[lastKey] && submenu[lastKey].component) ? submenu[lastKey].component : null
}

const NavMenu = ({ items, onSelectMenu }) => (
  <div className="nav-menu">
    {items && Object.entries(items).map(([label, item], index) => (
      <div
        key={index}
        className="nav-menu-item"
        onClick={() => onSelectMenu(label)}
      >
        <span role="img" aria-label={label}>
          {item.emoji}
        </span>
        <p>{label}</p>
      </div>
    ))}
  </div>
)

const Hyphen = ({ provider, configuration }) => {
  const [menuStack, setMenuStack] = useState([])
  const [entries, setEntries] = useState([])
  const [blockNumber, setBlockNumber] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState(null)
  const [name, setName] = useState(null)
  const [houseWallet, setHouseWallet] = useState(null)
  const [unsentTransactions, setUnsentTransactions] = useState([])
  const [inProgressTransaction, setInProgressTransaction] = useState(null)
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [connectedContracts, setConnectedContracts] = useState({})
  const [isPolling, setIsPolling] = useState(true)
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(12)
  const [activityToasts, setActivityToasts] = useState([])
  const [addressCache, setAddressCache] = useState({})

  useEffect(() => {
    provider.on('poll', (pollId, blockNumber) => {
      setBlockNumber(blockNumber)
    })
    return () => {
      provider.off('poll')
    }
  }, [])

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
    const handlePopState = (event) => {
      if (canGoBack()) {
        handleBack();
        event.preventDefault()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  })

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

  const lookupAddress = async (address) => {
    if (addressCache[address]) {
      return addressCache[address]
    } else {
      const result = await provider.lookupAddress(address)
      setAddressCache(prevState => ({...prevState, [address]: result}))
      return result
    }
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
      get: (target, prop) => {
        try {
          const functionFragment = contractInterface.getFunction(prop)
          if (functionFragment.stateMutability === 'view' ) {
            return (...args) => {
              return contract.callStatic[prop](...args)
            };
          } else {
            return (...args) => {
              return enqueueTransaction(() => {
                return contract.populateTransaction[prop](...args)
              });
            };
          }
        } catch {
          return contract[prop]
        }
      },
    })
    connectedContracts[address] = returnedContract
    return returnedContract
  };

  const handleSelectMenu = (label) => {
    window.history.pushState({}, '')
    setMenuStack([...menuStack, label])
  };

  const canGoBack = () => {
    return menuStack.length > 0
  }

  const handleBack = () => {
    const newMenuStack = menuStack.slice();
    if (newMenuStack.length > 0) {
      newMenuStack.pop()
    }
    setMenuStack(newMenuStack)
  }

  const addMessage = (message) => {
    const newEntries = entries.slice();
    newEntries.unshift({type: "message", key: newEntries.length, message: message})
    setEntries(newEntries)
  }

  const onTransactionResponse = (transactionResponse) => {
    const newEntries = entries.slice()
    newEntries.unshift({type: "transaction", key: transactionResponse.hash, transactionResponse: transactionResponse})
    setEntries(newEntries)
  }

  const onTransactionReceipt = (transactionReceipt) => {
    const newEntries = entries.slice();
    const updateIndex = newEntries.findIndex((entry) => entry.key === transactionReceipt.transactionHash)
    if (updateIndex != -1) {
      const modified = newEntries[updateIndex]
      modified.transactionReceipt = transactionReceipt
      newEntries[updateIndex] = modified
    }
    setEntries(newEntries);
  };

  const logout = () => {
    setMenuStack([])
    setContractCalls({})
    setEntries([])
    setBlockNumber(null)
    setToastVisible(false)
    setConnectedContracts({})
  };

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
  };

  const isInFlightTransactions = pendingTransactions.length !== 0
  const statusBar = signer && name ?
    <StatusBar
      logout={logout}
      syncing={isInFlightTransactions}
      address={address || 'logged-out'}
      blockNumber={blockNumber}
      entries={entries} /> : null

  const currentMenu = getSubMenu(menuStack)
  const ActiveComponent = getComponent(menuStack)

  const addActivityToast = (address, message) => {
    setActivityToasts(previousToasts => [...previousToasts, { address, message }])
  };

  return (
    <HyphenContext.Provider value={{
      configuration: configuration,
      provider: provider,
      lookupAddress: lookupAddress,
      getContract: getContract,
      executeTransaction: executeTransaction,
      signer: signer,
      address: address,
      name: name,
      houseWallet: houseWallet,
      showToast: showToast,
      addActivityToast: addActivityToast
    }}>
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
              {(!signer || !name) && <Onboarding setSigner={setSigner} setAddress={setAddress} setHouseWallet={setHouseWallet} setName={setName} /> ||
                (ActiveComponent && <ActiveComponent />) ||
                <NavMenu
                  items={currentMenu}
                  onSelectMenu={handleSelectMenu} />}
            </div>
          </div>
        </div>
        {toastVisible && <Toast />}
        {activityToasts.length > 0 && <ActivityToast toast={activityToasts[0]} />}
      </div>
  </HyphenContext.Provider>)
}

export default hot(module)(Hyphen)
