//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract AddressSet {

    mapping(address => uint) indicies;
    mapping(uint => bool) present;
    address[] addresses;

    function add(address addr) external {
        require(indicies[addr] == 0, "Address must not already be added");
        uint index = addresses.length + 1;
        indicies[addr] = index;
        present[index] = true;
        addresses.push(addr);
    }

    function addAll(address[] memory addrs) external {
        for (uint i = 0; i< addrs.length; i++) {
            this.add(addrs[i]);
        }
    }

    function remove(address addr) external {
        require(indicies[addr] != 0, "Address must already be added");
        present[indicies[addr]] = false;
        indicies[addr] = 0;
    }

    function removeAll(address[] memory addrs) external {
        for (uint i = 0; i< addrs.length; i++) {
            this.remove(addrs[i]);
        }
    }

    function contains(address addr) external view returns (bool) {
        return indicies[addr] != 0;
    }

    function contents() external view returns (address[] memory) {
        uint count = 0;
        address[] memory big = new address[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
            if (present[i + 1]) {
                big[count] = addresses[i];
                count = count + 1;
            }
        }

        address[] memory trimmed = new address[](count);
        for (uint i = 0; i < count; i++) {
            trimmed[i] = big[i];
        }

        return trimmed;
    }
}
