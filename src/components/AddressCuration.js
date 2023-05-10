import React, { useState, useContext, useEffect } from 'react';
import HyphenContext from './HyphenContext';
import './AddressCuration.css';

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

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  };

  const getContrastColor = (bgColor) => {
    const hex = bgColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? 'black' : 'white';
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
