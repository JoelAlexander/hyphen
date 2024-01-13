//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';

contract ChallengeResponseGame {

	event NewChallenge(string challenge);

	address private owner;
	string private challenge;

	modifier onlyOwner() {
		require(owner == msg.sender);
		_;
	}

	constructor(address _owner) {
		owner = _owner;
	}

	function newChallenge(string calldata challenge) public onlyOwner {
		emit NewChallenge(challenge);
	}
}
