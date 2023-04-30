import Cookies from "js-cookie";
import { hot } from 'react-hot-loader';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Splash from './Splash.js';
import Account from './Account.js';
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

const Hyphen = ({ configuration }) => {

  const createInitialLoggedOutState = () => {

    return {
      context: {},
      menuStack: [menuItems],
      activeComponent: null,
      entries: [],
      blockNumber: null,
      toastVisible: false,
      blockNumber: null,
      menu: [],
      menuHistory: [],
      transactionStatus: null
    };
  };

  const [state, setState] = useState(createInitialLoggedOutState());

  useEffect(() => {
    const blockNumberInterval = setInterval(() => {
      if (state.context && state.context.provider) {
        state.context.provider
          .getBlockNumber()
          .then((result) => {
            console.log(`blockNumber update ${performance.now()}`)
            setState(prevState => ({ ...prevState, blockNumber: result }));
          });
      }
    }, 12000);

    return () => {
      clearInterval(blockNumberInterval);
    };
  }, [state.context]);

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

  const setContext = (context) => {
    setState(prevState => {
      return {
        ...prevState,
        context: {
          executeTransaction: executeTransaction,
          executeTransaction2: executeTransaction2,
          addMessage: addMessage,
          showToast: showToast,
          ...context
        }
      };
    });
  }

  const logout = () => {
    if (state.loginMethod === "WalletConnect" &&
      state.context && state.context.provider
    ) {
      state.context.provider.provider.disconnect();
    }
    setState(createInitialLoggedOutState());
  };

  const promptForUserString = () => {
    const userString = prompt("Enter your user string:");
    if (userString) {
      loginWithDeterministicWallet(userString);
    }
  };

  const executeTransaction = (transactionResultPromise, onSuccess, onError) => {
    transactionResultPromise.then((transactionResponse) => {
      onTransactionResponse(transactionResponse);
      transactionResponse.wait().then((receipt) => {
        onTransactionReceipt(receipt);
        if (receipt.status) {
          onSuccess(receipt);
        } else {
          onError("Transaction not successful.");
        }
      });
    }, (error) => {
      addMessage("Error: " + JSON.stringify(error));
      onError(error);
    });
  };

  const executeTransaction2 = (transactionResultPromise) => {
    return transactionResultPromise.then((transactionResponse) => {
      onTransactionResponse(transactionResponse);
      return transactionResponse.wait().then((receipt) => {
        onTransactionReceipt(receipt);
        if (receipt.status) {
          return receipt;
        } else {
          return Promise.reject("Transaction not successful.");
        }
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

  const navOrApp = <>
    {(state.component && <state.component blockNumber={state.blockNumber} />) ||
    <NavMenu
      items={state.menuStack[state.menuStack.length - 1]}
      onSelectComponent={handleSelectComponent}
      onSelectSubmenu={handleSelectSubmenu} />}
  </>;

  const onboardingOrNavAndApp = <div className="main-content">
    {(!state.context.signer || !state.context.name) && <Onboarding configuration={configuration} setContext={setContext} /> || navOrApp}
  </div>

  const statusBar = state.context.signer && state.context.name ?
    <StatusBar
      logout={logout}
      address={state.context.address || 'logged-out'}
      blockNumber={state.blockNumber}
      entries={state.entries} /> : null

  return (
    <HyphenContext.Provider value={state.context}>
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
