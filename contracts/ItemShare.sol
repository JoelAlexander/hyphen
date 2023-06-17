// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract ItemShare {

    enum ItemStatus {Available, Requested, Unavailable}

    struct Item {
        address owner;
        address holder;
        address requestor;
        ItemStatus status;
    }

    event ItemAdded(address indexed owner, uint256 id);
    event ItemRemoved(address indexed owner, uint256 id);
    event ItemRequested(address indexed requestor, uint256 id);
    event RequestApproved(address indexed owner, address indexed holder, uint256 id);
    event RequestDenied(address indexed owner, uint256 id);
    event ItemReturned(address indexed returner, uint256 id);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner, uint256 id);

    mapping(uint256 => Item) public items;

    function addItem() external returns (uint256) {
        uint256 id = uint256(keccak256(abi.encodePacked(msg.sender, block.number)));
        items[id] = Item({owner: msg.sender, holder: msg.sender, requestor: address(0), status: ItemStatus.Available});
        emit ItemAdded(msg.sender, id);
        return id;
    }

    function removeItem(uint256 id) external {
        require(msg.sender == items[id].owner, "Must be the owner of the item");
        delete items[id];
        emit ItemRemoved(msg.sender, id);
    }

    function changeOwnership(uint256 id, address newOwner) external {
        require(msg.sender == items[id].owner, "Must be the current owner of the item");
        emit OwnershipTransferred(items[id].owner, newOwner, id);
        items[id].owner = newOwner;
        if (items[id].holder == msg.sender) {
            items[id].holder = newOwner;
        }
    }

    function requestItem(uint256 id) external {
        require(items[id].status == ItemStatus.Available, "Item must be available");
        items[id].requestor = msg.sender;
        items[id].status = ItemStatus.Requested;
        emit ItemRequested(msg.sender, id);
    }

    function approveRequest(uint256 id) external {
        require(msg.sender == items[id].owner, "Must be the owner of the item");
        require(items[id].status == ItemStatus.Requested, "Item must be requested");
        items[id].holder = items[id].requestor;
        items[id].requestor = address(0);
        items[id].status = ItemStatus.Unavailable;
        emit RequestApproved(msg.sender, items[id].holder, id);
    }

    function denyRequest(uint256 id) external {
        require(msg.sender == items[id].owner, "Must be the owner of the item");
        require(items[id].status == ItemStatus.Requested, "Item must be requested");
        items[id].requestor = address(0);
        items[id].status = ItemStatus.Available;
        emit RequestDenied(msg.sender, id);
    }

    function returnItem(uint256 id) external {
        require(items[id].holder == msg.sender || items[id].owner == msg.sender, "Must be the owner or holder of the item");
        require(items[id].status == ItemStatus.Unavailable, "Item must be held by someone");
        items[id].holder = items[id].owner;
        items[id].status = ItemStatus.Available;
        emit ItemReturned(msg.sender, id);
    }

    function getItem(uint256 id) public view returns (Item memory) {
        return items[id];
    }
}
