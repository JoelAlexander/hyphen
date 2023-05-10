pragma solidity ^0.8.0;

contract Counter {
    uint256 public count;
    event Incremented(address indexed incrementer);

    function increment() public {
        count++;
        emit Incremented(msg.sender);
    }
}
