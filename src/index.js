import React from 'react';
import ReactDOM from 'react-dom';
import Hyphen from './components/Hyphen';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'purecss/build/pure.css';
import './styles.css';
import { ENS, FIFSRegistrar, PublicResolver, ReverseRegistrar } from '@ensdomains/ens-contracts';

const manifest = require('./../manifest.json');
const configuration = require('./../configuration.json');

function runApp(serviceWorkerRegistration) {
  ReactDOM.render(
    <Hyphen configuration={({...configuration, contracts: contracts, serviceWorkerRegistration: serviceWorkerRegistration })} />,
    document.getElementById('root'));
}

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      runApp(registration);
    })
    .catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
      runApp(null);
    });
  });
} else {
  runApp(null);
}
