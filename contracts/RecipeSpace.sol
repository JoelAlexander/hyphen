//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';
import "./Recipe.sol";

struct RecipeStatus {
	uint stepIndex;
	uint scalePercentage;
}

struct ActiveRecipeData {
	RecipeData recipe;
	RecipeStatus status;
}

struct RecipeSpaceData {
	string name;
	ActiveRecipeData[] recipes;
}

contract RecipeSpace {

	event RecipeAdded(address by, Recipe recipe);
	event RecipeUpdated(address by, Recipe recipe);
	event RecipeRemoved(address by, Recipe recipe);

	string public name;
	AddressSet recipes;
	mapping(Recipe => RecipeStatus) recipeStatus;

	constructor(string memory _name) {
		name = _name;
		recipes = new AddressSet(address(this));
	}

	function startRecipe(address creator, Recipe recipe, uint scalePercentage) external {
		require(scalePercentage > 0, "Scale percentage must not be 0");
		RecipeStatus memory status = RecipeStatus({stepIndex: 0, scalePercentage: scalePercentage});
		recipes.add(address(recipe));
		recipeStatus[recipe] = status;
		emit RecipeAdded(creator, recipe);
	}

	function updateRecipeStep(address creator, Recipe recipe, uint stepIndex) external {
		require(recipes.contains(address(recipe)), "Recipe must be already started");
		require(stepIndex <= recipe.getData().steps.length, "Step index must be less than or equal than the number of steps.");
		RecipeStatus memory updatedStatus = recipeStatus[recipe];
		updatedStatus.stepIndex = stepIndex;
		recipeStatus[recipe] = updatedStatus;
		emit RecipeUpdated(creator, recipe);
	}

	function endRecipe(address creator, Recipe recipe) external {
		delete recipeStatus[recipe];
		recipes.remove(address(recipe));
		emit RecipeRemoved(creator, recipe);
	}

	function activeRecipeData(Recipe recipe) external view returns (ActiveRecipeData memory) {
		return ActiveRecipeData({
			recipe: recipe.getData(),
			status: recipeStatus[recipe]
		});
	}

	function activeRecipes() external view returns (ActiveRecipeData[] memory) {
		address[] memory addresses = recipes.contents();
        ActiveRecipeData[] memory converted = new ActiveRecipeData[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
            converted[i] = this.activeRecipeData(Recipe(addresses[i]));
        }
        return converted;
	}

	function getData() external view returns (RecipeSpaceData memory) {
		return RecipeSpaceData({name: name, recipes: this.activeRecipes()});
	}
}
