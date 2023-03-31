import React, { useState, useEffect, useContext } from 'react';
import RecipeViewer from "./RecipeViewer";
import PreparationCreator from "./PreparationCreator"

const RecipeSpaceDetail = (props) => {
  const [editing, setEditing] = useState(false);

  const startRecipe = (recipe, scalePercentage) => {
    setEditing(false);
    props.startRecipe(recipe, scalePercentage);
  };

  const startEditingRecipe = () => {
    setEditing(true);
  };

  const stopEditingRecipe = () => {
    setEditing(false);
  };

  const selectedRecipeData = props.spaceData.recipes[props.selectedRecipeIndex];
  const recipeViewer = selectedRecipeData ?
    <RecipeViewer
      recipe={selectedRecipeData.recipe}
      stepIndex={selectedRecipeData.status.stepIndex.toNumber()}
      scalePercentage={selectedRecipeData.status.scalePercentage.toNumber()} /> : null;

  var activeRecipeDetails = null;
  if (props.spaceData) {
    const selectedActiveRecipe =
      props.selectedRecipeIndex === null ?
        null : props.spaceData.recipes[props.selectedRecipeIndex];
    activeRecipeDetails = props.spaceData.recipes.map((activeRecipe, index) => {
      const isSelected = index === props.selectedRecipeIndex;
      const nextStepIndex = activeRecipe.status.stepIndex.toNumber() + 1;
      const isCompleted = nextStepIndex === activeRecipe.recipe.steps.length + 1;
      const recipeLabel = <span>{activeRecipe.recipe.name}</span>;
      const stepLabel = <span>Step {nextStepIndex}/{activeRecipe.recipe.steps.length}</span>;
      const progressLabel = isCompleted ? <span>Completed! ✔️</span> : stepLabel;
      const scaleLabel = <span>{(activeRecipe.status.scalePercentage.toNumber() / 100).toFixed(2)}x</span>;
      const completeStepButton = !isSelected || (isCompleted) ? null :
        <button onClick={() => props.updateRecipeStep(activeRecipe.recipe.recipe, nextStepIndex) }>Complete step</button>;
      const removeRecipeButton = !isSelected ? null :
        <button onClick={() => props.removeRecipe(activeRecipe.recipe.recipe)}>❌</button>;
      return <div className="pure-g pure-u-1-3" key={activeRecipe.recipe.recipe} onClick={() => props.selectRecipeIndex(index)}>
          <div className="pure-u-1-1">{recipeLabel}</div>
          <div className="pure-u-1-1">{scaleLabel}</div>
          <div className="pure-u-1-1">{progressLabel}</div>
          <div className="pure-u-1-1">{completeStepButton}</div>
          <div className="pure-u-1-1">{removeRecipeButton}</div>
      </div>;
    });
  }

  const addRecipeButton = editing ? null : <button onClick={startEditingRecipe}>Add recipe</button>;
  const editingControls = editing ?
    <PreparationCreator
      startRecipe={startRecipe}
      cancel={stopEditingRecipe}/> : null;

  const removeRecipe = !editing && selectedRecipeData ?
    () => props.removeRecipe(selectedRecipeData.recipe) : null;

  return <div className="pure-g">
    <div className="pure-u-1-1">
        {addRecipeButton}
    </div>
    <div className="pure-u-1-1">
        {activeRecipeDetails}
    </div>
    <div className="pure-u-1-1">
        {editingControls}
    </div>
    <div className="pure-u-1-1">
        {recipeViewer}
    </div>
  </div>;
}

export default RecipeSpaceDetail;
