import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { StringSet } from '@local-blockchain-toolbox/contract-primitives';
import RecipeSet from 'contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from 'contracts/Recipe.sol/Recipe.json';
import RecipeViewer from './RecipeViewer';
import RecipeMenu from "./RecipeMenu";
import RecipeEditor from "./RecipeEditor";
import MutableStringSet from "./MutableStringSet";
const ethers = require("ethers");

import './Recipes.css';

const Recipes = (props) => {
  const [recipes, setRecipes] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const context = useContext(HyphenContext);
  const recipesContract = context.getContract('recipes.hyphen')
  const measuresContract = context.getContract('measures.hyphen');

  useEffect(() => {

    recipesContract
      .contents()
      .then((recipes) => {
        setRecipes(recipes);
      }, (err) => {
        context.addMessage(JSON.stringify(err));
      });

    measuresContract.contents().then((measures) => {
      setMeasures(measures);
    }, (err) => {
      context.addMessage(JSON.stringify(err));
    });
  }, []);

  const selectRecipe = (index) => {
    setSelectedRecipe(index);
  };

  const addEditedRecipe = () => {
    context.executeTransaction(
      recipesContract.create(
        editedRecipe.name,
        editedRecipe.ingredients,
        editedRecipe.steps
      ),
      () => {
        setSelectedRecipe(null);
        setEditing(false);
        setEditedRecipe(null);
        update();
      },
      (err) => context.addMessage(JSON.stringify(err))
    );
  };

  const removeRecipe = (recipeAddress) => {
    context.executeTransaction(
      recipesContract.remove(recipeAddress),
      () => {
        setSelectedRecipe(null);
        setEditing(false);
        setEditedRecipe(null);
        update();
      },
      (err) => context.addMessage(JSON.stringify(err))
    );
  };

  const updateEditedRecipe = (recipe) => {
    setEditedRecipe(recipe);
  };

  const startEditing = (existingRecipe) => {
    let editedRecipe = null;
    if (existingRecipe) {
      editedRecipe = {
        name: existingRecipe.name,
        ingredients: existingRecipe.ingredients.map(([name, unit, amount]) => {
          return [name, unit, amount.toNumber()];
        }),
        steps: existingRecipe.steps,
      };
    }
    setEditing(true);
    setEditedRecipe(editedRecipe);
  };

  const stopEditing = () => {
    setEditing(false);
    setEditedRecipe(null);
  };

  const update = () => {
    recipesContract
      .contents()
      .then((recipes) => {
        setRecipes(recipes);
      }, (err) => {
        context.addMessage(JSON.stringify(err));
      });
  };

  const displayRecipe =
    editing && editedRecipe ||
    (recipes && selectedRecipe !== null && recipes[selectedRecipe]);

  let topContent;
  if (editing) {
    topContent = <RecipeEditor
      recipe={editedRecipe}
      measures={measures}
      onRecipeChanged={updateEditedRecipe}
      stopEditing={stopEditing}
      commit={addEditedRecipe} />;
  } else {
    topContent = <RecipeMenu
      newRecipe={() => startEditing(null)}
      selectedRecipe={selectedRecipe}
      recipes={recipes}
      selectRecipe={selectRecipe} />;
  }

  return (
    <div>
      {topContent}
      <RecipeViewer
        recipe={displayRecipe}
        startEditing={startEditing}
        removeRecipe={removeRecipe} />
    </div>
  );
}

export default Recipes;
