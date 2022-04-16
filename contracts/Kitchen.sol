//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./AddressSet.sol";
import "./Recipe.sol";

struct PreparationStatus {
	uint scalePercentage;
	uint stepIndex;
}

struct ActivePreparation {
	Recipe recipe;
	PreparationStatus status;
}

contract Kitchen {

	event PreparationUpdated(ActivePreparation preparation);

	AddressSet active;
	mapping(Recipe => PreparationStatus) status;

	function startRecipe(Recipe recipe, uint scalePercentage) external {
		require(scalePercentage > 0, "Scale percentage must not be 0");
		PreparationStatus memory newStatus = PreparationStatus({scalePercentage: scalePercentage, stepIndex: 0});
		active.add(address(recipe));
		status[recipe] = newStatus;
		emit PreparationUpdated(ActivePreparation({recipe: recipe, status: newStatus}));
	}

	function updatePreparationStep(Recipe recipe, uint stepIndex) external {
		require(active.contains(address(recipe)), "Recipe must be an active preparation");
		require(stepIndex <= recipe.getStepsCount(), "Step index must be less than or equal than the number of steps.");
		PreparationStatus memory currentStatus = status[recipe];
		PreparationStatus memory newStatus = PreparationStatus({scalePercentage: currentStatus.scalePercentage, stepIndex: stepIndex});
		status[recipe] = newStatus;
		emit PreparationUpdated(ActivePreparation({recipe: recipe, status: newStatus}));
	}

	function stopPreparation(Recipe recipe) external {
		PreparationStatus memory newStatus = PreparationStatus({scalePercentage: 0, stepIndex: 0});
		active.remove(address(recipe));
		delete status[recipe];
		emit PreparationUpdated(ActivePreparation({recipe: recipe, status: newStatus}));
	}

	function activePreparations() external view returns (ActivePreparation[] memory) {
		address[] memory addresses = active.contents();
        ActivePreparation[] memory converted = new ActivePreparation[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
        	Recipe recipe = Recipe(addresses[i]);
            converted[i] = ActivePreparation({recipe: recipe, status: status[recipe]});
        }
        return converted;
	}
}
