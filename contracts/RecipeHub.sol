//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./AddressSet.sol";
import "./RecipeSpace.sol";

contract RecipeHub {

    enum RecipeSpaceChangeType {
        CREATED,
        UPDATED,
        REMOVED
    }

    event RecipeSpaceChanged(
        address addr,
        RecipeSpaceChangeType changeType, 
        RecipeSpace recipeSpace);

    AddressSet spaces;

    constructor() {
        spaces = new AddressSet();
    }

    modifier isActiveSpace(RecipeSpace space) {
        require(spaces.contains(address(space)), "Must be an active recipe space");
        _;
    }

    function createRecipeSpace() external {
        RecipeSpace space = new RecipeSpace();
        spaces.add(address(space));
        emit RecipeSpaceChanged(
            msg.sender,
            RecipeSpaceChangeType.CREATED,
            space);
    }

    function startRecipeInSpace(
        RecipeSpace space,
        Recipe recipe,
        uint scalePercentage
    ) isActiveSpace(space) external {
        space.startRecipe(msg.sender, recipe, scalePercentage);
        emit RecipeSpaceChanged(
            msg.sender,
            RecipeSpaceChangeType.UPDATED,
            space);
    }

    function updateRecipeStepInSpace(
        RecipeSpace space,
        Recipe recipe,
        uint stepIndex
    ) isActiveSpace(space) external {
        space.updateRecipeStep(msg.sender, recipe, stepIndex);
        emit RecipeSpaceChanged(
            msg.sender,
            RecipeSpaceChangeType.UPDATED,
            space);
    }

    function endRecipeInSpace(
        RecipeSpace space,
        Recipe recipe
    ) isActiveSpace(space) external {
        space.endRecipe(msg.sender, recipe);
        emit RecipeSpaceChanged(
            msg.sender,
            RecipeSpaceChangeType.UPDATED,
            space);
    }

    function removeRecipeSpace(RecipeSpace space) isActiveSpace(space) external {
        spaces.remove(address(space));
        emit RecipeSpaceChanged(
            msg.sender,
            RecipeSpaceChangeType.REMOVED,
            space);
    }

    function activeRecipeSpaces() external view returns (RecipeSpace[] memory) {
        address[] memory addresses = spaces.contents();
        RecipeSpace[] memory converted = new RecipeSpace[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
            converted[i] = RecipeSpace(addresses[i]);
        }
        return converted;
    }
}
