import React from 'react';
import Select from 'react-select';

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

export default RecipeMenu;
