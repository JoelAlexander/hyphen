import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from '../context/HyphenContext'
import namehash from 'eth-ens-namehash'
import { usePromise } from 'react-use'
import './Hyphen.css'

const ethers = require('ethers')

const ZeroAddress = "0x0000000000000000000000000000000000000000"

const YourZoneName = ({address}) => {
  const mounted = usePromise()
  const context = useContext(HyphenContext);
  const ensContract = context.getContract(context.configuration.ens)
  const zoneContract = context.getContract(address)
  const reverseRegistrarContract = context.getContract('addr.reverse')
  const [name, setName] = useState(null)
  const [enteredLabelString, setEnteredLabelString] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [nameAlreadyTaken, setNameAlreadyTaken] = useState(null)

  const fullname = enteredLabelString + ".hyphen"
  const label = ethers.utils.id(enteredLabelString)
  const node = namehash.hash(fullname)

  useEffect(() => {
    context.getEnsName(context.address).then(setName)
  }, [context.name])

  useEffect(() => {
    if (enteredLabelString == '') {
      return
    }

    mounted(ensContract.owner(node))
      .then((owner) => {
        setNameAlreadyTaken(owner !== ZeroAddress)
      })
  }, [enteredLabelString])

  const onEnteredLabelStringChanged = (event) => {
    setEnteredLabelString(namehash.normalize(event.target.value))
  };

  const claimName = () => {
    if (!enteredLabelString) {
      context.addMessage("Must enter a label string to claim.")
      return;
    }

    setCurrentStep('Registering name')
    setIsLoading(true)
    const promises = Promise.all([
      reverseRegistrarContract.setName(fullname),
      hyphenContract.setupName(label),
    ]).then(() => {context.setName(fullname)})
    mounted(promises).finally(() => setIsLoading(false))
  }

  const releaseName = () => {
    const suffix = ".hyphen"
    const suffixIndex = name.lastIndexOf(suffix);
    if (
      suffixIndex === -1 ||
      (suffix.length + suffixIndex) !== name.length
    ) {
      context.addMessage("Name must end in .hyphen")
      return
    }

    setCurrentStep('Removing address')
    setIsLoading(true)
    const promises = Promise.all([
      reverseRegistrarContract.setName(''),
      ensContract.setOwner(namehash.hash(name), ZeroAddress)
    ]).then(() => {context.setName(null)})
    mounted(promises).finally(() => setIsLoading(false))
  };

  let action
  if (name) {
    action = <>
      <button onClick={releaseName}>Release name: {name}</button>
    </>
  } else {
    action = <>
      <input type="text" autoComplete="one-time-code" value={enteredLabelString} onChange={onEnteredLabelStringChanged} />
      <input onClick={claimName} type="submit" value="Claim name" />
    </>
  }

  const message =
    nameAlreadyTaken === null ? null :
    enteredLabelString === '' ? null :
    nameAlreadyTaken ? `'${enteredLabelString}' already taken` : `'${enteredLabelString}' available`

  return (<>
    {!isLoading && <>{action}<p>{message}</p></>}
    {isLoading && (
      <div>
        <div className="spinner"></div>
        <p>{currentStep}</p>
      </div>
    )}
  </>)
}

export default YourEnsName