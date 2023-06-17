import React, { useState, useEffect, useContext, useRef } from 'react';
import HyphenContext from './HyphenContext';
import { AddressSet } from '@local-blockchain-toolbox/contract-primitives';
import Recipe from 'contracts/Recipe.sol/Recipe.json';
import RecipeViewer from './RecipeViewer';
import RecipeEditor from "./RecipeEditor";
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import { useKeyPress } from './useKeyPress';

import './Recipes.css';

const Recipes = (props) => {
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [loadedRecipes, setLoadedRecipes] = useState({});
  const [measures, setMeasures] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [recipesAddressSetContract, setRecipesAddressSetContract] = useState(null);

  const arrowUpPressed = useKeyPress('ArrowUp');
  const arrowDownPressed = useKeyPress('ArrowDown');
  const enterPressed = useKeyPress('Enter');

  const context = useContext(HyphenContext);

  const recipesContract = context.getContract('recipes.hyphen')
  const measuresContract = context.getContract('measures.hyphen');

  useEffect(() => {

    recipesContract
      .recipes()
      .then(addr => setRecipesAddressSetContract(context.getContract(addr, AddressSet)));

    measuresContract.contents().then(setMeasures);
  }, []);

  useEffect(() => {
    if (recipesAddressSetContract) {
      recipesAddressSetContract
        .contents()
        .then(setRecipes)
    }
  }, [recipesAddressSetContract]);

  useEffect(() => {
    recipes.forEach((recipe) => {
      if (!(recipe in loadedRecipes)) {
        context.getContract(recipe, Recipe.abi)
          .getData()
          .then(data => {
            setLoadedRecipes(prev => { return {...prev, [recipe]: data}});
          })
      }
    });
  }, [recipes]);

  const addRecipeAddress = (addr) => {
    setRecipes(prev => [...prev, addr]);
  };

  const removeRecipeAddress = (addr) => {
    setRecipes(prev => [...prev].filter(it => it != addr));
  };

  useEffect(() => {
    if (!recipesAddressSetContract) {
      return;
    }

    const addedFilter = recipesAddressSetContract.filters.AddressAdded();
    const removedFilter = recipesAddressSetContract.filters.AddressRemoved();
    const addedListener = (by, addr) => {
      addRecipeAddress(addr);
      context.addActivityToast(by, `Added a recipe`);
    };
    const removedListener = (by, addr) => {
      removeRecipeAddress(addr);
      context.addActivityToast(by, `Removed a recipe`);
    };

    recipesAddressSetContract.on(addedFilter, addedListener);
    recipesAddressSetContract.on(removedFilter, removedListener);

    return () => {
      recipesAddressSetContract.off(addedFilter, addedListener);
      recipesAddressSetContract.off(removedFilter, removedListener);
    };
  }, [recipesAddressSetContract])

  useEffect(() => {
    if (searchResults.length > 0) {
      if (arrowDownPressed) {
        setHighlightedSuggestion((prev) => (prev + 1) % searchResults.length);
      } else if (arrowUpPressed) {
        setHighlightedSuggestion((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (enterPressed && highlightedSuggestion >= 0) {
        const selectedRecipe = searchResults[highlightedSuggestion];
        setSearchResults([]);
        setSearchQuery(selectedRecipe[1].name);
        setSelectedRecipe(selectedRecipe[0]);
      }
    }
  }, [arrowUpPressed, arrowDownPressed, enterPressed]);

  const selectRecipe = (address) => {
    setSelectedRecipe(address);
  };

  const addEditedRecipe = () => {
    setEditing(false);
    setEditedRecipe(null);
    recipesContract.create(
      editedRecipe.name,
      editedRecipe.ingredients,
      editedRecipe.steps
    ).catch(() => {
      setEditing(true);
      setEditedRecipe(editedRecipe);
    });
  };

  const removeRecipe = (recipeAddress) => {
    setSelectedRecipe(null);
    removeRecipeAddress(recipeAddress);
    recipesContract.remove(recipeAddress).catch(() => {
      // TODO: should error be handled like this?
      setSelectedRecipe(recipeAddress);
      addRecipeAddress(recipeAddress);
    });
  };

  const startEditing = (existingRecipe) => {
    const editedRecipe = existingRecipe ? {
        name: existingRecipe.name,
        ingredients: existingRecipe.ingredients.map(([name, unit, amount]) => {
          return [name, unit, amount.toNumber()];
        }),
        steps: existingRecipe.steps,
      } : null
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

  const handleSearch = (query) => {
    const newResults =
      recipes.map(recipe => [recipe, loadedRecipes[recipe]])
        .filter(([_, data]) => data && data.name.toLowerCase().includes(query.trim().toLowerCase()))
    setSearchQuery(query);
    setSearchResults(newResults);
    setHighlightedSuggestion(newResults.length > 0 ? 0 : -1);
  };

  const displayRecipe = (editing && editedRecipe) || 
    (recipes && selectedRecipe !== null && loadedRecipes[selectedRecipe]);
  
  return (
    <div>
      {!displayRecipe && (<>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a recipe"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          onClick={() => handleSearch("")} />
        <Overlay
          show={searchResults.length > 0 && searchInputRef.current}
          target={searchInputRef.current}
          placement="bottom"
          rootClose
          onHide={() => setSearchResults([])} >
          <Popover id="search-results-popover">
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => {
                  setSearchQuery(result[1].name);
                  setSearchResults([]);
                  selectRecipe(result[0]);
                }}
                style={{
                  cursor: "pointer",
                  backgroundColor: highlightedSuggestion === index ? "#f0f0f0" : "transparent"
                }}
              >
                {result[1].name}
              </div>
            ))}
          </Popover>
        </Overlay>
      </>)}
      { editing &&
        <RecipeEditor
          recipe={editedRecipe}
          onRecipeChanged={setEditedRecipe}
          measures={measures}
          commit={addEditedRecipe}
          stopEditing={stopEditing} /> }
      { !displayRecipe && <button onClick={() => startEditing(null)}>New recipe</button>}
      { displayRecipe &&
        <RecipeViewer
          recipe={displayRecipe}
          recipeAddress={selectedRecipe}
          startEditing={startEditing}
          closeRecipe={closeRecipe}
          removeRecipe={removeRecipe} />}
    </div>
  );
}

export default Recipes;
