import React from 'react'
import ReactDOM from 'react-dom'
import HyphenLoader from './components/HyphenLoader'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'purecss/build/pure.css'
import './styles.css'
require('./../manifest.json')

const ethers = require("ethers")
const configuration = require('./../configuration.json')

const provider = new ethers.providers.StaticJsonRpcProvider(
  { url: configuration.url },
  { name: "home", chainId: configuration.chainId, ensAddress: configuration.ens }
)

ReactDOM.render(
  <HyphenLoader provider={provider} configuration={configuration} contracts={contracts} />,
  document.getElementById('root'))

