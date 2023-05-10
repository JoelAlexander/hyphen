import React, { useState, useContext, useEffect } from 'react';
import HyphenContext from './HyphenContext';

const Curation = () => {
  const context = useContext(HyphenContext);
  const curationContract = context.getContract('curation.hyphen');
  const [tag, setTag] = useState('');
  const [address, setAddress] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [allAddresses, setAllAddresses] = useState([]);

  const fetchAllTags = () => {
    curationContract.getAllTags().then(setAllTags);
  };

  const fetchAllAddresses = () => {
    curationContract.getAllTaggedAddresses().then(setAllAddresses);
  };

  useEffect(() => {
    fetchAllTags();
    fetchAllAddresses();
  }, []);

  const handleTagChange = (event) => {
    setTag(event.target.value);
  };

  const handleAddressChange = (event) => {
    setAddress(event.target.value);
  };

  const addTag = () => {
    curationContract.addTag(address, tag)
      .then(() => {
        fetchAllTags();
        fetchAllAddresses();
      });
  };

  const removeTag = () => {
    curationContract.removeTag(address, tag)
      .then(() => {
        fetchAllTags();
        fetchAllAddresses();
      });
  };

  return (
    <div className="curation-widget">
      <h2>Curation</h2>
      <div>
        <label>Address:</label>
        <input type="text" value={address} onChange={handleAddressChange} />
      </div>
      <div>
        <label>Tag:</label>
        <input type="text" value={tag} onChange={handleTagChange} />
      </div>
      <button onClick={addTag}>Add Tag</button>
      <button onClick={removeTag}>Remove Tag</button>
      <h3>All Tags:</h3>
      <ul>
        {allTags.map((tag, index) => (
          <li key={index}>{tag}</li>
        ))}
      </ul>
      <h3>All Tagged Addresses:</h3>
      <ul>
        {allAddresses.map((address, index) => (
          <li key={index}>{address}</li>
        ))}
      </ul>
    </div>
  );
};

export default Curation;
