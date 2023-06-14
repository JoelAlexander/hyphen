//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';
import "./Recipe.sol";

contract RecipeSet {

    AddressSet public recipes;

    constructor() {
        recipes = new AddressSet(address(this));
    }

    function remove(Recipe recipe) external {
        recipes.remove(address(recipe));
    }

    function create(string memory name, Ingredient[] memory ingredients, string[] memory steps) external {
        Recipe recipe = new Recipe(msg.sender, name, ingredients, steps);
        recipes.add(address(recipe));
    }
}
