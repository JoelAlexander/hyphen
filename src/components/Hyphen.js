import Cookies from "js-cookie";
import { hot } from 'react-hot-loader';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { useState, useEffect, createContext, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Menu from './Menu.js';
import Splash from './Splash.js';
import Account from './Account.js';
import Recipes from './Recipes.js';
import RecipePreparation from './RecipePreparation.js';
import StatusBar from './StatusBar.js';
import Faq from './Faq.js';
const ethers = require("ethers");

const Hyphen = ({ configuration, serviceWorkerRegistration }) => {

  const createInitialLoggedOutState = () => {
    const houseWalletProvider =
      new ethers.providers.JsonRpcProvider(
          { url: configuration.url},
          { name: "home",
            chainId: configuration.chainId,
            ensAddress: configuration.ens });
    houseWalletProvider.pollingInterval = 2000;

    const houseWallet = new ethers.Wallet(
            configuration.houseWallet,
            houseWalletProvider);

    return {
      context: {},
      app: null,
      entries: [],
      houseWallet: houseWallet,
      blockNumber: null
    };
  };

  const [state, setState] = useState(createInitialLoggedOutState());
  const [blockNumber, setBlockNumber] = useState(null);

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
  }, [state.context.provider]);

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

  const makeContext = (loginMethod, provider, signer, address) => {
    return {
      "configuration": configuration,
      "loginMethod": loginMethod,
      "provider": provider,
      "signer": signer,
      "address": address,
      "houseWallet": state.houseWallet,
      executeTransaction: executeTransaction,
      addMessage: addMessage
    };
  };

  const loginWithHouseWallet = () => {
    setState(prevState => ({...prevState, 
      context:
        makeContext(
          "HouseAccount",
          state.houseWallet.provider,
          state.houseWallet,
          state.houseWallet.address)
    }));
  };

  const getFingerprint = () => {
    let fingerprint = Cookies.get("fingerprint");
    if (!fingerprint) {
      fingerprint = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      Cookies.set("fingerprint", fingerprint);
    }
    return fingerprint;
  }

  const createDeterministicWallet = (userString) => {
    const fingerprint = getFingerprint();
    const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(fingerprint + userString));
    const provider = new ethers.providers.JsonRpcProvider(
      { url: configuration.url },
      { name: "home", chainId: configuration.chainId, ensAddress: configuration.ens }
    );
    provider.pollingInterval = 2000;
    return new ethers.Wallet(privateKey, provider);
  };

  const loginWithDeterministicWallet = (userString) => {
    const wallet = createDeterministicWallet(userString);
    setState(prevState => ({...prevState, 
      context: makeContext(
        "DeterministicWallet",
        wallet.provider,
        wallet,
        wallet.address)
    }));
  };

  const logout = () => {
    if (state.loginMethod === "WalletConnect" && state.context.provider) {
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

  const loginWithWalletConnect = () => {

    const chainId = configuration.chainId

    var rpc = {}
    rpc[chainId] = configuration.url

    const walletConnectProvider = new WalletConnectProvider({
      chainId: chainId,
      rpc: rpc,
      network: "home",
      qrcode: true,
      qrcodeModalOptions: {
        mobileLinks: [
          "metamask"
        ]
      },
      pollingInterval: 2000
    });
    walletConnectProvider.networkId = chainId;

    const provider =
      new ethers.providers.Web3Provider(
        walletConnectProvider,
        { name: "home", chainId: chainId, ensAddress: configuration.ens });
    provider.pollingInterval = 2000;

    const handleAccountsChanged = (accounts) => {
      const signer = provider.getSigner()
      signer.getAddress().then((address) => {
        setState(prevState => ({...prevState, 
          context:
            makeContext(
              "WalletConnect",
              provider,
              signer,
              address)
        }));
      });
    };

    walletConnectProvider.on("accountsChanged", handleAccountsChanged);
    walletConnectProvider.on("chainChanged", handleAccountsChanged);
    walletConnectProvider.on("disconnect", () => { setState(createInitialLoggedOutState()); });
    walletConnectProvider.enable()
      .then(
        value => {
          addMessage("WalletConnect suceeded: " + JSON.stringify(value));
        },
        reason => {
          addMessage("Enable failed: " + JSON.stringify(reason));
          setState(createInitialLoggedOutState());
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

  return <HyphenContext.Provider value={state.context}>
    <div>
      <Menu
        loginWithWalletConnect={loginWithWalletConnect}
        loginWithHouseWallet={loginWithHouseWallet}
        promptForUserString={promptForUserString}
        logout={logout}
        activateApp={activateApp} />
      <div style={{display: "inline-block", width: "100%"}}>
        <StatusBar
          address={state.context.address || 'logged-out'}
          blockNumber={state.blockNumber}
          entries={state.entries} />
        <div className="pure-g" style={{width: "100%", height: "100%"}}>
          <div
            className="pure-u-1-1"
            style={{
              height: "100%",
              marginLeft: "2em",
              marginRight: "2em"
            }}>
            {app}
          </div>
        </div>
      </div>
    </div>
  </HyphenContext.Provider>;
};

export default hot(module)(Hyphen);
