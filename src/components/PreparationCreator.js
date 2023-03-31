import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Select from 'react-select';
import RecipeSet from 'contracts/RecipeSet.sol/RecipeSet.json';
const ethers = require("ethers");

const PreparationCreator = (props) => {
  const context = useContext(HyphenContext);
  const [scale, setScale] = useState(1.0);
  const [recipes, setRecipes] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    new ethers.Contract("recipes.hyphen", RecipeSet.abi, context.signer)
        .contents()
        .then((recipes) => {
            setRecipes(recipes);
        });
  }, []);

  const onScaleChanged = (event) => {
    const e = Math.pow(2, event.target.value - 4);
    const newScale = e >= 4 ? e.toFixed(0) : e < 1 ? e.toFixed(2) : e.toFixed(1);
    setScale(newScale);
  };

  const startRecipe = () => {
    if (!selectedRecipe) {
        return;
    }
    props.startRecipe(
        selectedRecipe,
        (scale * 100).toFixed(0));
  };

  const onSelectRecipe = (recipeOption) => {
    setSelectedRecipe(recipeOption.value);
  };

  const recipeOptions = recipes && recipes.map((recipe, index) => {
    return {label: recipe.name, value: recipe.recipe};
  });

  const scaleRangeValue = Math.log2(scale) + 4;

  const submitButton = selectedRecipe ?
    <button onClick={startRecipe}>Create preparation</button> :
    null;

  var selectedRecipeOption = selectedRecipe && recipeOptions.find((option) => {
    return option.value == selectedRecipe;
  });

  return <div>
    <Select
        options={recipeOptions}
        value={selectedRecipeOption}
        onChange={onSelectRecipe} />
    <label>
    <input
        type="range"
        min="1"
        max="8"
        step="0.01"
        id="myRange"
        value={scaleRangeValue}
        onInput={onScaleChanged}
        style={{width: "100%"}} />
    <span>{scale}x</span>
    </label>
    {submitButton}
    <button onClick={props.cancel}>Cancel</button>
  </div>;
}

export default PreparationCreator;
