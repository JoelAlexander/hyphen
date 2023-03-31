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

  useEffect(() => {
    update();
  }, [date, props.blockNumber]);

  const getHubContract = () => {
    return new ethers.Contract(
      "recipehub.hyphen",
      RecipeHub.abi,
      context.signer);
  };

  const update = () => {
    getHubContract()
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
    context.executeTransaction(
      getHubContract().createRecipeSpace(name),
      () => {},
      (reason) => {});
  };

  const removeRecipeSpace = (index) => {
    const space = spaces[index];
    context.executeTransaction(
      getHubContract().removeRecipeSpace(space.address),
      () => {},
      (reason) => {});
  };

  const startRecipeInSpace = (space, recipe, scalePercentage) => {
    context.executeTransaction(
      getHubContract().startRecipeInSpace(space, recipe, scalePercentage),
      () => {},
      (reason) => {});
  };

  const removeRecipeFromSpace = (space, recipe) => {
    context.executeTransaction(
      getHubContract().endRecipeInSpace(space, recipe),
      () => {},
      (reason) => {});
  };

  const updateRecipeStepInSpace = (space, recipe, stepIndex) => {
    context.executeTransaction(
      getHubContract().updateRecipeStepInSpace(space, recipe, stepIndex),
      () => {},
      (reason) => {});
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
