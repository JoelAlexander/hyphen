import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { ENS, ENSRegistry, FIFSRegistrar, PublicResolver, ReverseRegistrar } from '@ensdomains/ens-contracts';
import { ethers } from 'ethers';
import namehash from 'eth-ens-namehash';

const YourEnsName = (props) => {
  const context = useContext(HyphenContext);
  const [state, setState] = useState({
    enteredLabelString: '',
    ensContract: null,
    resolverContract: null,
    fifsRegistrarContract: null,
    reverseRegistrarContract: null,
    name: null,
  });

  useEffect(() => {
    const ensContract = new ethers.Contract(
      context.configuration.ens, ENS, context.signer);
    setState(prevState => ({ ...prevState, ensContract }));

    const resolveContracts = async () => {
      const resolverAddress = await context.provider.resolveName('resolver');
      const registrarAddress = await context.provider.resolveName('registrar.eth');
      const reverseRegistrarAddress = await context.provider.resolveName('addr.reverse');

      setState(prevState => ({
        ...prevState,
        resolverContract: new ethers.Contract(resolverAddress, PublicResolver, context.signer),
        fifsRegistrarContract: registrarAddress ? new ethers.Contract(registrarAddress, FIFSRegistrar, context.signer) : null,
        reverseRegistrarContract: new ethers.Contract(reverseRegistrarAddress, ReverseRegistrar, context.signer),
      }));
    };

    resolveContracts();
    update();
  }, []);

  const update = () => {
    context.provider.lookupAddress(context.address).then((name) => {
      setState(prevState => ({ ...prevState, name }));
    });
  };

  const onEnteredLabelStringChanged = (event) => {
    setState(prevState => ({
      ...prevState,
      enteredLabelString: namehash.normalize(event.target.value),
    }));
  };

  const claimName = () => {
    if (!state.enteredLabelString) {
      context.addMessage("Must enter a label string to claim.");
      return;
    }

    const fullname = state.enteredLabelString + ".eth";
    const label = ethers.utils.id(state.enteredLabelString);
    const node = namehash.hash(fullname);
    context.executeTransaction(
      state.fifsRegistrarContract.register(label, context.address),
      () => {
        context.addMessage("Registration succeeded");
        context.executeTransaction(
          state.resolverContract['setAddr(bytes32,address)'](node, context.address),
          () => {
            context.addMessage("Address updated in resolver");
            context.executeTransaction(
              state.ensContract.setResolver(node, state.resolverContract.address),
              () => {
                context.addMessage("Resolver updated");
                context.executeTransaction(
                  state.reverseRegistrarContract.setName(fullname),
                  () => {
                    context.addMessage("Reverse record update succeeded.");
                    update();
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
    const suffixIndex = state.name.lastIndexOf(suffix);
    if (
      suffixIndex === -1 ||
      (suffix.length + suffixIndex) !== state.name.length
    ) {
      context.addMessage("Name must end in .eth");
      return;
    }

    const labelString = state.name.substring(0, suffixIndex);
    const label = ethers.utils.id(labelString);
    const node = namehash.hash(state.name);

    context.executeTransaction(
      state.resolverContract['setAddr(bytes32,address)'](node, ethers.constants.AddressZero),
      () => {
        context.addMessage("Cleared address");
        update();
        context.executeTransaction(
          state.ensContract.setResolver(node, ethers.constants.AddressZero),
          () => {
            context.addMessage("Resolver cleared in registry");
            context.executeTransaction(
              state.fifsRegistrarContract.register(label, ethers.constants.AddressZero),
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
  if (state.fifsRegistrarContract) {
    if (state.name) {
      action = (
        <div>
          <button onClick={releaseName}>Release name: {state.name}</button>
        </div>);
    } else {
      action = (
        <div>
          <input type="text" value={state.enteredLabelString} onChange={onEnteredLabelStringChanged} />.eth
          <input onClick={claimName} type="submit" value="Claim name" />
        </div>);
    }
  } else {
    action = <p>No registrar.eth found! {context.provider.network.ensAddress}</p>;
  }

  return action;
};

export default YourEnsName;