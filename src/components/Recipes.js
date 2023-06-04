import React, { useState, useEffect, useContext, useRef } from 'react';
import HyphenContext from './HyphenContext';
import { StringSet } from '@local-blockchain-toolbox/contract-primitives';
import RecipeSet from 'contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from 'contracts/Recipe.sol/Recipe.json';
import RecipeViewer from './RecipeViewer';
import RecipeMenu from "./RecipeMenu";
import RecipeEditor from "./RecipeEditor";
import MutableStringSet from "./MutableStringSet";
import Address from "./Address";
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import { useKeyPress } from './useKeyPress';
const ethers = require("ethers");

import './Recipes.css';

const Recipes = (props) => {
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const [recipes, setRecipes] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);

  const arrowUpPressed = useKeyPress('ArrowUp');
  const arrowDownPressed = useKeyPress('ArrowDown');
  const enterPressed = useKeyPress('Enter');

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

  useEffect(() => {
    if (searchResults.length > 0) {
      if (arrowDownPressed) {
        setHighlightedSuggestion((prev) => (prev + 1) % searchResults.length);
      } else if (arrowUpPressed) {
        setHighlightedSuggestion((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (enterPressed && highlightedSuggestion >= 0) {
        const selectedRecipe = searchResults[highlightedSuggestion];
        setSearchQuery(selectedRecipe.name);
        setSearchResults([]);
        selectRecipe(recipes.indexOf(selectedRecipe));
      }
    }
  }, [arrowUpPressed, arrowDownPressed, enterPressed]);

  const selectRecipe = (index) => {
    setSelectedRecipe(index);
  };

  const addEditedRecipe = () => {
    recipesContract.create(
      editedRecipe.name,
      editedRecipe.ingredients,
      editedRecipe.steps
    ).then(() => {
      setSelectedRecipe(null);
      setEditing(false);
      setEditedRecipe(null);
      update();
    });
  };

  const removeRecipe = (recipeAddress) => {
    recipesContract.remove(recipeAddress).then(() => {
      setSelectedRecipe(null);
      setEditing(false);
      setEditedRecipe(null);
      update();
    });
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

  const closeRecipe = () => {
    setSelectedRecipe(null);
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

  const handleSearch = (e) => {
    const newSearchQuery = e.target.value;
    const newResults = recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(newSearchQuery.trim().toLowerCase())
    );
    setSearchQuery(newSearchQuery);
    setSearchResults(newResults);
    setHighlightedSuggestion(newResults.length > 0 ? 0 : -1);
  };

  const displayRecipe =
    editing && editedRecipe ||
    (recipes && selectedRecipe !== null && recipes[selectedRecipe]);

  return (
    <div>
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search for a recipe"
        value={searchQuery}
        onChange={handleSearch} />
      <Overlay
        show={searchResults.length > 0 && searchInputRef.current}
        target={searchInputRef.current}
        placement="bottom"
        rootClose
        onHide={() => setSearchResults([])} >
        <Popover id="search-results-popover">
          {searchResults.map((recipe, index) => (
            <div
              key={index}
              onClick={() => {
                setSearchQuery(recipe.name);
                setSearchResults([]);
                selectRecipe(recipes.indexOf(recipe));
              }}
              style={{
                cursor: "pointer",
                backgroundColor: highlightedSuggestion === index ? "#f0f0f0" : "transparent"
              }}
            >
              {recipe.name}
            </div>
          ))}
        </Popover>
      </Overlay>
      { editing &&
        <RecipeEditor
          recipe={editedRecipe}
          onRecipeChanged={updateEditedRecipe}
          measures={measures}
          commit={addEditedRecipe}
          stopEditing={stopEditing} /> }
      { !editing && selectedRecipe === null &&
        <button onClick={() => startEditing(null)}>New recipe</button>}
      { displayRecipe &&
        <RecipeViewer
          recipe={displayRecipe}
          startEditing={startEditing}
          closeRecipe={closeRecipe}
          removeRecipe={removeRecipe} />}
    </div>
  );
}

export default Recipes;
