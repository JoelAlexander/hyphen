import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import Recipe from 'contracts/Recipe.sol/Recipe.json';

const PreparationList = (props) => {
  const context = useContext(HyphenContext);
  const [recipeData, setRecipeData] = useState({});

  useEffect(() => {
    update();
  }, [props.preparations]);

  const update = () => {
    props.preparations.forEach((preparation) => {
      const recipeAddress = preparation.recipe;
      new ethers.Contract(recipeAddress, Recipe.abi, context.signer)
        .getData()
        .then((recipeData) => {
          setRecipeData((prevRecipeData) => ({
            ...prevRecipeData,
            [recipeAddress]: recipeData
          }));
        });
    });
  };

  const preparations = props.preparations
    .map((preparation) => {
      const recipeData = recipeData[preparation.recipe];
      return <div key={preparation.recipe}>
        <p>{recipeData && recipeData.name}</p>
        <button onClick={() => props.removePreparation(preparation.recipe)}>Remove</button>
      </div>;
    });
  return <div>
    {preparations}
  </div>;
};

export default PreparationList;
