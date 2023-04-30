import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { ethers } from 'ethers';
import namehash from 'eth-ens-namehash';

const YourEnsName = ({onNameSet}) => {
  const context = useContext(HyphenContext);
  const ensContract = context.getContract(context.configuration.ens)
  const resolverContract = context.getContract('resolver')
  const fifsRegistrarContract = context.getContract('registrar.eth')
  const reverseRegistrarContract = context.getContract('addr.reverse')
  const [name, setName] = useState(null);
  const [enteredLabelString, setEnteredLabelString] = useState('');

  useEffect(() => {
    update();
  }, []);

  const update = () => {
    return context.lookupAddress(context.address)
      .then(setName);
  };

  const onEnteredLabelStringChanged = (event) => {
    setEnteredLabelString(namehash.normalize(event.target.value));
  };

  const claimName = () => {
    if (!enteredLabelString) {
      context.addMessage("Must enter a label string to claim.");
      return;
    }

    const fullname = enteredLabelString + ".eth";
    const label = ethers.utils.id(enteredLabelString);
    const node = namehash.hash(fullname);
    context.executeTransaction(
      fifsRegistrarContract.register(label, context.address),
      () => {
        context.addMessage("Registration succeeded");
        context.executeTransaction(
          resolverContract['setAddr(bytes32,address)'](node, context.address),
          () => {
            context.addMessage("Address updated in resolver");
            context.executeTransaction(
              ensContract.setResolver(node, resolverContract.address),
              () => {
                context.addMessage("Resolver updated");
                context.executeTransaction(
                  reverseRegistrarContract.setName(fullname),
                  () => {
                    context.addMessage("Reverse record update succeeded.");
                    update().then(() => onNameSet(fullname));
                  },
                  (reason) => { context.addMessage(JSON.stringify(reason)); }
                );
              },
              (reason) => { context.addMessage(JSON.stringify(reason)); }
            );
          },
          (reason) => { context.addMessage(JSON.stringify(reason)); }
        );
      },
      (reason) => { context.addMessage(JSON.stringify(reason)); }
    );
  };

  const releaseName = () => {
    const suffix = ".eth";
    const suffixIndex = name.lastIndexOf(suffix);
    if (
      suffixIndex === -1 ||
      (suffix.length + suffixIndex) !== name.length
    ) {
      context.addMessage("Name must end in .eth");
      return;
    }

    const labelString = name.substring(0, suffixIndex);
    const label = ethers.utils.id(labelString);
    const node = namehash.hash(name);

    context.executeTransaction(
      resolverContract['setAddr(bytes32,address)'](node, ethers.constants.AddressZero),
      () => {
        context.addMessage("Cleared address");
        update();
        context.executeTransaction(
          ensContract.setResolver(node, ethers.constants.AddressZero),
          () => {
            context.addMessage("Resolver cleared in registry");
            context.executeTransaction(
              fifsRegistrarContract.register(label, ethers.constants.AddressZero),
              () => {
                context.addMessage("Reclaimed node");
              },
              (reason) => { context.addMessage(JSON.stringify(reason)); }
            );
          },
          (reason) => { context.addMessage(JSON.stringify(reason)); }
        );
      },
      (reason) => { context.addMessage(JSON.stringify(reason)); }
    );
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
          <input type="text" value={enteredLabelString} onChange={onEnteredLabelStringChanged} />.eth
          <input onClick={claimName} type="submit" value="Claim name" />
        </div>);
    }
  } else {
    action = <p>No registrar.eth found! {context.provider.network.ensAddress}</p>;
  }

  return action;
};

export default YourEnsName;