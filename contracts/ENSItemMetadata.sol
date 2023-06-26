// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol';
import './ItemShare.sol';

contract ENSItemMetadata {

    ItemShare public itemShare;
    ENS public ens;
    PublicResolver public resolver;
    bytes32 public rootNode;

    event MetadataUpdated(uint256 indexed id, string metadata);

    modifier onlyItemOwner(uint256 id) {
      require(msg.sender == itemShare.getItem(id).owner, "Must be the owner");
      _;
    }

    constructor(ItemShare _itemShare, ENS _ens, PublicResolver _resolver, bytes32 _rootNode) {
      itemShare = _itemShare;
      ens = _ens;
      resolver = _resolver;
      rootNode = _rootNode;
    }

    function addItemMetadata(uint256 id, string calldata metadata) external onlyItemOwner(id) {
      bytes32 labelHash = keccak256(abi.encodePacked(id));
      bytes32 node = keccak256(abi.encodePacked(rootNode, labelHash));
      ens.setSubnodeOwner(rootNode, labelHash, address(this));
      ens.setResolver(node, address(resolver));
      resolver.setText(node, 'metadata', metadata);
      emit MetadataUpdated(id, metadata);
    }

    function updateItemMetadata(uint256 id, string calldata metadata) external onlyItemOwner(id) {
      bytes32 node = keccak256(abi.encodePacked(rootNode, keccak256(abi.encodePacked(id))));
      resolver.setText(node, 'metadata', metadata);
      emit MetadataUpdated(id, metadata);
    }

    function removeItemMetadata(uint256 id) external onlyItemOwner(id) {
      bytes32 labelHash = keccak256(abi.encodePacked(id));
      bytes32 node = keccak256(abi.encodePacked(rootNode, labelHash));
      resolver.setText(node, 'metadata', '');
      ens.setResolver(node, address(0));
      ens.setSubnodeOwner(node, labelHash, address(0));
      emit MetadataUpdated(id, '');
    }

    function getMetadata(uint256 id) public view returns (string memory) {
      bytes32 node = keccak256(abi.encodePacked(rootNode, keccak256(abi.encodePacked(id))));
      return resolver.text(node, 'metadata');
    }
}