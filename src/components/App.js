import { hot } from 'react-hot-loader';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React from 'react';
import SessionFeed from './SessionFeed.js';
import Faucet from './Faucet.js';
import Menu from './Menu.js';
import Splash from './Splash.js';
import Table from './Table.js';
import Recipes from './Recipes.js';
import RecipePreparation from './RecipePreparation.js';
import StatusBar from './StatusBar.js';
import Faq from './Faq.js';
import Names from './Names.js';

const ethers = require("ethers");
const ensAddress = "0x16395447324D7e75d8cdeec1DBd1FaDC0A8E7Fc4";
const houseWalletProvider =
  new ethers.providers.JsonRpcProvider(
      { url: 'https://crypto.joelalexander.me'},
      { name: 'home', chainId: 5904, ensAddress: ensAddress });
houseWalletProvider.pollingInterval = 2000;
const houseWallet = new ethers.Wallet(
        "0xd89a25235e8ed445265fdb7d3a878abf1c7d701f628191ac62dffa8e914f6868",
        houseWalletProvider);

class Hyphen extends React.Component {

  constructor(props) {
    super(props);
    this.state = this.createInitialLoggedOutState();
  }

  componentDidMount() {
    this.blockNumberInterval =
      setInterval(() => {
        if (this.state.provider) {
          this.state.provider.getBlockNumber()
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
    return {
      loginMethod: null,
      provider: null,
      signer: null,
      address: null,
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

  getGasPrice = () => {
    this.state.provider.getGasPrice()
      .then((price) => { this.addMessage(price); });
  };

  loginWithWalletConnect = () => {

    const walletConnectProvider = new WalletConnectProvider({
      chainId: 5904,
      rpc: {
        5904: "https://crypto.joelalexander.me"
      },
      network: "home",
      qrcode: true,
      qrcodeModalOptions: {
        mobileLinks: [
          "metamask"
        ]
      },
      pollingInterval: 2000
    });
    walletConnectProvider.networkId = 5904;

    const provider =
      new ethers.providers.Web3Provider(
        walletConnectProvider,
        { name: "home", chainId: 5904, ensAddress: ensAddress });

    provider.pollingInterval = 2000;

    const handleAccountsChanged = (accounts) => {
      this.addMessage("Using account: " + accounts[0]);
      const signer = provider.getSigner();
      this.setState({
        "loginMethod": "WalletConnect",
        "provider": provider,
        "signer": signer,
        "address": null
      });
      signer.getAddress().then((address) => {
        this.setState({ "address": address});
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
      "loginMethod": "HouseAccount",
      "provider": houseWalletProvider,
      "signer": this.state.houseWallet,
      "address": this.state.houseWallet.address
    });
  };

  disconnectWallet = () => {
    if (this.state.loginMethod === "WalletConnect" && this.state.provider) {
      this.state.provider.provider.disconnect();
    }
    this.setState(this.createInitialLoggedOutState());
  };

  clearFeed = () => {
    this.setState({ 
      entries: []
    });
  };

  getSigner = () => {
    return this.state.signer;
  };

  accessDeployedContract = (address, abi) => {
    return new ethers.Contract(
        address,
        abi,
        this.getSigner());
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
    if (this.state.app === "faucet") {
      app =
        <Faucet
          address={this.state.address}
          accessDeployedContract={this.accessDeployedContract}
          executeTransaction={this.executeTransaction}
          addMessage={this.addMessage} />;
    } else if (this.state.app === "table") {
      app =
        <Table
          provider={this.state.provider}
          signer={this.state.signer}
          executeTransaction={this.executeTransaction}
          addMessage={this.addMessage} />;
    } else if (this.state.app === "recipes") {
      app =
        <Recipes
          provider={this.state.provider}
          contractAddress="0x12c881C1a099FA31400fCe0fba10553B134679C5"
          measuresSetAddress="0x9679BAF3E60479a31095AC6134C54b7F54b6ce4C"
          accessDeployedContract={this.accessDeployedContract}
          executeTransaction={this.executeTransaction}
          addMessage={this.addMessage}
          blockNumber={this.state.blockNumber} />;
    } else if (this.state.app === "kitchen") {
      app =
        <RecipePreparation
          serviceWorkerRegistration={this.props.serviceWorkerRegistration}
          blockNumber={this.state.blockNumber}
          addMessage={this.addMessage}
          provider={this.state.provider}
          accessDeployedContract={this.accessDeployedContract}
          executeTransaction={this.executeTransaction} />;
    } else if (this.state.app === "ens") {
      app = <Names
          houseWallet={this.state.houseWallet}
          address={this.state.address}
          provider={this.state.provider}
          addMessage={this.addMessage}
          executeTransaction={this.executeTransaction}
          accessDeployedContract={this.accessDeployedContract} />
    } else if (this.state.app === "faq") {
      app =
        <Faq />
    } else {
      app = <Splash loggedIn={this.state.signer !== null} />;
    }

    var topContent;
    if (this.state.signer) {
      topContent = <StatusBar
        provider={this.state.provider}
        signer={this.state.signer}
        blockNumber={this.state.blockNumber} />;
    } else {
      topContent = null;
    }

    return <div style={{display: "flex", height: "100%"}}>
      <Menu
        loggedIn={this.state.signer !== null}
        loginWithWalletConnect={this.loginWithWalletConnect}
        loginWithHouseWallet={this.loginWithHouseWallet}
        logout={this.disconnectWallet}
        activateApp={this.activateApp} />
      <div style={{display: "inline-block", width: "100%"}}>
        {topContent}
        <div className="pure-g" style={{width: "100%", height: "100%"}}>
          <div className="pure-g pure-u-4-5" style={{height: "100%"}}>
            <div className="pure-u-1-1">{app}</div>
          </div>
          <div className="pure-u-1-5">
            <SessionFeed entries={this.state.entries} clearFeed={this.clearFeed} />
          </div>
        </div>
      </div>
    </div>;
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return <Hyphen serviceWorkerRegistration={this.props.serviceWorkerRegistration} />;
  }
} 

export default hot(module)(App);
