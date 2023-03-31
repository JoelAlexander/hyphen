import Cookies from "js-cookie";
import { hot } from 'react-hot-loader';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Splash from './Splash.js';
import Account from './Account.js';
import Recipes from './Recipes.js';
import RecipePreparation from './RecipePreparation.js';
import StatusBar from './StatusBar.js';
import Onboarding from './Onboarding';
import Faq from './Faq.js';
import Toast from './Toast';
const ethers = require("ethers");

import './Hyphen.css';

const Hyphen = ({ configuration, serviceWorkerRegistration }) => {

  const createInitialLoggedOutState = () => {

    return {
      context: {},
      app: null,
      entries: [],
      blockNumber: null,
      toastVisible: false,
      blockNumber: null
    };
  };

  const [state, setState] = useState(createInitialLoggedOutState());

  useEffect(() => {
    const blockNumberInterval = setInterval(() => {
      if (state.context.provider) {
        state.context.provider
          .getBlockNumber()
          .then((result) => {
            setState(prevState => ({ ...prevState, blockNumber: result }));
          });
      }
    }, 2000);

    return () => {
      clearInterval(blockNumberInterval);
    };
  }, [state.context]);

  const activateApp = (appName) => {
    setState(prevState => ({...prevState, app: appName}));
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
    if (!context) return;
    setState(prevState => {
      return {
        ...prevState,
        context: context,
        executeTransaction: executeTransaction,
        addMessage: addMessage,
        showToast: showToast}
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

  let app;
  if (state.app === "account") {
    app =
      <Account
        addMessage={addMessage}
        blockNumber={state.blockNumber} />;
  } else if (state.app === "recipes") {
    app =
      <Recipes
        addMessage={addMessage}
        blockNumber={state.blockNumber} />;
  } else if (state.app === "kitchen") {
    app = <RecipePreparation
        serviceWorkerRegistration={serviceWorkerRegistration}
        blockNumber={state.blockNumber}
        addMessage={addMessage} />;
  } else if (state.app === "faq") {
    app = <Faq />
  } else {
    app = <Splash />;
  }

  const showToast = () => {
    setState(prevState => ({ ...prevState, toastVisible: true }));
    setTimeout(() => setState(prevState => ({ ...prevState, toastVisible: false })), 3000);
  };

  const loggedInMenuItems = state.context && state.context.signer && (
    <>
      <button onClick={() => activateApp("recipes")}>Recipes</button>
      <button onClick={() => activateApp("kitchen")}>Kitchen</button>
      <button onClick={() => activateApp("account")}>Account</button>
    </>
  );

  return <HyphenContext.Provider value={state.context}>
    <div>
      <div style={{ display: 'inline-block', width: '100%' }}>
        { state.context ? <StatusBar
          logout={logout}
          address={state.context.address || 'logged-out'}
          blockNumber={state.blockNumber}
          entries={state.entries}
        /> : {}}
        <div className="pure-g" style={{ width: '100%', height: '100%' }}>
          <div
            className="pure-u-1-1"
            style={{
              height: '100%',
              marginLeft: '2em',
              marginRight: '2em',
            }}
          >
            {loggedInMenuItems}
            { state.context ? app : 
              <Onboarding configuration={configuration} setContext={setContext} />
            }
          </div>
        </div>
      </div>
      {state.toastVisible && <Toast />}
    </div>
  </HyphenContext.Provider>;
};

export default hot(module)(Hyphen);
