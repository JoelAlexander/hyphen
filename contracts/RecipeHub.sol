//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';
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
    mapping(string => address) spacesByName;

    constructor() {
        spaces = new AddressSet();
    }

    modifier isActiveSpace(RecipeSpace space) {
        require(spaces.contains(address(space)), "Must be an active recipe space");
        _;
    }

    function createRecipeSpace(string memory name) external {
        require(spacesByName[name] == address(0), "Recipe space with name must not already exist");
        RecipeSpace space = new RecipeSpace(name);
        spaces.add(address(space));
        spacesByName[name] = address(space);
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

    function removeRecipeSpace(RecipeSpace space) external {
        spaces.remove(address(space));
        delete spacesByName[space.name()];
        emit RecipeSpaceChanged(
            msg.sender,
            RecipeSpaceChangeType.REMOVED,
            space);
    }

    function recipeSpaceByName(string memory name) external view returns (RecipeSpace) {
        return RecipeSpace(spacesByName[name]);
    }
}
