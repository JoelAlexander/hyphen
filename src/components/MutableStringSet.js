import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { StringSet } from '@local-blockchain-toolbox/contract-primitives';
const ethers = require("ethers");

const MutableStringSet = ({ contractAddress }) => {
  const [contents, setContents] = useState([]);
  const [newString, setNewString] = useState("");
  const context = useContext(HyphenContext);
  const contract = context.getContract(contractAddress);

  useEffect(() => {
    contract
      .contents()
      .then((result) => {
        setContents(result);
      });
  }, []);

  const addString = (str) => {
    contract.add(str).then(() => setContents(prevContents => [...prevContents, str]));
  };

  const removeString = (str) => {
    contract.remove(str).then(() => setContents(prevContents => prevContents.filter(item => item !== str)));
  };

  const handleAddString = (event) => {
    event.preventDefault();
    if (newString && newString.length > 0) {
      addString(newString);
      setNewString("");
    }
  };

  const handleAddStringChange = (event) => {
    setNewString(event.target.value);
  };

  const contentsList = contents.map((item, index) => {
    return <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
        <p style={{ marginRight: '5px' }}>{item}</p>
        <button onClick={() => removeString(item)}>x</button>
    </div>
  });

  return (
    <div>
      {contentsList}
      <form onSubmit={handleAddString}>
        <label>
          <input type="text" value={newString} onChange={handleAddStringChange} />
        </label>
        <input type="submit" value="Add" />
      </form>
    </div>
  );
};

export default MutableStringSet;
