//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Recipe.sol";

contract Preparation {

	Recipe recipe;
	uint scalePecentage;
	uint nextStepIndex;
	uint nextStepBlockHint;

	constructor(Recipe _recipe, uint _scalePecentage) {
		require(scalePecentage > 0, "Preparation must have non-zero scale percentage.");
		recipe = _recipe;
		scalePecentage = _scalePecentage;
	}

	function completeStep(uint completedStepIndex) external {
		nextStepIndex = completedStepIndex + 1;
		nextStepBlockHint = 0;
	}

	function completeStep(uint completedStepIndex, uint _nextStepBlockHint) external {
		nextStepIndex = completedStepIndex + 1;
		nextStepBlockHint = _nextStepBlockHint;
	}

	function isCompleted() external view returns (bool) {
		return nextStepIndex == recipe.getStepsCount();
	}

	function getRecipe() external view returns (Recipe) {
		return recipe;
	}

	function getNextStep() external view returns (uint, uint) {
		return (nextStepIndex, nextStepBlockHint);
	}
}
