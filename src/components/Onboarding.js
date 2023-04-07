import React, { useState } from 'react';
import Cookies from 'js-cookie';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import './Onboarding.css';

const getProvider = (configuration) => {
  const provider = new ethers.providers.JsonRpcProvider(
    { url: configuration.url },
    { name: "home", chainId: configuration.chainId, ensAddress: configuration.ens }
  );
  provider.polling = false;
  return provider;
}

const getFingerprint = () => {
  let fingerprint = Cookies.get("fingerprint");
  if (!fingerprint) {
    fingerprint = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    Cookies.set("fingerprint", fingerprint);
  }
  return fingerprint;
}

const createDeterministicWallet = (configuration, userString) => {
  const fingerprint = getFingerprint();
  const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(fingerprint + userString));
  return new ethers.Wallet(privateKey, getProvider(configuration));
};

const InviteCode = ({ configuration, goToUniquePassphrase }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isValid, setIsValid] = useState(null);

  const validateInviteCode = async () => {
    try {
      const wallet = new ethers.Wallet(inviteCode, getProvider(configuration));
      const balance = await wallet.getBalance();
      setIsValid(ethers.utils.formatEther(balance) > 0);
      sessionStorage.setItem('inviteCode', inviteCode);
    } catch (error) {
      setIsValid(false);
    }
  };

  return (
    <div>
      <h3>Enter your invite code</h3>
      <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
      <button onClick={validateInviteCode}>Validate</button>
      {isValid === false && <p>Not a valid invite code.</p>}
      {isValid === true && <button onClick={goToUniquePassphrase}>Get Started</button>}
    </div>
  );
};

const UniquePassphrase = ({ configuration, loginWithWallet }) => {
  const [passphrase, setPassphrase] = useState('');
  const [isInProgress, setIsInProgress] = useState(false);

  const setupAccount = async () => {
    const inviteCode = sessionStorage.getItem('inviteCode');
    if (inviteCode) {
      setIsInProgress(true);
      const inviteWallet = new ethers.Wallet(inviteCode, getProvider(configuration));
      const userWallet = createDeterministicWallet(configuration, passphrase);

      const amount = await inviteWallet.getBalance();
      const gasLimit = 21000;
      const gasPrice = await inviteWallet.provider.getGasPrice();
      const amountMinusGas = amount.sub(gasPrice.mul(gasLimit))
      try {
        const transaction = await inviteWallet.sendTransaction({
          to: userWallet.address,
          value: amountMinusGas,
          gasLimit: gasLimit,
          gasPrice: gasPrice,
          type: 0x0,
        });

        const receipt = await transaction.wait();
        if (receipt.status === 1) {
          loginWithWallet(userWallet, configuration);
        } else {
          setIsInProgress(false);
          alert('Failed to set up your account. Please try again.');
        }
      } catch (error) {
        setIsInProgress(false);
        alert(`Error: ${error.message}`);
      }
    } else {
      const userWallet = createDeterministicWallet(configuration, passphrase);
      loginWithWallet(userWallet, configuration);
    }
  };

  return (
    <div>
      <h3>Enter unique passphrase</h3>
      <p>
        Your account is accessed by a passphrase, that's tied to the fingerprint in your browser. You will only be able
        to access the account on a browser that has the fingerprint. You can forget, export, and import fingerprints.
      </p>
      <input
        type="text"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        disabled={isInProgress}
      />
      {passphrase && (
        <button onClick={setupAccount} disabled={isInProgress}>
          Set up account
        </button>
      )}
      {isInProgress && <p>Setting up your account...</p>}
    </div>
  );
};

const ImportFingerprint = ({ configuration, setContext }) => {
  const [fingerprint, setFingerprint] = useState('');

  const importAccount = () => {
    Cookies.set('fingerprint', fingerprint);
    const wallet = createDeterministicWallet(fingerprint);
    setContext({
      ...createContext(wallet, configuration),
      loginMethod: 'FingerprintImport',
    });
  };

  return (
    <div>
      <h3>Import account fingerprint</h3>
      <input
        type="text"
        value={fingerprint}
        onChange={(e) => setFingerprint(e.target.value)}
        placeholder="Enter fingerprint"
      />
      {fingerprint && (
        <button onClick={importAccount}>
          Import
        </button>
      )}
    </div>
  );
};


const Onboarding = ({ configuration, setContext }) => {

  const loginWithWallet = (wallet) => {
    setContext({
      configuration: configuration,
      "houseWallet": createDeterministicWallet(configuration, ''),
      "loginMethod": "DeterministicWallet",
      "provider": wallet.provider,
      "signer": wallet,
      "address": wallet.address
    });
  };

  const [step, setStep] = useState('splash');

  const goToInviteCode = () => setStep('inviteCode');
  const goToImportFingerprint = () => setStep('importFingerprint');
  const goToUniquePassphrase = () => setStep('uniquePassphrase');

  return (
    <div className="onboarding-container">
      {step === 'splash' && (
        <div className="onboarding-content">
          <h1>Welcome to the Site</h1>
          <button onClick={goToInviteCode}>🎟️ I have an invite code</button>
          <button onClick={goToImportFingerprint}>🔑 Import account fingerprint</button>
          <button onClick={goToUniquePassphrase}>➡️ Continue without an invite code</button>
        </div>
      )}
      <div className="onboarding-content">
        {step === 'inviteCode' && <InviteCode configuration={configuration} goToUniquePassphrase={goToUniquePassphrase} />}
        {step === 'uniquePassphrase' && <UniquePassphrase configuration={configuration} loginWithWallet={loginWithWallet} />}
        {step === 'importFingerprint' && <ImportFingerprint configuration={configuration} setContext={setContext} />}
      </div>
    </div>
  );
};

export default Onboarding;
