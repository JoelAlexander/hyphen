//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract StringSet {

    mapping(string => uint) indicies;
    mapping(uint => bool) present;
    string[] strings;

    function add(string memory str) external {
        require(indicies[str] == 0, "String must not already be added");
        uint index = strings.length + 1;
        indicies[str] = index;
        present[index] = true;
        strings.push(str);
    }

    function addAll(string[] memory strs) external {
        for (uint i = 0; i< strs.length; i++) {
            this.add(strs[i]);
        }
    }

    function remove(string memory str) external {
        require(indicies[str] != 0, "String must already be added");
        present[indicies[str]] = false;
        indicies[str] = 0;
    }

    function removeAll(string[] memory strs) external {
        for (uint i = 0; i< strs.length; i++) {
            this.remove(strs[i]);
        }
    }

    function contains(string memory str) external view returns (bool) {
        return indicies[str] != 0;
    }

    function contents() external view returns (string[] memory) {
        uint count = 0;
        string[] memory big = new string[](strings.length);
        for (uint i = 0; i < strings.length; i++) {
            if (present[i + 1]) {
                big[count] = strings[i];
                count = count + 1;
            }
        }

        string[] memory trimmed = new string[](count);
        for (uint i = 0; i < count; i++) {
            trimmed[i] = big[i];
        }

        return trimmed;
    }
}
