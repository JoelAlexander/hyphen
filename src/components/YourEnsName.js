import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { ethers } from 'ethers';
import namehash from 'eth-ens-namehash';
import './Hyphen.css';

const YourEnsName = ({onNameSet}) => {
  const context = useContext(HyphenContext);
  const ensContract = context.getContract(context.configuration.ens)
  const resolverContract = context.getContract('resolver')
  const fifsRegistrarContract = context.getContract('registrar.hyphen')
  const reverseRegistrarContract = context.getContract('addr.reverse')
  const [name, setName] = useState(null);
  const [enteredLabelString, setEnteredLabelString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    update();
  }, []);

  const update = () => {
    return context.getEnsName(context.address).then(setName);
  };

  const onEnteredLabelStringChanged = (event) => {
    setEnteredLabelString(namehash.normalize(event.target.value));
  };

  const claimName = () => {
    if (!enteredLabelString) {
      context.addMessage("Must enter a label string to claim.");
      return;
    }

    const fullname = enteredLabelString + ".hyphen";
    const label = ethers.utils.id(enteredLabelString);
    const node = namehash.hash(fullname);
    setCurrentStep('Registering name');
    setIsLoading(true);
    fifsRegistrarContract.register(label, context.address)
      .then(() => {
        setCurrentStep('Setting address');
        return resolverContract['setAddr(bytes32,address)'](node, context.address)
          .then(() => {
            setCurrentStep('Setting resolver');
            return ensContract.setResolver(node, resolverContract.address)
              .then(() => {
                setCurrentStep('Setting reverse record');
                return reverseRegistrarContract.setName(fullname)
                  .then(() => {
                    return update().then(() => {
                      onNameSet(fullname);
                      setIsLoading(false);
                    });
                  })
              });
          });
      }).catch((reason) => setIsLoading(false));
  };

  const releaseName = () => {
    const suffix = ".hyphen";
    const suffixIndex = name.lastIndexOf(suffix);
    if (
      suffixIndex === -1 ||
      (suffix.length + suffixIndex) !== name.length
    ) {
      context.addMessage("Name must end in .hyphen");
      return;
    }

    const labelString = name.substring(0, suffixIndex);
    const label = ethers.utils.id(labelString);
    const node = namehash.hash(name);
    setCurrentStep('Removing address');
    setIsLoading(true);
    resolverContract['setAddr(bytes32,address)'](node, ethers.constants.AddressZero)
      .then(() => {
        setCurrentStep('Removing resolver');
        update();
        return ensContract.setResolver(node, ethers.constants.AddressZero)
          .then(() => {
            setCurrentStep('Unregistering name');
            return fifsRegistrarContract.register(label, ethers.constants.AddressZero)
              .then(() => setIsLoading(false))
          });
      })
      .catch((reason) => setIsLoading(false));
  };

  let action;
  if (fifsRegistrarContract) {
    if (name) {
      action = (
        <div>
          <button onClick={releaseName}>Release name: {name}</button>
        </div>);
    } else {
      action = (
        <div>
          <input type="text" value={enteredLabelString} onChange={onEnteredLabelStringChanged} />.hyphen
          <input onClick={claimName} type="submit" value="Claim name" />
        </div>);
    }
  } else {
    action = <p>No registrar.hyphen found! {context.provider.network.ensAddress}</p>;
  }

  return (
    <div>
      {!isLoading && action}
      {isLoading && (
        <div>
          <div className="spinner"></div>
          <p>{currentStep}</p>
        </div>
      )}
    </div>
  );
};

export default YourEnsName;