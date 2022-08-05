import React from 'react';
import HyphenContext from './HyphenContext';
import { ENS, ENSRegistry, FIFSRegistrar, PublicResolver, ReverseRegistrar } from '@ensdomains/ens-contracts';
const ethers = require("ethers")
const namehash = require('eth-ens-namehash')


class Names extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      enteredLabelString: ""
    };
  };

  componentDidMount() {
    this.setState({
      ensContract: new ethers.Contract(
        this.context.configuration.ensAddress, ENS, this.context.signer)
    });

    this.context.provider.resolveName('resolver').then((resolverAddress) => {
      this.setState({
        resolverContract: new ethers.Contract(resolverAddress, PublicResolver, this.context.signer)
      });
    })

    this.context.provider.resolveName('registrar.eth').then((registrarAddress) => {
      if (registrarAddress) {
        this.setState({
          fifsRegistrarContract: new ethers.Contract(registrarAddress, FIFSRegistrar, this.context.signer)
        });
      }
    })

    this.context.provider.resolveName('addr.reverse').then((reverseRegistrarAddress) => {
      this.setState({
        reverseRegistrarContract: new ethers.Contract(reverseRegistrarAddress, ReverseRegistrar, this.context.signer)
      });
    });

    this.context.provider.lookupAddress(this.context.address).then((name) => {
      this.setState({
        name: name
      });
    });
  }

  onEnteredLabelStringChanged = (event) => {
    this.setState({
      enteredLabelString: namehash.normalize(event.target.value)
    });
  };

  claimName = () => {

    if (!this.state.enteredLabelString) {
      this.props.addMessage("Must enter a label string to claim.");
      return;
    }

    const fullname = this.state.enteredLabelString + ".eth";
    const label = ethers.utils.id(this.state.enteredLabelString);
    const node = namehash.hash(fullname);
    this.context.executeTransaction(
      this.state.fifsRegistrarContract.register(label, this.context.address),
      () => {
        this.props.addMessage("Registration succeeded");
        this.context.executeTransaction(
          this.state.resolverContract['setAddr(bytes32,address)'](node, this.context.address),
          () => {
            this.props.addMessage("Address updated in resolver");
            this.context.executeTransaction(
              this.state.ensContract.setResolver(node, this.state.resolverContract.address),
              () => {
                this.props.addMessage("Resolver updated");
                this.context.executeTransaction(
                  this.state.reverseRegistrarContract.setName(fullname),
                  () => {
                    this.props.addMessage("Reverse record update succeded. ");
                    this.update();
                  },
                  (reason) => {
                    this.props.addMessage(JSON.stringify(reason));
                    this.update();
                  });
              },
              (reason) => {
                this.props.addMessage(JSON.stringify(reason));
                this.update();
              });
          },
          (reason) => {
            this.props.addMessage(JSON.stringify(reason));
            this.update();
          });
      },
      (reason) => {
        this.props.addMessage(JSON.stringify(reason));
        this.update();
      });
  };

  releaseName = () => {
    const suffix = ".eth";
    const suffixIndex = this.state.name.lastIndexOf(suffix);
    if (
      suffixIndex == -1 ||
      (suffix.length + suffixIndex) != this.state.name.length
    ) {
      this.props.addMessage("Name must end in .eth");
      return;
    }

    const labelString = this.state.name.substring(0, suffixIndex);
    const label = ethers.utils.id(labelString);
    const node = namehash.hash(this.state.name);

    this.context.executeTransaction(
      this.state.resolverContract['setAddr(bytes32,address)'](node, ethers.constants.AddressZero),
      () => {
        this.props.addMessage("Cleared address");
        this.context.executeTransaction(
          this.state.ensContract.setResolver(node, ethers.constants.AddressZero),
          () => {
            this.props.addMessage("Resolver cleared in registry");
            this.context.executeTransaction(
              this.state.fifsRegistrarContract.register(label, ethers.constants.AddressZero),
              () => {
                this.props.addMessage("Reclaimed node");
                this.update();
              },
              (reason) => {
                this.props.addMessage(JSON.stringify(reason));
                this.update();
              });
          },
          (reason) => {
            this.props.addMessage(JSON.stringify(reason));
            this.update();
          });
      },
      (reason) => {
        this.props.addMessage(JSON.stringify(reason));
        this.update();
      }
    );
  };

  render() {

    var action;
    if (this.fifsRegistrarContract) {
      if (this.state.name) {
        action = <div>
          <button onClick={this.releaseName}>Release name: {this.state.name}</button>
        </div>;
      } else {
        action = <div>
          <input type="text" value={this.state.enteredLabelString} onChange={this.onEnteredLabelStringChanged} />.eth
          <input onClick={this.claimName} type="submit" value="Claim name" />
        </div>;
      }
    } else {
      action = <p>No registrar.eth found!</p>
    }

    return action;
  }
}

Names.contextType = HyphenContext;

export default Names;
