//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';

contract Onboard {

  event Knocked(address indexed addr, string memo);
  event Onboarded(address indexed addr, string memo);
  event Offboarded(address indexed addr, string memo);

  address public owner;
  AddressSet public members;

  constructor(address _owner) {
    owner = _owner;
    members = new AddressSet(address(this));
  }

  modifier onlyOwner() {
    require(owner == address(0) || owner == msg.sender);
    _;
  }

  function knock(string calldata memo) external {
    emit Knocked({addr: tx.origin, memo: memo });
  }

  function onboard(address addr, string calldata memo) external onlyOwner {
    members.add(addr);
    emit Onboarded({addr: addr, memo: memo});
  }

  function offboard(address addr, string calldata memo) external onlyOwner {
    members.remove(addr);
    emit Offboarded({addr: addr, memo: memo});
  }
}
