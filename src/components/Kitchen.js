import React, { useEffect } from 'react';
import MutableStringSet from "./MutableStringSet.js";
import Select from 'react-select';
const ethers = require("ethers");

class Kitchen extends React.Component {

	render() {
		return <div>
			<h4>Unit measures</h4>
			<MutableStringSet
				addMessage={this.props.addMessage}
				executeTransaction={this.props.executeTransaction}
				accessDeployedContract={this.props.accessDeployedContract}
				contractAddress={this.props.measuresSetAddress} />
		</div>;
	}
}

export default Kitchen;