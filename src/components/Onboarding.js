import React, { useState, useEffect, useContext } from 'react';
import {Outlet, RouterProvider, Route, Navigate, Link, createBrowserRouter, createHashRouter, createRoutesFromElements, useLocation, useNavigate, useParams } from 'react-router-dom'
import Toast from './Toast';
import Blockies from 'react-blockies';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HyphenContext from '../context/HyphenContext';
import YourEnsName from './YourEnsName';
import ApprovalGateContainer from './ApprovalGateContainer';
import './Hyphen.css';
import './Onboarding.css';
import useAccountTextRecord from '../hooks/useAccountTextRecord';
import useConnectToNamespace from '../hooks/useConnectToNamespace';
import context from 'react-bootstrap/esm/AccordionContext';
import { sign } from 'eth-crypto';
const ethers = require("ethers");

const InviteCode = () => {
  const { inviteCode } = useParams()
  const [invalidInviteCode, setInvalidInviteCode] = useState(false)
  const [isInProgress, setIsInProgress] = useState(false)
  const context = useContext(HyphenContext)

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
            setInvalidInviteCode(false)
          } else {
            setInvalidInviteCode(true)
          }
        });
      } else {
        setIsValidInviteCode(false)
      }
    }
  }, [])

  const claimInvite = async (event) => {
    event.preventDefault();
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
  };

  return (
    <div style={{width: '100%'}}>
      <div style={{display: 'flex', justifyContent: 'space-between' }}>
        <h3>Accept Invitation</h3>
      </div>
      {!isInProgress && (
        <>
          {invalidInviteCode && <p className='error'>
            Invite code is not valid.
          </p>}
          {!invalidInviteCode && <button type="submit" onClick={(e) => claimInvite(e)}>
            <p>Click to activate your account.</p>
          </button>}
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
}


const SignIn = ({ invalidWallet, fingerprint, removeAccount, signIn }) => {
  const { inviteCode } = useParams()
  const [passphrase, setPassphrase] = useState('')
  const [showForgetButton, setShowForgetButton] = useState(false)
  const context = useContext(HyphenContext)
  let holdTimer;

  const handleMouseDown = () => {
    holdTimer = setTimeout(() => {
      setShowForgetButton(!showForgetButton);
    }, 2000)
  }

  const handleMouseUp = () => {
    clearTimeout(holdTimer)
  }

  const buttonText = inviteCode ? "Set up your account" : "Log in"

  const handleSignIn = (e) => {
    e.preventDefault() // DO NOT REMOVE, KEEPS USERNAME/PASSWORD PRIVATE
    signIn(passphrase)
  }

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
      <>
        {inviteCode && <p>
          Enter a passphrase to secure your new account.
        </p>}
        {invalidWallet && <p className='error'>
          Account not recognized on the network.
        </p>}
        <form>
          {/* Hidden username field */}
          <input 
            readOnly
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
                signIn(passphrase);
              }
            }}
            autoCapitalize="none"
            autoComplete={inviteCode ? "new-password" : "current-password"}
          />
          <button type="submit" onClick={handleSignIn}>
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
              onClick={() => removeAccount(fingerprint)}
            >
              Remove account
            </button>
          </div>
        )}
      </>
    </div>
  );
};

const SelectAccount = ({ addAccount }) => {
  const [fingerprint, setFingerprint] = useState('');
  const context = useContext(HyphenContext);

  const confirmFingerprint = () => {
    addAccount(fingerprint);
  }

  return (
    <div style={{width: '100%'}}>
      <h3>Import account fingerprint</h3>
      <input
        type="text"
        value={fingerprint}
        onChange={(e) => setFingerprint(e.target.value)}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && fingerprint) {
            confirmFingerprint();
          }
        }}
        placeholder="Enter fingerprint"
      />
      {fingerprint && (
        <button onClick={confirmFingerprint}>
          Import
        </button>
      )}
      {fingerprint && (
        <div>
          <p>Current input fingerprint:</p>
          <CopyToClipboard text={fingerprint} onCopy={context.showToast}>
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

const ClaimName = ({address}) => {
  const context = useContext(HyphenContext);
  return (
    <div>
      <h3>Claim your public name</h3>
      <ApprovalGateContainer addressOrName={'hyphen'}>
        <YourEnsName onNameSet={(name) => context.setName(name)} />
      </ApprovalGateContainer>
    </div>
  );
};

const SelectNamespace = () => {
  const context = useContext(HyphenContext)
  const namespaces = [context.configuration.ens]
  const [ hyphenName ] = useAccountTextRecord('hyphen')
  const [ isConnected, handleConnectToNamespace, handleDisconnectFromNamespace ] = useConnectToNamespace()
  var zones;
  try { zones = JSON.parse(zonesText) }
  catch (e) { zones = {} }
  return <><h3>Select Namespace</h3>
    <h4>Namespaces {namespaces}</h4>
  </>
}

const SelectZone = ({ setZone, signOut }) => {
  const context = useContext(HyphenContext)
  const namespaces = [context.configuration.ens]
  const [ hyphenName ] = useAccountTextRecord('hyphen.name')
  const [ zonesText ] = useAccountTextRecord('zones')
  const [ isConnected, handleConnectToNamespace, handleDisconnectFromNamespace ] = useConnectToNamespace()
  var zones;
  try { zones = JSON.parse(zonesText) }
  catch (e) { zones = {} }
  return <><h3>Select Zone</h3>
    <button onClick={signOut}>Log Out</button>
    <h4>Namespaces {hyphenName}</h4>
    <h4>{JSON.stringify(zones)}</h4>
    <h5>Your address: {context.address}</h5>
    {!isConnected && <button onClick={handleConnectToNamespace}>Connect To Namespace</button>}
    {isConnected && <button onClick={handleDisconnectFromNamespace}>Disconnect From Namespace</button>}
  </>
};

const SelectNetwork = ({ networks, addNetwork, removeNetwork, setDefaultNetwork, selectNetwork }) => {
  const [newNetwork, setNewNetwork] = useState('');
  const [pendingNetwork, setPendingNetwork] = useState('');

  // Set the first network as pending when networks array becomes non-empty
  useEffect(() => {
    if (networks && networks.length > 0 && !pendingNetwork) {
      setPendingNetwork(networks[0]);
    }
  }, [networks, pendingNetwork]);

  const handleAddNetwork = () => {
    addNetwork(newNetwork);
    setNewNetwork('');
  };

  const handleSelectNetwork = (event) => {
    setPendingNetwork(event.target.value);
  };

  const handleConfirmNetwork = () => {
    selectNetwork(pendingNetwork);
    setDefaultNetwork(pendingNetwork); // Assuming you want the selected network to become default
  };

  if (!networks || networks.length === 0) {
    // If no networks, show input to add a network
    return (
      <div>
        <input
          type="text"
          value={newNetwork}
          onChange={(e) => setNewNetwork(e.target.value)}
          placeholder="Enter Network"
        />
        <button onClick={handleAddNetwork}>Add Network</button>
      </div>
    );
  } else {
    // When networks are present, show dropdown and confirm button
    return (
      <div>
        <select value={pendingNetwork} onChange={handleSelectNetwork}>
          {networks.map((network, index) => (
            <option key={index} value={network}>
              {network}
            </option>
          ))}
        </select>
        <button onClick={handleConfirmNetwork} disabled={!pendingNetwork}>
          Confirm
        </button>
      </div>
    );
  }
};

const Onboarding = ({account, network, accounts, addAccount, removeAccount, addNetwork, removeNetwork, setDefaultNetwork, selectNetwork, signOut, signIn}) => {

  const { inviteCode } = useParams()

  var step = null;
  if (!account) {
    step = <SelectAccount accounts={accounts} addAccount={addAccount} removeAccount={removeAccount} />;
  } else if (!network) {
    step = <SelectNetwork
      networks={account.networks}
      addNetwork={addNetwork}
      removeNetwork={removeNetwork}
      setDefaultNetwork={setDefaultNetwork}
      selectNetwork={selectNetwork} />;
  } else if (!context.signer) {
    step = <SignIn fingerprint={account.fingerprint} signIn={signIn} />;
  } else if (inviteCode) {
    step = <InviteCode />
  } else {
    step = <SelectZone setZone={() => {}} signOut={signOut} />;
  }

  const onboardingRouter = createHashRouter(
    createRoutesFromElements(<Route path=':inviteCode?' element={step} />)
  )

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <RouterProvider router={onboardingRouter} />
      </div>
    </div>
  );
}

export default Onboarding;
