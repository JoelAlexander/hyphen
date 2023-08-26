//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Thumbs {

  event Proposed(address indexed addr, uint256 indexed topic, string memo);
  event Recalled(address indexed addr, uint256 indexed topic, string memo);
  event ThumbsUp(address indexed addr, uint256 indexed topic, string memo);
  event ThumbsDown(address indexed addr, uint256 indexed topic, string memo);

  address public owner;

  constructor(address _owner) {
    owner = _owner;
  }

  modifier onlyOwner() {
    require(owner == address(0) || owner == msg.sender);
    _;
  }

  function propose(string calldata memo) external onlyOwner {
    uint256 topic = uint256(keccak256(abi.encodePacked(memo)));
    emit Proposed({addr: tx.origin, topic: topic, memo: memo });
  }

  function recall(string calldata memo) external onlyOwner {
    uint256 topic = uint256(keccak256(abi.encodePacked(memo)));
    emit Recalled({addr: tx.origin, topic: topic, memo: memo });
  }

  function thumbsUp(uint256 topic, string calldata memo) external onlyOwner {
    emit ThumbsUp({addr: tx.origin, topic: topic, memo: memo});
  }

  function thumbsDown(uint256 topic, string calldata memo) external onlyOwner {
    emit ThumbsDown({addr: tx.origin, topic: topic, memo: memo });
  }
}
