import React, { useState, useEffect, useContext } from 'react';
import RecipeViewer from "./RecipeViewer";
import PreparationCreator from "./PreparationCreator"

const RecipeSpaceDetail = ({spaceData, selectedRecipeIndex, selectRecipeIndex, startRecipe, updateRecipeStep, removeRecipe}) => {
  const [editing, setEditing] = useState(false);

  const selectedRecipeData = spaceData.recipes[selectedRecipeIndex];
  const recipeViewer = selectedRecipeData ?
    <RecipeViewer
      recipe={selectedRecipeData.recipe}
      stepIndex={selectedRecipeData.status.stepIndex.toNumber()}
      scalePercentage={selectedRecipeData.status.scalePercentage.toNumber()} /> : null;

  var activeRecipeDetails = null;
  if (spaceData) {
    activeRecipeDetails = spaceData.recipes.map((activeRecipe, index) => {
      const isSelected = index === selectedRecipeIndex;
      const nextStepIndex = activeRecipe.status.stepIndex.toNumber() + 1;
      const isCompleted = nextStepIndex === activeRecipe.recipe.steps.length + 1;
      const recipeLabel = <span>{activeRecipe.recipe.name}</span>;
      const stepLabel = <span>Step {nextStepIndex}/{activeRecipe.recipe.steps.length}</span>;
      const progressLabel = isCompleted ? <span>Completed! ✔️</span> : stepLabel;
      const scaleLabel = <span>{(activeRecipe.status.scalePercentage.toNumber() / 100).toFixed(2)}x</span>;
      const completeStepButton = isSelected && !isCompleted ? <button onClick={() => updateRecipeStep(activeRecipe.recipe.recipe, nextStepIndex) }>Complete step</button> : null;
      const removeRecipeButton = isSelected ? <button onClick={() => removeRecipe(activeRecipe.recipe.recipe)}>❌</button> : null;
      return <div className="pure-g pure-u-1-3" key={activeRecipe.recipe.recipe} onClick={() => selectRecipeIndex(index)}>
          <div className="pure-u-1-1">{recipeLabel}</div>
          <div className="pure-u-1-1">{scaleLabel}</div>
          <div className="pure-u-1-1">{progressLabel}</div>
          <div className="pure-u-1-1">{completeStepButton}</div>
          <div className="pure-u-1-1">{removeRecipeButton}</div>
      </div>;
    });
  }

  const addRecipeButton = editing ? null : <button onClick={() => {
    setEditing(true);
  }}>Add recipe</button>;
  const editingControls = editing ?
    <PreparationCreator
      startRecipe={(recipe, scalePercentage) => {
        setEditing(false);
        startRecipe(recipe, scalePercentage);
      }}
      cancel={() => {
        setEditing(false);
      }}/> : null;

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
