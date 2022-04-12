import React from 'react';
import ENS from './../contracts/ENS.sol/ENS.json';
import ENSDeployment from './../contracts/ENSDeployment.sol/ENSDeployment.json';
import ENSRegistry from './../contracts/ENSRegistry.sol/ENSRegistry.json';
import FIFSRegistrar from './../contracts/FIFSRegistrar.sol/FIFSRegistrar.json';
import PublicResolver from './../contracts/PublicResolver.sol/PublicResolver.json';
import ReverseRegistrar from './../contracts/ReverseRegistrar.sol/ReverseRegistrar.json';
const ethers = require("ethers");
const namehash = require('eth-ens-namehash')

const ensDeploymentAddress = "0x46E1cd6B553Dbca83bD412c6d71b3298FF7312f0";

class Names extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      contract:
        this.props.accessDeployedContract(
          ensDeploymentAddress,
          ENSDeployment.abi),
      enteredLabelString: ""
    };
  };

  componentDidMount() {
    this.update();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.address != this.props.address) {
      this.update();
    }
  }

  update = () => {
    this.state.contract.ens().then((result) => {
      this.props.addMessage("ens contract: " + result)
      this.setState({
        ensContract: this.props.accessDeployedContract(
          result,
          ENS.abi)
      });
    });
    this.state.contract.fifsRegistrar().then((result) => {
      this.setState({
        fifsRegistrarContract: this.props.accessDeployedContract(
          result,
          FIFSRegistrar.abi)
      });
    });
    this.state.contract.reverseRegistrar().then((result) => {
      this.setState({
        reverseRegistrarContract: this.props.accessDeployedContract(
          result,
          ReverseRegistrar.abi)
      });
    });
    this.state.contract.publicResolver().then((result) => {
      this.setState({
        resolverContract: this.props.accessDeployedContract(
          result,
          PublicResolver.abi)
      });
    });
    if (this.props.address) {
      this.props.addMessage(this.props.address);
      this.props.provider.lookupAddress(this.props.address).then((name) => {
        this.setState({
          name: name
        });
      });
    }
  };

  onEnteredLabelStringChanged = (event) => {
    this.setState({
      enteredLabelString: namehash.normalize(event.target.value)
    });
  };

  claimName = () => {
    if (!this.props.address) {
      this.props.addMessage("Must have an address to claim.")
      return;
    }

    if (!this.state.enteredLabelString) {
      this.props.addMessage("Must enter a label string to claim.")
    }

    const fullname = this.state.enteredLabelString + ".eth";
    const label = ethers.utils.id(this.state.enteredLabelString);
    const node = namehash.hash(fullname);
    this.props.executeTransaction(
      this.state.fifsRegistrarContract.register(label, this.props.address),
      () => {
        this.props.addMessage("Registration succeeded");
        this.props.executeTransaction(
          this.state.resolverContract['setAddr(bytes32,address)'](node, this.props.address),
          () => {
            this.props.addMessage("Address updated in resolver");
            this.props.executeTransaction(
              this.state.ensContract.setResolver(node, this.state.resolverContract.address),
              () => {
                this.props.addMessage("Resolver updated");
                this.props.executeTransaction(
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
    if (!this.props.address) {
      this.props.addMessage("Must have an address to claim.")
      return;
    }

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

    this.props.executeTransaction(
      this.state.resolverContract['setAddr(bytes32,address)'](node, ethers.constants.AddressZero),
      () => {
        this.props.addMessage("Cleared address");
        this.props.executeTransaction(
          this.state.ensContract.setResolver(node, ethers.constants.AddressZero),
          () => {
            this.props.addMessage("Resolver cleared in registry");
            this.props.executeTransaction(
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

    return action;
  }
}

export default Names;