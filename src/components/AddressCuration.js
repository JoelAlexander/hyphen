import React, { useState, useContext, useEffect } from 'react';
import HyphenContext from './HyphenContext';
import './AddressCuration.css';
import { stringToColor, getContrastColor} from '../Utils';

const AddressCuration = ({ address }) => {
  const context = useContext(HyphenContext);
  const curationContract = context.getContract('curation.hyphen');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState([]);
  const [showPopover, setShowPopover] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New state to track loading status

  const fetchTags = () => {
    setIsLoading(true);
    curationContract.getTagsForAddress(address)
      .then((tags) => {
        setTags(tags);
      })
      .catch(() => setTags([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTags();
  }, [address]);

  const handleTagChange = (event) => {
    setTag(event.target.value);
  };

  const addTag = () => {
    if (tag.trim()) {
      setIsLoading(true);
      setShowPopover(false);
      curationContract.addTag(address, tag.trim())
        .then(() => {
          fetchTags();
          setTag('');
          setShowPopover(false);
        })
        .finally(() => setIsLoading(false));
    }
  };

  const removeTag = (tagToRemove) => {
    setIsLoading(true);
    curationContract.removeTag(address, tagToRemove)
      .then(() => {
        fetchTags();
      })
      .finally(() => setIsLoading(false));
  };

  const togglePopover = () => {
    setShowPopover(!showPopover);
  };

  return (
    <div className="address-curation">
      {isLoading && <div className="spinner"></div>}
      {
        tags.map((tag, index) => {
          const bgColor = stringToColor(tag);
          const textColor = getContrastColor(bgColor);
          return (<div key={index} className="tag" style={{ backgroundColor: bgColor, color: textColor }}>
            {tag} <button onClick={() => removeTag(tag)} disabled={isLoading}>x</button>
          </div>)
        })
      }
      {showPopover && (
        <div className="tag">
          <input type="text" value={tag} onChange={handleTagChange} placeholder="Add tag" />
          <button onClick={addTag}>Add</button>
        </div>
      )}
      <button className="add-tag-button" onClick={togglePopover} disabled={isLoading}>+</button>
    </div>
  );
};

export default AddressCuration;
