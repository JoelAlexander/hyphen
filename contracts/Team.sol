//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./AddressGroup.sol";
import "./Thumbs.sol";

contract Team {

  address public owner;
  AddressGroup public members;
  AddressGroup public mentors;
  Thumbs public thumbs;

  constructor(address _owner) {
    owner = _owner;
    members = new AddressGroup(address(this));
    mentors = new AddressGroup(address(this));
    thumbs = new Thumbs(address(this));
  }

  modifier onlyOwnerOrMentor() {
    require(owner == msg.sender || mentors.members().contains(msg.sender));
    _;
  }

  modifier onlyMember() {
    require(members.members().contains(msg.sender));
    _;
  }

  function knockForMembership(string calldata memo) external {
    members.knock(memo);
  }

  function onboardMember(address addr, string calldata memo) external onlyOwnerOrMentor {
    members.onboard(addr, memo);
  }

  function offboardMember(address addr, string calldata memo) external onlyOwnerOrMentor {
    members.offboard(addr, memo);
  }

  function knockForMentorship(string calldata memo) external onlyMember {
    mentors.knock(memo);
  }

  function onboardMentor(address addr, string calldata memo) external onlyOwnerOrMentor {
    mentors.onboard(addr, memo);
  }

  function offboardMentor(address addr, string calldata memo) external onlyOwnerOrMentor {
    mentors.offboard(addr, memo);
  }

  function propose(string calldata memo) external onlyMember {
    thumbs.propose(memo);
  }

  function thumbsUp(uint256 topic, string calldata memo) external onlyMember {
    thumbs.thumbsUp(topic, memo);
  }

  function thumbsDown(uint256 topic, string calldata memo) external onlyMember {
    thumbs.thumbsDown(topic, memo);
  }
}
