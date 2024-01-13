import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import HyphenLoader from './components/HyphenLoader';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
require('./../manifest.json');

const ethers = require("ethers");

function App() {
  const [configuration, setConfiguration] = useState(null);

  useEffect(() => {
    fetch('/chain-config.json')
      .then(response => response.json())
      .then(data => {
        setConfiguration(data);
      });
  }, []);

  if (!configuration) {
    return <div>Loading...</div>; // Or any other loading state representation
  }

  const provider = new ethers.providers.StaticJsonRpcProvider(
    { url: configuration.url },
    { name: "home", chainId: configuration.chainId, ensAddress: configuration.ens }
  );

  const contractsWithEns = {
  	...contracts,
  	[configuration.ens]: ENS_ABI 
  }

  return (
    <HyphenLoader provider={provider} configuration={configuration} contracts={contractsWithEns} />
  );
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);