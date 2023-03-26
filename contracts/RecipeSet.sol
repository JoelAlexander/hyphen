//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';
import "./Recipe.sol";

contract RecipeSet {

    event RecipeCreated(RecipeData recipeData);

    AddressSet recipes;

    constructor() {
        recipes = new AddressSet();
    }

    function add(Recipe recipe) external {
        recipes.add(address(recipe));
    }

    function remove(Recipe recipe) external {
        recipes.remove(address(recipe));
    }

    function create(string memory name, Ingredient[] memory ingredients, string[] memory steps) external {
        Recipe recipe = new Recipe(msg.sender, name, ingredients, steps);
        this.add(recipe);
        emit RecipeCreated(recipe.getData());
    }

    function contents() external view returns (RecipeData[] memory) {
        address[] memory addresses = recipes.contents();
        RecipeData[] memory converted = new RecipeData[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
            converted[i] = Recipe(addresses[i]).getData();
        }
        return converted;
    }
}
