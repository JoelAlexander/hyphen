// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@local-blockchain-toolbox/contract-primitives/contracts/StringSet.sol";
import "@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol";

contract Curation {

    mapping(address => StringSet) private addressToTags;
    mapping(string => AddressSet) private tagToAddresses;
    StringSet private allTags;
    AddressSet private allAddresses;

    constructor() {
        allTags = new StringSet();
        allAddresses = new AddressSet();
    }

    function addTag(address addr, string memory tag) external {
        if (address(addressToTags[addr]) == address(0)) {
            addressToTags[addr] = new StringSet();
        }
        addressToTags[addr].add(tag);

        if (address(tagToAddresses[tag]) == address(0)) {
            tagToAddresses[tag] = new AddressSet();
        }
        tagToAddresses[tag].add(addr);

        if (!allTags.contains(tag)) {
            allTags.add(tag);
        }

        if (!allAddresses.contains(addr)) {
            allAddresses.add(addr);
        }
    }

    function removeTag(address addr, string memory tag) external {
        addressToTags[addr].remove(tag);
        tagToAddresses[tag].remove(addr);

        if (addressToTags[addr].count() == 0) {
            allAddresses.remove(addr);
        }

        if (tagToAddresses[tag].count() == 0) {
            allTags.remove(tag);
        }
    }

    function getTagsForAddress(address addr) external view returns (string[] memory) {
        return addressToTags[addr].contents();
    }

    function getAddressesWithTag(string memory tag) external view returns (address[] memory) {
        return tagToAddresses[tag].contents();
    }

    function getAllTags() external view returns (string[] memory) {
        return allTags.contents();
    }

    function getAllTaggedAddresses() external view returns (address[] memory) {
        return allAddresses.contents();
    }
}
