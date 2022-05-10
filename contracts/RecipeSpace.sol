//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./AddressSet.sol";
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

	enum RecipeChangeType {
		STARTED,
		UPDATED,
		ENDED
	}

	event RecipeChanged(
		address creator,
		RecipeChangeType changeType,
		Recipe recipeAddress);

	string public name;
	AddressSet recipes;
	mapping(Recipe => RecipeStatus) recipeStatus;

	constructor(string memory _name) {
		name = _name;
		recipes = new AddressSet();
	}

	function startRecipe(address creator, Recipe recipe, uint scalePercentage) external {
		require(scalePercentage > 0, "Scale percentage must not be 0");
		RecipeStatus memory status = RecipeStatus({stepIndex: 0, scalePercentage: scalePercentage});
		recipes.add(address(recipe));
		recipeStatus[recipe] = status;
		emit RecipeChanged(
			creator,
			RecipeChangeType.STARTED,
			recipe);
	}

	function updateRecipeStep(address creator, Recipe recipe, uint stepIndex) external {
		require(recipes.contains(address(recipe)), "Recipe must be already started");
		require(stepIndex <= recipe.getStepsCount(), "Step index must be less than or equal than the number of steps.");
		RecipeStatus memory updatedStatus = recipeStatus[recipe];
		updatedStatus.stepIndex = stepIndex;
		recipeStatus[recipe] = updatedStatus;
		emit RecipeChanged(
			creator,
			RecipeChangeType.UPDATED,
			recipe);
	}

	function endRecipe(address creator, Recipe recipe) external {
		delete recipeStatus[recipe];
		recipes.remove(address(recipe));
		emit RecipeChanged(
			creator,
			RecipeChangeType.ENDED,
			recipe);
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
