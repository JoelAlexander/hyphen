import Cookies from "js-cookie";
import { hot } from 'react-hot-loader';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Splash from './Splash.js';
import Account from './Account.js';
import Counter from './Counter.js';
import Recipes from './Recipes.js';
import RecipeSettings from './RecipeSettings.js';
import RecipePreparation from './RecipePreparation.js';
import StatusBar from './StatusBar.js';
import Onboarding from './Onboarding';
import Faq from './Faq.js';
import Toast from './Toast';
import './Hyphen.css';
import './NavMenu.css';
const ensContracts = require('@ensdomains/ens-contracts')
const ethers = require("ethers");

const menuItems = [
  {
    label: 'Account',
    emoji: '👤',
    component: Account,
  },
  {
    label: 'Counter',
    emoji: '🔔',
    component: Counter,
  },
  {
    label: 'Food',
    emoji: '🍽️',
    submenu: [
      {
        label: 'Meal planning',
        emoji: '📅',
        component: RecipePreparation,
      },
      {
        label: 'Recipes',
        emoji: '📚',
        component: Recipes,
      },
      {
        label: 'Settings',
        emoji: '⚙️',
        component: RecipeSettings,
      }
    ],
  },
  {
    label: 'Help',
    emoji: '❓',
    component: Faq
  }
];

const NavMenu = ({ items, onSelectComponent, onSelectSubmenu }) => (
  <div className="nav-menu">
    {items.map((item, index) => (
      <div
        key={index}
        className="nav-menu-item"
        onClick={
          item.component
            ? () => onSelectComponent(item.component)
            : () => onSelectSubmenu(item.submenu)
        }
      >
        <span role="img" aria-label={item.label}>
          {item.emoji}
        </span>
        <p>{item.label}</p>
      </div>
    ))}
  </div>
);

const Hyphen = ({ provider, configuration }) => {

  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [name, setName] = useState(null);
  const [houseWallet, setHouseWallet] = useState(null);

  const lookupAddress = (address) => {
    return provider.lookupAddress(address);
  };

  const getContract = (address) => {
    const abi = configuration.contracts[address];
    const contractInterface = new ethers.utils.Interface(abi);
    const contract = new ethers.Contract(address, abi, signer);
    return new Proxy({}, {
      get: (target, prop) => {
        try {
          const functionFragment = contractInterface.getFunction(prop);
          if (functionFragment.stateMutability === 'view' ) {
            return (...args) => {
              return contract.callStatic[prop](...args);
            };
          } else {
            return async (...args) => {
              return contract.populateTransaction[prop](...args).then(executeTransaction);
            };
          }
        } catch {
          return contract[prop];
        }
      },
    });
  }

  const createInitialLoggedOutState = () => {

    return {
      menuStack: [menuItems],
      menu: [],
      menuHistory: [],
      contractCalls: {},
      contractCallsReadOnly: {},
      entries: [],
      blockNumber: null,
      toastVisible: false,
      activeComponent: null
    };
  };

  const [state, setState] = useState(createInitialLoggedOutState());

  useEffect(() => {
    const blockNumberInterval = setInterval(() => {
      provider
        .getBlockNumber()
        .then((result) => {
          console.log(`blockNumber update ${performance.now()}`)
          setState(prevState => ({ ...prevState, blockNumber: result }));
        });
    }, 12000);

    return () => {
      clearInterval(blockNumberInterval);
    };
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      if (canGoBack()) {
        handleBack();
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  const handleSelectComponent = (component) => {
    window.history.pushState({}, '');
    setState(prevState => ({...prevState, component: component}));
  };

  const handleSelectSubmenu = (submenu) => {
    window.history.pushState({}, '');
    setState(prevState => ({...prevState, menuStack: [...prevState.menuStack, submenu]}));
  };

  const canGoBack = () => {
    return state.component || (state.menuStack.length > 1);
  }

  const handleBack = () => {
    setState(prevState => {
      const menuStack = prevState.menuStack
      if (!prevState.component && menuStack.length > 1) {
        menuStack.pop()
      }
      return {...prevState, menuStack: menuStack, component: null}
    });
  };

  const addMessage = (message) => {
    setState(prevState => {
      const newEntries = prevState.entries.slice();
      newEntries.unshift({type: "message", key: newEntries.length, message: message});      
      return {...prevState, entries: newEntries};
    });
  };

  const onTransactionResponse = (transactionResponse) => {
    setState(prevState => {
      const newEntries = prevState.entries.slice();
      newEntries.unshift({type: "transaction", key: transactionResponse.hash, transactionResponse: transactionResponse});
      return {...prevState, entries: newEntries};
    });
  };

  const onTransactionReceipt = (transactionReceipt) => {
    setState(prevState => {
      const newEntries = prevState.entries.slice();
      const updateIndex = newEntries.findIndex((entry) => entry.key === transactionReceipt.transactionHash);
      if (updateIndex != -1) {
        const modified = newEntries[updateIndex];
        modified.transactionReceipt = transactionReceipt;
        newEntries[updateIndex] = modified;
      }
      return {...prevState, entries: newEntries};
    });
  };

  const logout = () => {
    setState(createInitialLoggedOutState());
  };

  const executeTransaction = (transactionRequest) => {
    if (!signer) {
      return Promise.reject("No signer");
    }

    return signer.sendTransaction(transactionRequest).then((transactionResponse) => {
      const transactionHash = transactionResponse.hash;
      setState(prevState => {
        const newContractCalls = prevState.contractCalls;
        newContractCalls[transactionHash] = true;
        return {...prevState, contractCalls: newContractCalls};
      });
      return transactionResponse.wait().then((receipt) => {
        if (receipt.status) {
          return receipt;
        } else {
          return Promise.reject("Transaction not successful.");
        }
      }).finally(() => {
        setState(prevState => {
          const newContractCalls = prevState.contractCalls;
          delete newContractCalls[transactionHash];
          return {...prevState, contractCalls: newContractCalls};
        });
      });
    }).catch((reason) => {
      addMessage("Error: " + JSON.stringify(reason));
    });
  };

  const watchAsset = () => {
    state.walletConnectProvider.send("wallet_watchAsset", {
      type: 'ERC20',
      options: {
        address: "",
        symbol: "LEOJ",
        decimals: 18,
        image: ""
      }
    });
  };

  const showToast = () => {
    setState(prevState => ({ ...prevState, toastVisible: true }));
    setTimeout(() => setState(prevState => ({ ...prevState, toastVisible: false })), 3000);
  };

  const isInFlightTransactions = Object.keys(state.contractCalls).length !== 0;
  const appStyles = false ? { pointerEvents: 'none', opacity: '0.5' } : {};
  const navOrApp = <>
    {(state.component && <div style={appStyles}><state.component blockNumber={state.blockNumber} /></div>) ||
    <NavMenu
      items={state.menuStack[state.menuStack.length - 1]}
      onSelectComponent={handleSelectComponent}
      onSelectSubmenu={handleSelectSubmenu} />}
  </>;

  const onboardingOrNavAndApp = <div className="main-content">
    {(!signer || !name) && <Onboarding setSigner={setSigner} setAddress={setAddress} setHouseWallet={setHouseWallet} setName={setName} /> || navOrApp}
  </div>

  const statusBar = signer && name ?
    <StatusBar
      logout={logout}
      loadingStatus={isInFlightTransactions ? Object.keys(state.contractCalls)[0].toString() : null}
      address={address || 'logged-out'}
      blockNumber={state.blockNumber}
      entries={state.entries} /> : null

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
      showToast: showToast
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
            {onboardingOrNavAndApp}
          </div>
        </div>
        {state.toastVisible && <Toast />}
      </div>
  </HyphenContext.Provider>);
};

export default hot(module)(Hyphen);
