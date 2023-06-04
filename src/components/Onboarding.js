import React, { useState, useEffect, useContext } from 'react';
import { openDB } from 'idb';
import Toast from './Toast';
import WalletConnectProvider from '@walletconnect/web3-provider';
import Blockies from 'react-blockies';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HyphenContext from './HyphenContext';
import YourEnsName from './YourEnsName';
import './Hyphen.css';
import './Onboarding.css';
const ethers = require("ethers");

const InviteCode = ({ setValidInviteCode }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isValid, setIsValid] = useState(null);
  const context = useContext(HyphenContext);

  useEffect(() => {
    let wallet;
    try {
      wallet = new ethers.Wallet(inviteCode, context.provider);
    } catch {
      wallet = null;
    }
    if (wallet) {
      wallet.getBalance().then((balance) => {
        if (ethers.utils.formatEther(balance) > 0) {
          setIsValid(true);
          setValidInviteCode(inviteCode);
        } else {
          setIsValid(false);
        }
      });
    }
  }, [inviteCode])

  return (
    <div>
      <h3>Enter your invite code</h3>
      <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
      {isValid === false && <p>Not a valid invite code.</p>}
    </div>
  );
};

const UniquePassphrase = ({ fingerprint, forgetFingerprint, inviteCode, createWallet, setWallet }) => {
  const [passphrase, setPassphrase] = useState('');
  const [isInProgress, setIsInProgress] = useState(false);
  const context = useContext(HyphenContext);

  const setupAccount = async () => {
    if (inviteCode) {
      setIsInProgress(true);
      const inviteWallet = new ethers.Wallet(inviteCode, context.provider);
      const userWallet = createWallet(passphrase);

      const amount = await inviteWallet.getBalance();
      const gasLimit = 21000;
      const gasPrice = await inviteWallet.provider.getGasPrice();
      const amountMinusGas = amount.sub(gasPrice.mul(gasLimit))
      if (!amountMinusGas.gt(0)) {
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
          setWallet(userWallet);
        } else {
          setIsInProgress(false);
          alert('Failed to set up your account. Please try again.');
        }
      } catch (error) {
        setIsInProgress(false);
        alert(`Error: ${error.message}`);
      }
    } else {
      setWallet(createWallet(passphrase));
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
        {fingerprint && (<CopyToClipboard text={fingerprint} onCopy={context.showToast}>
          <div style={{display: 'flex', alignItems: 'center'}} >
            <Blockies seed={fingerprint} />
            <span style={{ marginLeft: '0.5rem' }}>Copy fingerprint</span>
          </div>
        </CopyToClipboard>)}
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

const ImportFingerprint = ({ setFingerprint }) => {
  const [currentFingerprint, setCurrentFingerprint] = useState('');
  const context = useContext(HyphenContext);

  const confirmFingerprint = () => {
    setFingerprint(currentFingerprint);
  }

  return (
    <div>
      <h3>Import account fingerprint</h3>
      <input
        type="text"
        value={currentFingerprint}
        onChange={(e) => setCurrentFingerprint(e.target.value)}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && currentFingerprint) {
            confirmFingerprint();
          }
        }}
        placeholder="Enter fingerprint"
      />
      {currentFingerprint && (
        <button onClick={confirmFingerprint}>
          Import
        </button>
      )}
      {currentFingerprint && (
        <div>
          <p>Current input fingerprint:</p>
          <CopyToClipboard text={currentFingerprint} onCopy={context.showToast}>
            <span>
              <Blockies seed={currentFingerprint} />
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
      <h3>Claim your name</h3>
      <YourEnsName onNameSet={setName} />
    </div>
  );
};

const Onboarding = ({ setSigner, setAddress, setName, setHouseWallet }) => {

  const [fingerprint, setFingerprint] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [[balance, name], setBalanceAndName] = useState([null, null]);
  const [step, setStep] = useState('splash');
  const context = useContext(HyphenContext);

  const createWallet = (userString) => {
    const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(fingerprint + userString));
    return new ethers.Wallet(privateKey, context.provider);
  };

  useEffect(() => {
    openDB('Hyphen', 1, {
      upgrade(db) {
        db.createObjectStore('fingerprint');
      }
    }).then(db => {
      return db.get('fingerprint', 'key');
    }).then(fp => {
      setFingerprint(fp);
    });
  }, []);

  useEffect(() => {
    if (inviteCode) {
      openDB('Hyphen', 1).then(db => {
        return db.get('fingerprint', 'key').then(existingFingerprint => {
          if (!existingFingerprint) {
            const randomBytes = ethers.utils.randomBytes(16);
            const newFingerprint = ethers.utils.hexlify(randomBytes);
            db.put('fingerprint', newFingerprint, 'key').then(() => {
              setFingerprint(newFingerprint);
            });
          }
        });
      });
    }    
  }, [inviteCode]);

  useEffect(() => {
    if (fingerprint === undefined) {
      openDB('Hyphen', 1).then((db) => {
        return db.delete('fingerprint', 'key');
      }).then(() => {
        setFingerprint(null);
        setStep('splash');
      });
    } else if (fingerprint !== null) {
      openDB('Hyphen', 1).then((db) => {
        return db.put('fingerprint', fingerprint, 'key');
      }).then(() => {
        setStep('uniquePassphrase');
      });
    }
  }, [fingerprint]);

  useEffect(() => {
    if (wallet !== null) {
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
      setSigner(wallet);
      setAddress(wallet.address);
      setName(name);
      setHouseWallet(createWallet(''));
      setStep("claimName");
    }
  }, [balance, name]);

  const confirmForgetFingerprint = () => {
    if (window.confirm('Are you sure you want to forget this fingerprint?  Make sure you\'ve copied it to a safe place if you want to import it later.')) {
      setFingerprint(undefined);
    }
  };

  const goToInviteCode = () => setStep('inviteCode');
  const goToImportFingerprint = () => setStep('importFingerprint');
  const setInviteCode2 = (inviteCode2) => setInviteCode(inviteCode2);

  return (
    <div className="onboarding-container">
      {step === 'splash' && (
        <div className="onboarding-content">
          <h1>Welcome to the Site</h1>
          <button onClick={goToInviteCode}>🎟️ I have an invite code</button>
          <button onClick={goToImportFingerprint}>🔑 Import account fingerprint</button>
        </div>
      )}
      {step !== 'splash' &&
        <div className="onboarding-content">
          {step === 'inviteCode' && <InviteCode setValidInviteCode={setInviteCode} />}
          {step === 'uniquePassphrase' && <UniquePassphrase fingerprint={fingerprint} forgetFingerprint={confirmForgetFingerprint} inviteCode={inviteCode} createWallet={createWallet} setWallet={setWallet} />}
          {step === 'importFingerprint' && <ImportFingerprint setFingerprint={setFingerprint} />}
          {step === 'claimName' && <ClaimName setName={(name) => setBalanceAndName([balance, name])} />}
        </div>
      }
      {toastVisible && <Toast />}
    </div>
  );
};

export default Onboarding;
