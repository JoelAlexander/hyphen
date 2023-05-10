import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import MutableStringSet from "./MutableStringSet";
import RecipeSpaceDetail from "./RecipeSpaceDetail";
import RecipeHub from 'contracts/RecipeHub.sol/RecipeHub.json';
import RecipeSpace from 'contracts/RecipeSpace.sol/RecipeSpace.json';
const ethers = require("ethers");

const RecipePreparation = (props) => {
  const context = useContext(HyphenContext);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [spaceData, setSpaceData] = useState(null);
  const [date, setDate] = useState(new Date());
  const recipeHubContract = context.getContract("recipehub.hyphen")

  useEffect(() => {
    update();
  }, [date, props.blockNumber]);

  const update = () => {
    recipeHubContract
      .recipeSpaceByName(date.toDateString())
      .then((space) => {
        new ethers.Contract(space, RecipeSpace.abi, context.signer)
          .getData()
          .catch((error) => {
            setSelectedSpace(null);
            setSpaceData(null);
          })
          .then((spaceData) => {
            setSelectedSpace(space);
            setSpaceData(spaceData);
          })
      }, (reason) => {
        setSelectedSpace(null);
        setSpaceData(null);
      });
  };

  const createRecipeSpace = (name) => {
    recipeHubContract.createRecipeSpace(name);
  };

  const removeRecipeSpace = (index) => {
    const space = spaces[index];
    recipeHubContract.removeRecipeSpace(space.address);
  };

  const startRecipeInSpace = (space, recipe, scalePercentage) => {
    recipeHubContract.startRecipeInSpace(space, recipe, scalePercentage);
  };

  const removeRecipeFromSpace = (space, recipe) => {
    recipeHubContract.endRecipeInSpace(space, recipe);
  };

  const updateRecipeStepInSpace = (space, recipe, stepIndex) => {
    recipeHubContract.updateRecipeStepInSpace(space, recipe, stepIndex);
  };

  const addDays = (date, days) => {
    var date = new Date(date.valueOf());
    date.setDate(date.getDate() + days);
    return date;
  }

  const selectTomorrow = () => {
    setSelectedRecipeIndex(0);
    setDate(addDays(date, 1));
  };

  const selectYesterday = () => {
    setSelectedRecipeIndex(0);
    setDate(addDays(date, -1));
  };

  const selectRecipeIndex = (index) => {
    setSelectedRecipeIndex(index);
  };

  const currentDate = date.toDateString();
  const selectedSpaceDetail = spaceData ?
    <RecipeSpaceDetail
      selectedRecipeIndex={selectedRecipeIndex}
      selectRecipeIndex={selectRecipeIndex}
      spaceData={spaceData}
      startRecipe={(recipe, scalePercentage) => startRecipeInSpace(selectedSpace, recipe, scalePercentage)}
      removeRecipe={(recipe) => removeRecipeFromSpace(selectedSpace, recipe)}
      updateRecipeStep={(recipe, stepIndex) => updateRecipeStepInSpace(selectedSpace, recipe, stepIndex)}/> :
    <button onClick={() => createRecipeSpace(currentDate)}>New recipe group</button>;

  return <div>
    <div className="pure-g">
      <div className="pure-u-1-1" style={{display: "flex", justifyContent: "space-between"}}>
        <button onClick={selectYesterday}><span>&lt;</span></button>
        <span>{currentDate}</span>
        <button onClick={selectTomorrow}><span>&gt;</span></button>
      </div>
    </div>
    {selectedSpaceDetail}
  </div>;
};

export default RecipePreparation;
