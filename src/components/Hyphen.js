import { hot } from 'react-hot-loader';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React from 'react';
import HyphenContext from './HyphenContext';
import SessionFeed from './SessionFeed.js';
import Menu from './Menu.js';
import Splash from './Splash.js';
import Table from './Table.js';
import Recipes from './Recipes.js';
import RecipePreparation from './RecipePreparation.js';
import StatusBar from './StatusBar.js';
import Faq from './Faq.js';
import Names from './Names.js';

const ethers = require("ethers");

class Hyphen extends React.Component {

  constructor(props) {
    super(props);
    this.state = this.createInitialLoggedOutState();
  }

  componentDidMount() {
    this.blockNumberInterval =
      setInterval(() => {
        if (this.state.context.provider) {
          this.state.context.provider.getBlockNumber()
              .then((result) => {
                this.setState({
                  blockNumber: result
                });
              });
          }
        }, 2000);
  }

  componentWillUnmount() {
    clearInterval(this.blockNumberInterval);
  }

  createInitialLoggedOutState = () => {

    const houseWalletProvider =
      new ethers.providers.JsonRpcProvider(
          { url: this.props.configuration.blockchainUrl},
          { name: "home",
            chainId: this.props.configuration.chainId,
            ensAddress: this.props.configuration.ensAddress });
    houseWalletProvider.pollingInterval = 2000;

    const houseWallet = new ethers.Wallet(
            this.props.configuration.houseWalletPrivateKey,
            houseWalletProvider);

    return {
      context: {},
      app: null,
      entries: [],
      houseWallet: houseWallet
    };
  };

  activateApp = (appName) => {
    this.setState({app: appName});
  };

  addMessage = (message) => {
    const newEntries = this.state.entries.slice();
    newEntries.unshift({type: "message", key: newEntries.length, message: message});
    this.setState({entries: newEntries});
  };

  onTransactionResponse = (transactionResponse) => {
    const newEntries = this.state.entries.slice();
    newEntries.unshift({type: "transaction", key: transactionResponse.hash, transactionResponse: transactionResponse});
    this.setState({entries: newEntries});
  };

  onTransactionReceipt = (transactionReceipt) => {
    const newEntries = this.state.entries.slice();
    const updateIndex = newEntries.findIndex((entry) => entry.key === transactionReceipt.transactionHash);
    if (updateIndex != -1) {
      const modified = newEntries[updateIndex];
      modified.transactionReceipt = transactionReceipt;
      newEntries[updateIndex] = modified;
    }
    this.setState({entries: newEntries});
  };

  makeContext = (loginMethod, provider, signer, address) => {
    return {
      // Global static state
      "configuration": this.props.configuration,

      // Account state
      "loginMethod": loginMethod,
      "provider": provider,
      "signer": signer,
      "address": address,

      // Built-ins
      "houseWallet": this.state.houseWallet,

      // Methods
      executeTransaction: this.executeTransaction
    };
  };

  loginWithWalletConnect = () => {

    const chainId = this.props.configuration.chainId

    var rpc = {}
    rpc[chainId] = this.props.configuration.blockchainUrl

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
        { name: "home", chainId: chainId, ensAddress: this.props.configuration.ensAddress });
    provider.pollingInterval = 2000;

    const handleAccountsChanged = (accounts) => {
      provider.getSigner().getAddress().then((address) => {
        this.setState({
          context:
            this.makeContext(
              "WalletConnect",
              provider,
              signer,
              address)
        });
      });
    };

    walletConnectProvider.on("accountsChanged", handleAccountsChanged);
    walletConnectProvider.on("chainChanged", handleAccountsChanged);
    walletConnectProvider.on("disconnect", () => { this.setState(this.createInitialLoggedOutState()); });
    walletConnectProvider.enable()
      .then(
        value => {
          this.addMessage("WalletConnect suceeded: " + JSON.stringify(value));
        },
        reason => {
          this.addMessage("Enable failed: " + JSON.stringify(reason));
          this.setState(this.createInitialLoggedOutState());
    });
  };

  loginWithHouseWallet = () => {
    this.setState({
      context:
        this.makeContext(
          "HouseAccount",
          this.state.houseWallet.provider,
          this.state.houseWallet,
          this.state.houseWallet.address)
    });
  };

  disconnectWallet = () => {
    this.setState(this.createInitialLoggedOutState());
    if (this.state.loginMethod === "WalletConnect" && this.state.context.provider) {
      this.state.context.provider.provider.disconnect();
    }
  };

  clearFeed = () => {
    this.setState({
      entries: []
    });
  };

  executeTransaction = (transactionResultPromise, onSuccess, onError) => {
    transactionResultPromise.then((transactionResponse) => {
      this.onTransactionResponse(transactionResponse);
      transactionResponse.wait().then((receipt) => {
        this.onTransactionReceipt(receipt);
        if (receipt.status) {
          onSuccess(receipt);
        } else {
          onError("Transaction not successful.");
        }
      });
    }, (error) => {
      this.addMessage("Error: " + JSON.stringify(error));
      onError(error);
    });
  };

  watchAsset = () => {
    this.state.walletConnectProvider.send("wallet_watchAsset", {
      type: 'ERC20',
      options: {
        address: "",
        symbol: "LEOJ",
        decimals: 18,
        image: ""
      }
    });
  };

  render() {

    let app;
    if (this.state.app === "account") {
      app =
        <Table
          addMessage={this.addMessage}
          blockNumber={this.state.blockNumber} />;
    } else if (this.state.app === "recipes") {
      app =
        <Recipes
          addMessage={this.addMessage}
          blockNumber={this.state.blockNumber} />;
    } else if (this.state.app === "kitchen") {
      app =
        <RecipePreparation
          serviceWorkerRegistration={this.props.serviceWorkerRegistration}
          blockNumber={this.state.blockNumber}
          addMessage={this.addMessage} />;
    } else if (this.state.app === "ens") {
      app = <Names
          houseWallet={this.state.houseWallet}
          addMessage={this.addMessage} />
    } else if (this.state.app === "faq") {
      app =
        <Faq />
    } else {
      app = <Splash />;
    }

    return <HyphenContext.Provider value={this.state.context}>
      <div>
        <Menu
          loginWithWalletConnect={this.loginWithWalletConnect}
          loginWithHouseWallet={this.loginWithHouseWallet}
          logout={this.disconnectWallet}
          activateApp={this.activateApp} />
        <div style={{display: "inline-block", width: "100%"}}>
          <StatusBar
            blockNumber={this.state.blockNumber}
            entries={this.state.entries}
            clearFeed={() => {}} />
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
  }
}

export default hot(module)(Hyphen);
