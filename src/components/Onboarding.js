import React, { useState, useEffect, useContext } from 'react';
import {Outlet, RouterProvider, Route, Navigate, Link, createBrowserRouter, createHashRouter, createRoutesFromElements, useLocation, useNavigate, useParams } from 'react-router-dom'
import { openDB } from 'idb';
import Toast from './Toast';
import Blockies from 'react-blockies';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HyphenContext from '../context/HyphenContext';
import YourEnsName from './YourEnsName';
import './Hyphen.css';
import './Onboarding.css';
import { invalid } from 'moment';
const ethers = require("ethers");

const UniquePassphrase = ({ setSignerAndAddress, invalidWallet, invalidInviteCode, fingerprint, forgetFingerprint, inviteCode }) => {
  const [passphrase, setPassphrase] = useState('')
  const [isInProgress, setIsInProgress] = useState(false)
  const [showForgetButton, setShowForgetButton] = useState(false)
  const context = useContext(HyphenContext)
  let holdTimer;

  const createWallet = (userString) => {
    const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(fingerprint + userString));
    return new ethers.Wallet(privateKey, context.provider);
  }

  const handleMouseDown = () => {
    holdTimer = setTimeout(() => {
      setShowForgetButton(!showForgetButton);
    }, 2000)
  }

  const handleMouseUp = () => {
    clearTimeout(holdTimer)
  }

  const onPassphraseChange = (e) => {
    setPassphrase()
  }

  const setupAccount = async (event) => {
    event.preventDefault();
    const wallet = createWallet(passphrase)
    if (!inviteCode || invalidInviteCode) {
      setSignerAndAddress([wallet, wallet.address])
    } else {
      setIsInProgress(true)
      const inviteWallet = new ethers.Wallet(inviteCode, context.provider);

      const amount = await inviteWallet.getBalance()
      const gasLimit = 21000
      const gasPrice = await inviteWallet.provider.getGasPrice();
      const amountMinusGas = amount.sub(gasPrice.mul(gasLimit))
      if (!amountMinusGas.gt(0)) {
        alert('Invite code has already been used, sorry.')
        return
      }

      try {
        const transaction = await inviteWallet.sendTransaction({
          to: wallet.address,
          value: amountMinusGas,
          gasLimit: gasLimit,
          gasPrice: gasPrice,
          type: 0x0,
        });

        const receipt = await transaction.wait();
        if (receipt.status === 1) {
          setSignerAndAddress([wallet, wallet.address])
        } else {
          setIsInProgress(false);
          alert('Failed to set up your account. Please try again.');
        }
      } catch (error) {
        setIsInProgress(false);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const buttonText = inviteCode ? "Set up your account" : "Log in"

  return (
    <div style={{width: '100%'}}>
      <div style={{display: 'flex', justifyContent: 'space-between' }}>
      {inviteCode ? <h3>Welcome to hyphen</h3> : <h3>Enter Passphrase</h3>}
      {fingerprint && (<CopyToClipboard text={fingerprint} onCopy={context.showToast}>
          <div
            style={{display: 'flex', alignItems: 'center'}}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <span style={{ marginRight: '0.5rem' }}>Copy fingerprint</span>
            <Blockies seed={fingerprint} />
          </div>
        </CopyToClipboard>)}
      </div>
      {!isInProgress && (<>
        {inviteCode && <p>
          Enter a passphrase to secure your new account.
        </p>}
        {invalidWallet && <p className='error'>
          Account not recognized on the network.
        </p>}
        {invalidInviteCode && <p className='error'>
          Invite code is not valid.
        </p>}
        <form>
          {/* Hidden username field */}
          <input 
            type="text" 
            name="username" 
            value={fingerprint} 
            style={{ display: 'none' }} 
          />
          <input
            type="password"
            name="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.keyCode === 13 && passphrase) {
                setupAccount();
              }
            }}
            disabled={isInProgress}
            autoCapitalize="none"
            autocomplete={inviteCode ? "new-password" : "current-password"}
          />
          <button type="submit" onClick={(e) => setupAccount(e)}>
            {buttonText}
          </button>
        </form>
        {showForgetButton && (
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
              onClick={forgetFingerprint}
            >
              Forget fingerprint
            </button>
          </div>
        )}
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
    <div style={{width: '100%'}}>
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
      <h3>Claim your public name</h3>
      <YourEnsName onNameSet={setName} />
    </div>
  );
};

const SignIn = ({ fingerprint, forgetFingerprint }) => {
  const { inviteCode } = useParams()
  const [isValidInviteCode, setIsValidInviteCode] = useState(null)
  const [[pendingSigner, pendingAddress], setPendingSignerAndAddress] = useState([null, null])
  const [balance, setBalance] = useState(null)
  const context = useContext(HyphenContext)

  const noBalance = balance && balance.eq(0)

  const step = context.signer === null || context.address === null ?
    <UniquePassphrase setSignerAndAddress={setPendingSignerAndAddress} invalidWallet={noBalance} invalidInviteCode={isValidInviteCode === false} fingerprint={fingerprint} forgetFingerprint={forgetFingerprint} inviteCode={inviteCode} /> :
    <ClaimName setName={context.setName} />

  useEffect(() => {
    if (inviteCode) {
      let inviteCodeWallet;
      try {
        inviteCodeWallet = new ethers.Wallet(inviteCode, context.provider);
      } catch {
        inviteCodeWallet = null;
      }
      if (inviteCodeWallet) {
        inviteCodeWallet.getBalance().then((balance) => {
          if (ethers.utils.formatEther(balance) > 0) {
            setIsValidInviteCode(true)
          } else {
            setIsValidInviteCode(false)
          }
        });
      } else {
        setIsValidInviteCode(false)
      }
    }
  }, [])

  useEffect(() => {
    if (pendingSigner && pendingAddress) {
      Promise.all([
        pendingSigner.provider.lookupAddress(pendingAddress),
        pendingSigner.getBalance()
      ]).then(([currentName, balance]) => {
        context.setName(currentName)
        setBalance(balance)
      })
    }
  }, [pendingSigner, pendingAddress])

  useEffect(() => {
    if (pendingSigner && pendingAddress && balance && balance.gt(0)) {
      context.setName(context.name)
      context.setSignerAndAddress([pendingSigner, pendingAddress])
    }
  }, [pendingSigner, pendingAddress, balance, context.name])

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        {step}
      </div>
    </div>
  );
};

const Onboarding = () => {

  const [fingerprint, setFingerprint] = useState(null)

  useEffect(() => {
    openDB('Hyphen', 1, {
      upgrade(db) {
        db.createObjectStore('fingerprint');
      }
    }).then(db => {
      return db.get('fingerprint', 'key').then(existingFingerprint => {
        if (existingFingerprint) {
          return existingFingerprint
        }

        const randomBytes = ethers.utils.randomBytes(16)
        const newFingerprint = ethers.utils.hexlify(randomBytes)
        db.put('fingerprint', newFingerprint, 'key').then(() => {
          return newFingerprint
        })
      })
    }).then(fp => {
      setFingerprint(fp);
    })
  }, []);

  useEffect(() => {
    if (fingerprint === undefined) {
      openDB('Hyphen', 1).then((db) => {
        return db.delete('fingerprint', 'key')
      }).then(() => {
        setFingerprint(null)
      })
    }
  }, [fingerprint])

  const forgetFingerprint = () => {
    if (window.confirm('Are you sure you want to forget this fingerprint?  Make sure you\'ve copied it to a safe place if you want to import it later.')) {
      setFingerprint(undefined)
    }
  }

  const onboardingRouter = createHashRouter(
    createRoutesFromElements(
      <Route path=':inviteCode?' element={
        fingerprint ? <>
          <SignIn fingerprint={fingerprint} forgetFingerprint={forgetFingerprint} />
        </> : <>
          <h1>Welcome to Hyphen</h1>
          <ImportFingerprint setFingerprint={setFingerprint} />
        </>
      }></Route>
    )
  )

  return <RouterProvider router={onboardingRouter} />
}

export default Onboarding;
