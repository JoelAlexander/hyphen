import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Address from './Address'
import AddressCuration from './AddressCuration'
import { threeOrFewerDecimalPlaces } from '../Utils';

const ethers = require("ethers");

const RecipeViewer = ({recipe, scalePercentageThousands, stepIndex, recipeAddress, startEditing, removeRecipe, closeRecipe}) => {
  const context = useContext(HyphenContext);

  const scalePercentage = scalePercentageThousands ? (scalePercentageThousands / 100) : 1;
  const ingredients =
    recipe &&
    recipe.ingredients &&
    recipe.ingredients.map(([name, unit, amount], index) => {
      const amountString = amount > 0 ? threeOrFewerDecimalPlaces(amount * scalePercentage / 1000).toString() + " " + unit : "As needed";
      return <div key={recipe.name + "i" + index} className="pure-g">
        <div className="pure-u-1-3">{name}</div>
        <div className="pure-u-1-3">{amountString}</div>
        <div className="pure-u-1-3"></div>
      </div>;
    });
  const steps =
    recipe &&
    recipe.steps &&
    recipe.steps.map((step, index) => {
      const key = recipe.name + "s" + index;
      const label = <p key={key}>{(index + 1).toString() + ". " + step}</p>;
      return index === stepIndex ? <b key={key}>{label}</b> : label;
    });
  var ingredientsSection;
  if (ingredients && ingredients.length > 0) {
    ingredientsSection = <div>
      <h4>Ingredients</h4>
      {ingredients}
    </div>;
  }
  var stepsSection;
  if (steps && steps.length > 0) {
    stepsSection = <div>
      <h4>Steps</h4>
      {steps}
    </div>;
  }
  var editButton;
  var deleteButton;
  var authorship;
  if (recipe && recipe.author) {
    authorship = <h4>Added by {<Address address={recipe.author} style={{ display: 'inline-block' }}/>}</h4>;
    editButton = startEditing ? <button onClick={() => startEditing(recipe)}>Edit</button> : null;
    deleteButton = removeRecipe ? <button onClick={() => removeRecipe(recipeAddress)}>Delete</button> : null;
  }

  const closeButton = closeRecipe ? <button onClick={() => closeRecipe()}>Close</button> : null;

  return (
    <div>
      <div className="pure-g">
        <div className="pure-u-2-3">
          <h3>{recipe && recipe.name}</h3>
          {authorship}
          {closeButton}
        </div>
      </div>
      {ingredientsSection}
      {stepsSection}
      {recipe && recipeAddress && <AddressCuration address={recipeAddress} />}
      {editButton}
      {deleteButton}
    </div>
  );
};

export default RecipeViewer;