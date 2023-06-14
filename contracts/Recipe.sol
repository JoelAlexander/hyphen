//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

struct Ingredient {
    string ingredient;
    string unit;
    uint amount;
}

struct RecipeData {
    address author; 
    string name;
    Ingredient[] ingredients;
    string[] steps;
}

contract Recipe {

    address public author;
    string public name;
    Ingredient[] public ingredients;
    string[] public steps;

    constructor(
        address _author,
        string memory _name,
        Ingredient[] memory _ingredients,
        string[] memory _steps
    ) {
        require(_ingredients.length > 1, "Recipe must have more than one ingredient.");
        require(_steps.length > 0, "Recipe must have at least one step.");
        author = _author;
        name = _name;
        copyToStorage(_ingredients);
        copyToStorage(_steps);
    }

    function copyToStorage(Ingredient[] memory _ingredients) private {
        for (uint i = 0; i < _ingredients.length; i++) {
            ingredients.push(_ingredients[i]);
        }
    }

    function copyToStorage(string[] memory _steps) private {
        for (uint i = 0; i < _steps.length; i++) {
            steps.push(_steps[i]);
        }
    }

    function getData() external view returns (RecipeData memory) {
        return RecipeData({author: author, name: name, ingredients: ingredients, steps: steps});
    }
}
