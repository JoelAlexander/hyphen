import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { StringSet } from '@local-blockchain-toolbox/contract-primitives';
import RecipeSet from 'contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from 'contracts/Recipe.sol/Recipe.json';
import RecipeViewer from './RecipeViewer.js';
import { threeOrFewerDecimalPlaces } from '../Utils';
import Select from 'react-select';
const ethers = require("ethers");

const RecipeMenu = ({ recipes, selectedRecipe, selectRecipe, newRecipe }) => {
  const recipeOptions = recipes
    ? recipes.map((recipe, index) => {
        return { label: recipe.name, value: index };
      })
    : null;

  const selectedRecipeOption = selectedRecipe !== null ? recipeOptions[selectedRecipe] : null;

  const onSelectRecipe = (recipeOption) => {
    selectRecipe(recipeOption.value);
  };

  const recipeSelect = recipeOptions ? (
    <Select value={selectedRecipeOption} options={recipeOptions} onChange={onSelectRecipe} />
  ) : null;

  return (
    <div style={{ marginBottom: '2em' }}>
      {recipeSelect}
      <button onClick={newRecipe}>New Recipe</button>
    </div>
  );
};

const RecipeEditor = ({
  recipe,
  onRecipeChanged,
  measures,
  commit,
  stopEditing,
}) => {
  const [name, setName] = useState(recipe ? recipe.name : '');
  const [ingredients, setIngredients] = useState(
    recipe ? recipe.ingredients : [['', '', 0], ['', '', 0]],
  );
  const [steps, setSteps] = useState(recipe ? recipe.steps : ['']);

  useEffect(() => {
    onRecipeChanged(getRecipe());
    const updateParent = setInterval(() => onRecipeChanged(getRecipe()), 1000);
    return () => clearInterval(updateParent);
  }, [name, ingredients, steps]);

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const handleStepChange = (index, value) => {
    const newSteps = steps.slice();
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const getRecipe = () => {
    return {
      name,
      ingredients: ingredients
        .filter((ingredient) => ingredient[0].length > 0)
        .map(([name, unit, amount]) => [
          name,
          unit,
          amount === '' ? 0 : amount,
        ]),
      steps: steps.filter((step) => step.length > 0),
    };
  };

  const isValidRecipe = (recipe) => {
    return (
      recipe.name.length > 0 &&
      recipe.ingredients.length > 1 &&
      recipe.steps.length > 0
    );
  };

  const ingredientInputs = ingredients.map((ingredient, index) => {
    const unitOptions = [{ value: '', label: 'None' }, ...measures.map(unit => ({ value: unit, label: unit }))];

    const selectedUnitOption = unitOptions.find(
      (option) => option.value === ingredients[index][1],
    );

    const amount = ingredients[index][2] === '' ? '' : threeOrFewerDecimalPlaces(ingredients[index][2] / 1000);

    return (
      <div key={`Ingredient ${index}`} className="pure-g">
        <div className="pure-u-1-3">
          <label>
            <input
              type="text"
              value={ingredients[index][0]}
              onChange={(event) =>
                handleIngredientChange(index, 0, event.target.value)
              }
            />
          </label>
        </div>
        <div className="pure-u-1-3">
          <label>
            <input
              type="number"
              step="0.001"
              value={amount}
              min="0"
              onChange={(event) =>
                handleIngredientChange(index, 2, event.target.value)
              }
            />
          </label>
        </div>
        <div className="pure-u-1-3">
          <label>
            <Select
              value={selectedUnitOption}
              options={unitOptions}
              onChange={(event) =>
                handleIngredientChange(index, 1, event.value)
              }
            />
          </label>
        </div>
      </div>
    );
  });

  const stepInputs = steps.map((step,index) => {
    const label = (index + 1).toString() + '.';
    return (
      <label key={`Step ${index}`}>
        {label}
        <input type="text" name={`Step ${index}`} value={steps[index]}
          onChange={(event) => handleStepChange(index, event.target.value)} />
      </label>
    );
  });

  return (
    <div style={{ marginBottom: '2em' }}>
      <h3>New recipe</h3>
      <form className="recipe-form">
        <label>Recipe Name
          <input type="text" name="name" value={name}
            onChange={handleNameChange} />
        </label>
        <label>Ingredients
          <div className="pure-g">
            <div className="pure-u-1-3">Ingredient Name</div>
            <div className="pure-u-1-3">Amount</div>
            <div className="pure-u-1-3">Units</div>
          </div>
          {ingredientInputs}
        </label>
        <label>Steps
        {stepInputs}
        </label>
      </form>
      {isValidRecipe(getRecipe()) && (
        <input onClick={commit} type="submit" value="Submit Recipe" />
      )}
      <button onClick={stopEditing}>Cancel</button>
    </div>
  );
};

const Recipes = (props) => {
  const [recipes, setRecipes] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const context = useContext(HyphenContext);

  useEffect(() => {
    const measuresContract = new ethers.Contract(
      "measures.hyphen",
      StringSet.abi,
      context.signer
    );

    getContract()
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

  const getContract = () => {
    return new ethers.Contract(
      "recipes.hyphen",
      RecipeSet.abi,
      context.signer
    );
  };

  const selectRecipe = (index) => {
    setSelectedRecipe(index);
  };

  const addEditedRecipe = () => {
    context.executeTransaction(
      getContract().create(
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
      getContract().remove(recipeAddress),
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
    getContract()
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
