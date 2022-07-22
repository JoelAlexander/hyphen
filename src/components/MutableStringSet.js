import React from 'react';
import HyphenContext from './HyphenContext';
import StringSet from 'contracts/StringSet.sol/StringSet.json';
const ethers = require("ethers");

class MutableStringSet extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      contents: [],
      newString: ""
    };
  };

  componentDidMount() {
    this.getContract()
      .contents()
      .then((result) => {
        this.setState({contents:result});
      });
  }

  getContract = () => {
    return new ethers.Contract(
      props.contractAddress,
      StringSet.abi,
      this.context.signer);
  };

  addString = (str) => {
    this.context.executeTransaction(
      this.getContract().add(str),
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
  };

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

MutableStringSet.contextType = HyphenContext;

export default MutableStringSet;
