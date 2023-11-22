//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@local-blockchain-toolbox/ens-contracts/contracts/registry/ENS.sol';
import '@local-blockchain-toolbox/ens-contracts/contracts/resolvers/profiles/AddrResolver.sol';
import '@local-blockchain-toolbox/ens-contracts/contracts/resolvers/profiles/NameResolver.sol';
import '@local-blockchain-toolbox/ens-contracts/contracts/resolvers/profiles/TextResolver.sol';

contract HyphenModule {

  bytes32 public constant PUBLIC_RESOLVER_NODE = 0xad3c37868ae515dba167cae3a0604972edf91b84b773bb7f0d69e6c5bb930f59;

  ENS public ens;
  bytes32 public rootNode;

  constructor(ENS _ens, bytes32 _rootNode) {
    ens = _ens;
    rootNode = _rootNode;
  }

  function connect() external {
    bytes32 label = labelForAddress(msg.sender);
    ens.setSubnodeOwner(rootNode, label, msg.sender);
  }

  function disconnect() external {
    bytes32 label = labelForAddress(msg.sender);
    ens.setSubnodeOwner(rootNode, label, address(0));
  }

  function setupName(string calldata name) external {
    bytes32 label = labelForAddress(msg.sender);
    bytes32 accountNode = keccak256(abi.encodePacked(rootNode, label));
    TextResolver resolver = TextResolver(ens.resolver(PUBLIC_RESOLVER_NODE));
    resolver.setText(accountNode, "name", name);
    ens.setResolver(accountNode, address(resolver));
  }

  function getName(address addr) external view returns (string memory) {
    bytes32 label = labelForAddress(addr);
    bytes32 accountNode = keccak256(abi.encodePacked(rootNode, label));
    TextResolver resolver = TextResolver(ens.resolver(accountNode));
    if (address(resolver) == address(0)) {
      return '';
    } else {
      return resolver.text(accountNode, "name");
    }
  }

  function labelForAddress(address addr) public pure returns (bytes32) {
    return sha3HexAddress(addr);
  }

  function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
    addr;
    ret; // Stop warning us about unused variables
    assembly {
      let lookup := 0x3031323334353637383961626364656600000000000000000000000000000000

      for { let i := 40 } gt(i, 0) { } {
        i := sub(i, 1)
        mstore8(i, byte(and(addr, 0xf), lookup))
        addr := div(addr, 0x10)
        i := sub(i, 1)
        mstore8(i, byte(and(addr, 0xf), lookup))
        addr := div(addr, 0x10)
      }

      ret := keccak256(0, 40)
    }
  }
}
