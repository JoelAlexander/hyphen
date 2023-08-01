//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Thumbs {

  event Proposed(address indexed addr, uint256 indexed topic, string memo);
  event ThumbsUp(address indexed addr, uint256 indexed topic, string memo);
  event ThumbsDown(address indexed addr, uint256 indexed topic, string memo);

  function propose(string calldata memo) external {
    uint256 topic = uint256(keccak256(abi.encodePacked(memo)));
    emit Proposed({addr: tx.origin, topic: topic, memo: memo });
  }

  function thumbsUp(uint256 topic, string calldata memo) external {
    emit ThumbsUp({addr: tx.origin, topic: topic, memo: memo});
  }

  function thumbsDown(uint256 topic, string calldata memo) external {
    emit ThumbsDown({addr: tx.origin, topic: topic, memo: memo });
  }
}
