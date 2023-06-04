import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { StringSet } from '@local-blockchain-toolbox/contract-primitives';
import MutableStringSet from "./MutableStringSet";
const ethers = require("ethers");

const RecipeSettings = (props) => {
  const context = useContext(HyphenContext);

  return (
	<div>
      <h3>Manage Measure Units</h3>
      <p>
        Here you can add, edit, or remove the units of measurement used in your recipes.
        This helps to maintain consistency across your recipes and simplify the process of
        creating and editing them.
      </p>
      <MutableStringSet
        contractAddress="measures.hyphen" />
    </div>
  );
}

export default RecipeSettings;