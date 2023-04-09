import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';
import { StringSet } from '@local-blockchain-toolbox/contract-primitives';
const ethers = require("ethers");

const MutableStringSet = (props) => {
  const [contents, setContents] = useState([]);
  const [newString, setNewString] = useState("");
  const context = useContext(HyphenContext);
  const contract = context.getContract(props.contractAddress);

  useEffect(() => {
    contract
      .contents()
      .then((result) => {
        setContents(result);
      });
  }, [context.signer, props.contractAddress]);

  const addString = (str) => {
    context.executeTransaction(
      contract.add(str),
      (receipt) => setContents(prevContents => [...prevContents, str]),
      (error) => context.addMessage(JSON.stringify(error)));
  };

  const removeString = (str) => {
    context.executeTransaction(
      contract.remove(str),
      (receipt) => setContents(prevContents => prevContents.filter(item => item !== str)),
      (error) => context.addMessage(JSON.stringify(error)));
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
