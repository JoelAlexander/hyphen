import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';

const MutableStringSet = ({ contractAddress }) => {
  const [contents, setContents] = useState([]);
  const [newString, setNewString] = useState("");
  const context = useContext(HyphenContext);
  const contract = context.getContract(contractAddress);

  const fetchContents = async () => {
    const result = await contract.contents();
    setContents(result);
  }

  useEffect(() => {
    fetchContents();



    const addedFilter = contract.filters.StringAdded();
    const removedFilter = contract.filters.StringRemoved();
    const addedListener = (by, str) => {
      if (by !== context.address) {
        setContents(prevContents => [...prevContents, str]);
      }
    };
    const removedListener = (by, str) => {
      if (by !== context.address) {   
        setContents(prevContents => prevContents.filter(item => item !== str));
      }
    };

    contract.on(addedFilter, addedListener);
    contract.on(removedFilter, removedListener);

    return () => {
      contract.off(addedFilter, addedListener);
      contract.off(removedFilter, removedListener);
    };
  }, []);

  const addString = async (str) => {
    if (contents.includes(str)) {
      alert("This string is already in the list!");
      return;
    }

    setContents(prevContents => [...prevContents, str]);
    try {
      await contract.add(str);
    } catch (error) {
      setContents(prevContents => prevContents.filter(item => item !== str));
      console.error(`Failed to add string: ${error}`);
    }
  };

  const removeString = async (str) => {
    setContents(prevContents => prevContents.filter(item => item !== str));
    try {
      await contract.remove(str);
    } catch (error) {
      setContents(prevContents => [...prevContents, str]);
      console.error(`Failed to remove string: ${error}`);
    }
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
