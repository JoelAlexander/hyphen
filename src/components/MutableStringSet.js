import React from 'react';
import StringSet from './../contracts/StringSet.sol/StringSet.json';
const ethers = require("ethers");

class MutableStringSet extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      contract: this.props.accessDeployedContract(this.props.contractAddress, StringSet.abi),
      contents: [],
      newString: ""
    };
  };

  componentDidMount() {
    this.update();
  }

  update = () => {
    this.state.contract.contents().then((result) => {
      this.setState({contents:result});
    });
  };

  addString = (str) => {
    this.props.executeTransaction(
      this.state.contract.add(str),
      (receipt) => this.update(),
      (error) => this.props.addMessage(JSON.stringify(error)));
  };

  handleAddString = () => {
    if (this.state.newString && this.state.newString.length > 0) {
      this.addString(this.state.newString);
      this.setState({newString: ""})
    }
  };

  handleAddStringChange = (event) => {
    this.setState({newString: event.target.value});
  }

  render() {
    const contents = this.state.contents.map((item, index) => {
      return <p key={index}>{item}</p>;
    });

    return <div>
      {contents}
      <form onSubmit={this.handleAddString}>
      <label><input type="text" value={this.state.newString} onChange={this.handleAddStringChange} /></label>
        <input type="submit" value="Add" />
      </form>
    </div>;
  }
}

export default MutableStringSet;