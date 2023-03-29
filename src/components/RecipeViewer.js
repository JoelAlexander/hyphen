import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { threeOrFewerDecimalPlaces } from '../Utils';

const ethers = require("ethers");

const RecipeViewer = (props) => {
  const [authorName, setAuthorName] = useState(null);
  const context = useContext(HyphenContext);

  useEffect(() => {
    update();
  }, [props.recipe]);

  const update = () => {
    if (props.recipe && props.recipe.author) {
      context.provider
        .lookupAddress(props.recipe.author)
        .then((authorName) => {
          setAuthorName(authorName);
        });
    }
  };

  const scalePercentage = props.scalePercentage ? (props.scalePercentage / 100) : 1;
  const ingredients =
    props.recipe &&
    props.recipe.ingredients &&
    props.recipe.ingredients.map(([name, unit, amount], index) => {
      const amountString = amount > 0 ? threeOrFewerDecimalPlaces(amount * scalePercentage / 1000).toString() + " " + unit : "As needed";
      return <div key={props.recipe.name + "i" + index} className="pure-g">
        <div className="pure-u-1-3">{name}</div>
        <div className="pure-u-1-3">{amountString}</div>
        <div className="pure-u-1-3"></div>
      </div>;
    });
  const steps =
    props.recipe &&
    props.recipe.steps &&
    props.recipe.steps.map((step, index) => {
      const key = props.recipe.name + "s" + index;
      const label = <p key={key}>{(index + 1).toString() + ". " + step}</p>;
      return index === props.stepIndex ? <b key={key}>{label}</b> : label;
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
  if (props.recipe && props.recipe.author) {
    authorship = <h4>Added by {authorName || props.recipe.author}</h4>;
    editButton = props.startEditing ? <button onClick={() => props.startEditing(props.recipe)}>Edit</button> : null;
    deleteButton = props.removeRecipe ? <button onClick={() => props.removeRecipe(props.recipe.recipe)}>Delete</button> : null;
  }

  return (
    <div>
      <div className="pure-g">
        <div className="pure-u-2-3">
          <h3>{props.recipe && props.recipe.name}</h3>
          {authorship}
        </div>
        <div className="pure-u-1-3">
          {editButton}
          {deleteButton}
        </div>
      </div>
      {ingredientsSection}
      {stepsSection}
    </div>
  );
};

export default RecipeViewer;