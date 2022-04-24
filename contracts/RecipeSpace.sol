//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./AddressSet.sol";
import "./Recipe.sol";

struct ActiveRecipe {
	Recipe recipe;
	uint scalePercentage;
	uint stepIndex;
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
		ActiveRecipe activeRecipe);

	AddressSet recipes;
	mapping(Recipe => ActiveRecipe) recipeStatus;

	constructor() {
		recipes = new AddressSet();
	}

	function startRecipe(address creator, Recipe recipe, uint scalePercentage) external {
		require(scalePercentage > 0, "Scale percentage must not be 0");
		ActiveRecipe memory newRecipe = 
			ActiveRecipe({
				recipe: recipe,
				scalePercentage: scalePercentage,
				stepIndex: 0});
		recipes.add(address(recipe));
		recipeStatus[recipe] = newRecipe;
		emit RecipeChanged(
			creator,
			RecipeChangeType.STARTED,
			newRecipe);
	}

	function updateRecipeStep(address creator, Recipe recipe, uint stepIndex) external {
		require(recipes.contains(address(recipe)), "Recipe must be already started");
		require(stepIndex <= recipe.getStepsCount(), "Step index must be less than or equal than the number of steps.");
		ActiveRecipe memory updatedRecipe = recipeStatus[recipe];
		updatedRecipe.stepIndex = stepIndex;
		recipeStatus[recipe] = updatedRecipe;
		emit RecipeChanged(
			creator,
			RecipeChangeType.UPDATED,
			updatedRecipe);
	}

	function endRecipe(address creator, Recipe recipe) external {
		ActiveRecipe memory activeRecipe = recipeStatus[recipe];
		delete recipeStatus[recipe];
		recipes.remove(address(recipe));
		emit RecipeChanged(
			creator,
			RecipeChangeType.ENDED,
			activeRecipe);
	}

	function activeRecipes() external view returns (ActiveRecipe[] memory) {
		address[] memory addresses = recipes.contents();
        ActiveRecipe[] memory converted = new ActiveRecipe[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
            converted[i] = recipeStatus[Recipe(addresses[i])];
        }
        return converted;
	}
}
