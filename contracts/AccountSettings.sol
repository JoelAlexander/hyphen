// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.4;

import '@ensdomains/ens-contracts/contracts/registry/ENS.sol';
import '@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol';
import '@ensdomains/ens-contracts/contracts/registry/ReverseRegistrar.sol';
import '@ensdomains/ens-contracts/contracts/resolvers/profiles/AddrResolver.sol';
import '@ensdomains/ens-contracts/contracts/resolvers/profiles/TextResolver.sol';

contract AccountSettings {
  
  bytes32 public constant RootNode = bytes32(0);
  bytes32 public constant ResolverLabel = keccak256('resolver');
  bytes32 public constant PublicResolverNode = keccak256(abi.encodePacked(RootNode, ResolverLabel));

  ENS immutable ens;
  FIFSRegistrar immutable registrar;
  bytes32 immutable rootNode;

  constructor(ENS _ens, FIFSRegistrar _registrar, bytes32 _rootNode) {
    ens = _ens;
    registrar = _registrar;
    rootNode = _rootNode;
  }

  function setupName(bytes32 label) external {
    bytes32 nameNode = keccak256(abi.encodePacked(rootNode, label));
    AddrResolver resolver = AddrResolver(ens.resolver(PublicResolverNode));
    registrar.register(label, address(this));
    resolver.setAddr(nameNode, msg.sender);
    ens.setResolver(nameNode, address(resolver));
    ens.setOwner(nameNode, msg.sender);
  }

  function setSettings(bytes32 node, string calldata key, string calldata settings) external {
    TextResolver resolver = TextResolver(ens.resolver(node));
    resolver.setText(node, key, settings);
  }
}