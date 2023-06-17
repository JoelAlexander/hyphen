// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract ItemShare {

    struct Item {
        address owner;
        address holder;
        uint256 termEnd;
        bool available;
    }

    event ItemAdded(address indexed owner, uint256 indexed id);
    event ItemRemoved(address indexed owner, uint256 indexed id);
    event ItemRequested(address indexed owner, address indexed requester, uint256 indexed id, uint256 term);
    event RequestDenied(address indexed owner, address indexed requester, uint256 indexed id, uint256 term);
    event RequestApproved(address indexed owner, address indexed holder, uint256 indexed id, uint256 termEnd);
    event ItemReturned(address indexed owner, address indexed holder, uint256 indexed id, bool overdue, bool returnedByOwner);
    event OwnershipTransferred(address indexed fromOwner, address indexed toOwner, uint256 indexed id);

    mapping(uint256 => Item) public items;
    mapping(uint256 => mapping(address => uint256)) requests;
    address public controller;

    constructor(address _controller) {
        controller = _controller;
    }

    modifier onlyController {
        require(msg.sender == controller, "Only controller can call this function");
        _;
    }

    function addItem() external onlyController returns (uint256) {
        uint256 id = uint256(keccak256(abi.encodePacked(msg.sender, block.number)));
        items[id] = Item({owner: msg.sender, holder: msg.sender, termEnd: 0, available: true});
        emit ItemAdded(msg.sender, id);
        return id;
    }

    function removeItem(uint256 id) external onlyController {
        require(msg.sender == items[id].owner, "Must be the owner of the item");
        delete items[id];
        emit ItemRemoved(msg.sender, id);
    }

    function changeOwnership(uint256 id, address newOwner) external {
        require(msg.sender == items[id].owner, "Must be the owner of the item");
        items[id].owner = newOwner;
        emit OwnershipTransferred(items[id].owner, newOwner, id);
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
        items[id].termEnd = termEnd;
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
        bool isPastDue = block.number > items[id].termEnd;
        bool isSelfReturn = owner == holder;
        require(msg.sender == items[id].holder || (msg.sender == owner && isPastDue),
            "Must be the holder of the item or the owner returning a past due item");
        items[id].holder = owner;
        items[id].available = true;
        items[id].termEnd = 0;
        emit ItemReturned(owner, holder, id, isPastDue && !isSelfReturn, msg.sender == owner);
    }

    function getItem(uint256 id) public view returns (Item memory) {
        return items[id];
    }
}