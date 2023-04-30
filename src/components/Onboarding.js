import React, { useState, useEffect, useContext } from 'react';
import Cookies from 'js-cookie';
import Toast from './Toast';
import WalletConnectProvider from '@walletconnect/web3-provider';
import Blockies from 'react-blockies';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HyphenContext from './HyphenContext';
import YourEnsName from './YourEnsName';
import './Hyphen.css';
import './Onboarding.css';
const ethers = require("ethers");

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
  const provider = getProvider(configuration);
  const wallet =  new ethers.Wallet(privateKey, provider);
  return wallet;
};

const InviteCode = ({ configuration, goToUniquePassphrase }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    if (isValid) {
      goToUniquePassphrase();
    }
  }, [isValid]);

  const validateInviteCode = async () => {
    try {
      const wallet = new ethers.Wallet(inviteCode, getProvider(configuration));
      const balance = await wallet.getBalance();
      sessionStorage.setItem('inviteCode', inviteCode);
      setIsValid(ethers.utils.formatEther(balance) > 0);
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
    </div>
  );
};

const UniquePassphrase = ({ showToast, forgetFingerprint, configuration, setWallet }) => {
  const [passphrase, setPassphrase] = useState('');
  const [isInProgress, setIsInProgress] = useState(false);
  const [inviteCode, setInviteCode] = useState(sessionStorage.getItem('inviteCode'));

  const fingerprint = getFingerprint();
  const setupAccount = async () => {
    if (inviteCode) {
      setIsInProgress(true);
      const inviteWallet = new ethers.Wallet(inviteCode, getProvider(configuration));
      const userWallet = createDeterministicWallet(configuration, passphrase);

      const amount = await inviteWallet.getBalance();
      const gasLimit = 21000;
      const gasPrice = await inviteWallet.provider.getGasPrice();
      const amountMinusGas = amount.sub(gasPrice.mul(gasLimit))
      if (!amountMinusGas.gt(0)) {
        sessionStorage.removeItem('inviteCode');
        setInviteCode(null);
        alert('Invite code has already been used, sorry.');
        return;
      }

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
          sessionStorage.removeItem('inviteCode');
          setWallet(userWallet, configuration);
        } else {
          setIsInProgress(false);
          alert('Failed to set up your account. Please try again.');
        }
      } catch (error) {
        setIsInProgress(false);
        alert(`Error: ${error.message}`);
      }
    } else {
      setWallet(createDeterministicWallet(configuration, passphrase));
    }
  };

  const buttonText = inviteCode ? "Set up your account" : "Log in"

  return (
    <div>
      <h3>Enter unique passphrase</h3>
      {!isInProgress && (<>
        <p>
          Your account is accessed by a passphrase, that's tied to the fingerprint in your browser. You will only be able
          to access the account on a browser that has the fingerprint.
        </p>
        <input
          type="text"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.keyCode === 13 && passphrase) {
              setupAccount();
            }
          }}
          disabled={isInProgress}
          autoCapitalize="none"
        />
        {passphrase && (
          <button onClick={setupAccount} style={{marginBottom: '1em'}} >
            {buttonText}
          </button>
        )}
        <CopyToClipboard text={fingerprint} onCopy={showToast}>
          <div style={{display: 'flex', alignItems: 'center'}} >
            <Blockies seed={fingerprint} />
            <span style={{ marginLeft: '0.5rem' }}>Copy fingerprint</span>
          </div>
        </CopyToClipboard>
        <div>
          <button
            style={{
              backgroundColor: 'red',
              color: 'white',
              borderRadius: '4px',
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              border: 'none',
            }}
            onClick={forgetFingerprint}>
            Forget fingerprint
          </button>
        </div>
      </>
    )}

    {isInProgress && (
      <div>
        <div className="spinner" />
        <p>Setting up your account...</p>
      </div>
    )}
      
    </div>
  );
};

const ImportFingerprint = ({ showToast, goToLogin, configuration, setContext }) => {
  const [fingerprint, setFingerprint] = useState('');

  const importAccount = () => {
    Cookies.set('fingerprint', fingerprint);
    goToLogin()
  };

  return (
    <div>
      <h3>Import account fingerprint</h3>
      <input
        type="text"
        value={fingerprint}
        onChange={(e) => setFingerprint(e.target.value)}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && fingerprint) {
            importAccount();
          }
        }}
        placeholder="Enter fingerprint"
      />
      {fingerprint && (
        <button onClick={importAccount}>
          Import
        </button>
      )}
      {fingerprint && (
        <div>
          <p>Current input fingerprint:</p>
          <CopyToClipboard text={fingerprint} onCopy={showToast}>
            <span>
              <Blockies seed={fingerprint} />
              <span style={{ marginLeft: '0.5rem' }}>Click to copy</span>
            </span>
          </CopyToClipboard>
        </div>
      )}
    </div>
  );
};

const ClaimName = ({ setName }) => {
  return (
    <div>
      <h3>Claim your ENS name</h3>
      <YourEnsName onNameSet={setName} />
    </div>
  );
};


const Onboarding = ({ configuration, setContext }) => {

  const [toastVisible, setToastVisible] = useState(false);
  const [fingerprint, setFingerprint] = useState(Cookies.get('fingerprint'));
  const [wallet, setWallet] = useState(null);
  // const [balance, setBalance] = useState(null);
  const [[balance, name], setBalanceAndName] = useState([null, null]);
  const [step, setStep] = useState(() => {
    const fingerprintExists = !!Cookies.get('fingerprint');
    return fingerprintExists ? 'uniquePassphrase' : 'splash';
  });

  useEffect(() => {
    if (wallet != null) {
      wallet.getBalance()
        .then((balance) => {
          return wallet.provider
            .lookupAddress(wallet.address)
            .then((name) => {
              setBalanceAndName([balance, name])
            })
        })
    }
  }, [wallet])

  useEffect(() => {
    if (wallet && balance && balance.gt(0)) {
      const walletContext = {
        lookupAddress: ((address) => lookupAddress(wallet.provider, address)),
        getContract: ((address) => getContract(wallet, address)),
        configuration: configuration,
        houseWallet: createDeterministicWallet(configuration, ''),
        loginMethod: "DeterministicWallet",
        provider: wallet.provider,
        signer: wallet,
        address: wallet.address
      }
      if (name != null) {
        setContext({
          ...walletContext,
          "name": name
        });
      } else {
        setContext(walletContext);
        setStep("claimName");
      }
    }
  }, [balance, name]);

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const getContract = (signer, address) => {
    return new ethers.Contract(address, configuration.contracts[address], signer);
  };

  const lookupAddress = (provider, address) => {
    return provider.lookupAddress(address)
  };

  const forgetFingerprint = () => {
    if (window.confirm('Are you sure you want to forget this fingerprint?  Make sure you\'ve copied it to a safe place if you want to import it later.')) {
      Cookies.remove("fingerprint");
      setFingerprint(Cookies.get('fingerprint'));
      setStep('splash');
    }
  };

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
      {step !== 'splash' &&
        <div className="onboarding-content">
          {step === 'inviteCode' && <InviteCode configuration={configuration} goToUniquePassphrase={goToUniquePassphrase} />}
          {step === 'uniquePassphrase' && <UniquePassphrase showToast={showToast} forgetFingerprint={forgetFingerprint} configuration={configuration} setWallet={setWallet} />}
          {step === 'importFingerprint' && <ImportFingerprint showToast={showToast} goToLogin={goToUniquePassphrase} configuration={configuration} setContext={setContext} />}
          {step === 'claimName' && <ClaimName setName={(name) => setBalanceAndName([balance, name])} />}
        </div>
      }
      {toastVisible && <Toast />}
    </div>
  );
};

export default Onboarding;
