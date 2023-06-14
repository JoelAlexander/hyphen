//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@local-blockchain-toolbox/contract-primitives/contracts/AddressSet.sol';
import "./RecipeSpace.sol";

contract RecipeHub {

    event RecipeSpaceAdded(address by, RecipeSpace recipeSpace);
    event RecipeSpaceUpdated(address by, RecipeSpace recipeSpace);
    event RecipeSpaceRemoved(address by, RecipeSpace recipeSpace);

    AddressSet spaces;
    mapping(string => address) spacesByName;

    constructor() {
        spaces = new AddressSet(address(this));
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
        emit RecipeSpaceAdded(msg.sender, space);
    }

    function startRecipeInSpace(
        RecipeSpace space,
        Recipe recipe,
        uint scalePercentage
    ) isActiveSpace(space) external {
        space.startRecipe(msg.sender, recipe, scalePercentage);
        emit RecipeSpaceUpdated(msg.sender, space);
    }

    function updateRecipeStepInSpace(
        RecipeSpace space,
        Recipe recipe,
        uint stepIndex
    ) isActiveSpace(space) external {
        space.updateRecipeStep(msg.sender, recipe, stepIndex);
        emit RecipeSpaceUpdated(msg.sender, space);
    }

    function endRecipeInSpace(
        RecipeSpace space,
        Recipe recipe
    ) isActiveSpace(space) external {
        space.endRecipe(msg.sender, recipe);
        emit RecipeSpaceUpdated(msg.sender, space);
    }

    function removeRecipeSpace(RecipeSpace space) external {
        spaces.remove(address(space));
        delete spacesByName[space.name()];
        emit RecipeSpaceRemoved(msg.sender, space);
    }

    function recipeSpaceByName(string memory name) external view returns (RecipeSpace) {
        return RecipeSpace(spacesByName[name]);
    }
}
