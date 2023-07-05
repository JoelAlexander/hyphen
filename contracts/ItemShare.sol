// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

struct Item {
  address owner;
  address holder;
  uint256 termEnd;
  bool available;
}

contract ItemShare {

  event ItemAdded(address indexed owner, uint256 indexed id);
  event ItemRemoved(address indexed owner, uint256 indexed id);
  event ItemRequested(address indexed owner, address indexed requester, uint256 indexed id, uint256 term);
  event RequestDenied(address indexed owner, address indexed requester, uint256 indexed id, uint256 term);
  event RequestApproved(address indexed owner, address indexed requester, uint256 indexed id, uint256 termEnd);
  event ItemReturned(address indexed owner, address indexed requester, uint256 indexed id, bool overdue);
  event OwnershipTransferred(address indexed fromOwner, address indexed toOwner, uint256 indexed id);

  mapping(uint256 => Item) public items;
  mapping(uint256 => mapping(address => uint256)) requests;

  function createItem() external returns (uint256) {
    uint256 id = uint256(keccak256(abi.encodePacked(address(this), msg.sender, block.number)));
    require(items[id].owner == address(0), "Item must not already exist");
    items[id] = Item({owner: msg.sender, holder: msg.sender, termEnd: 0, available: true});
    emit ItemAdded(msg.sender, id);
    return id;
  }

  function deleteItem(uint256 id) external {
    require(msg.sender == items[id].owner, "Owner must be the current owner of the item");
    require(msg.sender == items[id].holder, "Owner must be the current holder of the item");
    delete items[id];
    emit ItemRemoved(msg.sender, id);
  }

  function transferOwnership(address newOwner, uint256 id) external {
    require(msg.sender == items[id].owner, "Owner must be the current owner of the item");
    items[id].owner = newOwner;
    emit OwnershipTransferred(msg.sender, newOwner, id);
  }

  function requestItem(uint256 id, uint256 term) external {
    require(items[id].owner != address(0), "Item must exist and have an owner");
    requests[id][msg.sender] = term;
    emit ItemRequested(items[id].owner, msg.sender, id, term);
  }

  function approveRequest(address requester, uint256 id, uint256 term) external {
    require(items[id].available, "Item must be available");
    require(msg.sender == items[id].owner, "Must be the owner of the item");
    require(term == requests[id][requester], "Approved term must match term proposed by requester");
    uint256 termEnd = block.number + term;
    items[id].holder = requester;
    items[id].termEnd = term == 0 ? 0 : termEnd;
    items[id].available = false;
    requests[id][requester] = 0;
    emit RequestApproved(msg.sender, requester, id, termEnd);
  }

  function denyRequest(address requester, uint256 id, uint256 term) external {
    require(msg.sender == items[id].owner, "Must be the owner of the item");
    require(term == requests[id][requester], "Denied term must match term proposed by requester");
    requests[id][requester] = 0;
    emit RequestDenied(msg.sender, requester, id, term);
  }

  function returnItem(uint256 id) external {
    address owner = items[id].owner;
    address holder = items[id].holder;
    uint256 termEnd = items[id].termEnd;
    bool isPastDue = (block.number > termEnd) && termEnd != 0;
    require(msg.sender == holder || (msg.sender == owner && isPastDue),
      "Must be the holder of the item or the owner returning a past due item");
    items[id].holder = owner;
    items[id].available = true;
    items[id].termEnd = 0;
    emit ItemReturned(owner, holder, id, isPastDue);
  }

  function getItem(uint256 id) public view returns (Item memory) {
    return items[id];
  }

  function getItems(uint256[] memory ids) public view returns (Item[] memory) {
    Item[] memory returnItems = new Item[](ids.length);
    for (uint256 i = 0; i < ids.length; i++) {
      returnItems[i] = getItem(ids[i]);
    }
    return returnItems;
  }
}
