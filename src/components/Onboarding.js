import React from 'react';
import Cookies from 'js-cookie';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import './Onboarding.css';

const Onboarding = ({ configuration, setContext }) => {

  const houseWalletProvider =
    new ethers.providers.JsonRpcProvider(
      { url: configuration.url},
      { name: "home",
        chainId: configuration.chainId,
        ensAddress: configuration.ens });

    houseWalletProvider.pollingInterval = 12000;
  const houseWallet = new ethers.Wallet(
    configuration.houseWallet,
    houseWalletProvider);

  const context = {
  	"configuration": configuration,
  	"houseWallet": houseWallet
  }

  const loginWithHouseWallet = () => {
  	setContext({
  		...context,
      "loginMethod": "HouseAccount",
      "provider": houseWallet.provider,
      "signer": houseWallet,
      "address": houseWallet.address
    });
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
    setContext({
      ...context,
      "loginMethod": "DeterministicWallet",
      "provider": wallet.provider,
      "signer": wallet,
      "address": wallet.address
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
      setContext({
      	...context,
      	"loginMethod": "WalletConnect",
      	"provider": provider,
      	"signer": signer,
      	"address": signer.address
    	});
    };

    walletConnectProvider.on("accountsChanged", handleAccountsChanged);
    walletConnectProvider.on("chainChanged", handleAccountsChanged);
    walletConnectProvider.on("disconnect", () => { setState(createInitialLoggedOutState()); });
    walletConnectProvider.enable();
  };

  const promptForUserString = () => {
    const userString = prompt("Enter your user string:");
    if (userString) {
      loginWithDeterministicWallet(userString);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="tiles-container">
        <div className="tile" onClick={() => loginWithHouseWallet()}>
          <span role="img" aria-label="house">
            🏠
          </span>
          <p>Use house account</p>
        </div>
        <div className="tile" onClick={() => loginWithWalletConnect()}>
          <span role="img" aria-label="connect">
            🔗
          </span>
          <p>Connect wallet</p>
        </div>
      </div>
      <div className="tiles-container">
        <div className="tile" onClick={() => promptForUserString()}>
          <span role="img" aria-label="user">
            📝
          </span>
          <p>Login with user string</p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
