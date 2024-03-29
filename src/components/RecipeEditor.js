import React, { useState, useEffect, useRef } from 'react';
import RecipeViewer from './RecipeViewer';
import { threeOrFewerDecimalPlaces } from '../Utils';
import Select from 'react-select';
import NumericInput from 'react-numeric-input';

import './Recipes.css';

const RecipeEditor = ({
  recipe,
  onRecipeChanged,
  measures,
  commit,
  stopEditing,
}) => {
  const [name, setName] = useState(recipe ? recipe.name : '');
  const [ingredients, setIngredients] = useState(recipe ? recipe.ingredients : [['', '', 0], ['', '', 0]]);
  const [steps, setSteps] = useState(recipe ? recipe.steps : ['']);

  useEffect(()=> {
    onRecipeChanged(getRecipe());
  }, []);

  useEffect(() => {
    const updateParent = setInterval(() => onRecipeChanged(getRecipe()), 1000);
    return () => clearInterval(updateParent);
  }, [name, ingredients, steps]);

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients =
      index === (ingredients.length - 1) ?
      [...ingredients, ['', '', 0]] : [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const handleStepChange = (index, value) => {
    const newSteps = index === (steps.length - 1) ? [...steps, ''] : [...steps];
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

    const formatAmount = (value) => {
      return parseFloat(value) === 0 ? '' : value;
    };

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
            <NumericInput
              format={formatAmount}
              min={0}
              max={1000}
              precision={3}
              value={ingredients[index][2] / 1000}
              onChange={(valueAsNumber, valueAsString) => handleIngredientChange(index, 2, Math.floor(valueAsNumber * 1000))}
              placeholder="Enter a number"
              strict
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

  const stepInputs = steps.map((step, index) => {
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

export default RecipeEditor;
