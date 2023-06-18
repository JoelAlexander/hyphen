// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol';
import './ItemShare.sol';

contract ENSItemShare {

    ENS ens;
    PublicResolver public resolver;
    bytes32 public rootNode;

    ItemShare public itemShare;

    event MetadataUpdated(uint256 indexed id, string metadata);

    constructor(ENS _ens, PublicResolver _resolver, bytes32 _rootNode) {
        ens = _ens;
        resolver = _resolver;
        rootNode = _rootNode;
        itemShare = new ItemShare(address(this));
    }

    function addItem(string calldata metadata) external {
        uint256 id = itemShare.addItem(msg.sender);
        bytes32 labelHash = keccak256(abi.encodePacked(id));
        bytes32 node = keccak256(abi.encodePacked(rootNode, labelHash));
        ens.setSubnodeOwner(rootNode, labelHash, address(this));
        ens.setResolver(node, address(resolver));
        resolver.setText(node, 'metadata', metadata);
        emit MetadataUpdated(id, metadata);
    }

    function removeItem(uint256 id) external {
        bytes32 labelHash = keccak256(abi.encodePacked(id));
        bytes32 node = keccak256(abi.encodePacked(rootNode, labelHash));
        itemShare.removeItem(msg.sender, id);
        resolver.setText(node, 'metadata', '');
        ens.setResolver(node, address(0));
        ens.setSubnodeOwner(node, labelHash, address(0));
    }

    function changeOwnership(address newOwner, uint256 id) external {
        itemShare.changeOwnership(msg.sender, newOwner, id);
    }

    function updateMetadata(uint256 id, string calldata metadata) external {
        require(msg.sender == itemShare.getItem(id).owner, "Must be the owner");
        bytes32 node = keccak256(abi.encodePacked(rootNode, keccak256(abi.encodePacked(id))));
        resolver.setText(node, 'metadata', metadata);
        emit MetadataUpdated(id, metadata);
    }

    function getMetadata(uint256 id) public view returns (string memory) {
        bytes32 node = keccak256(abi.encodePacked(rootNode, keccak256(abi.encodePacked(id))));
        return resolver.text(node, 'metadata');
    }
}
