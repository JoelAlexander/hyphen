import React, { useState, useEffect, useContext } from 'react';
import ItemShare from 'contracts/ItemShare.sol/ItemShare.json';
import HyphenContext from './HyphenContext';

const ENSItemShare = () => {
  const context = useContext(HyphenContext);
  const ensItemShareContract = context.getContract('itemshare.hyphen');
  const [itemShareContract, setItemShareContract] = useState(null);
  const [items, setItems] = useState({});
  const [yourItems, setYourItems] = useState([]);
  const [metadata, setMetadata] = useState('');

  const loadItem = async (id) => {
    if (items[id.toString()]) {
      return
    }

    const data = await itemShareContract.getItem(id);
    const metadata = await ensItemShareContract.getMetadata(id);
    const newItem = { data: data, metadata: metadata };
    setItems(prevItems => ({ ...prevItems, [id.toString()]: newItem }));
  };

  useEffect(() => {
    ensItemShareContract.itemShare()
      .then((address) => setItemShareContract(context.getContract(address, ItemShare.abi)))
  }, []);

  useEffect(() => {
    if (!itemShareContract) {
      return
    }

    const removedFilter = itemShareContract.filters.ItemRemoved(context.address, null);
    const removedEvents = itemShareContract.queryFilter(removedFilter, 0, context.blockNumber);

    const addedFilter = itemShareContract.filters.ItemAdded(context.address, null);
    const addedEvents = itemShareContract.queryFilter(addedFilter, 0, context.blockNumber);

    Promise.all([removedEvents, addedEvents])
      .then(([removed, added]) => {
        const removedSet = new Set(removed.map(event => event.args.id.toString()));
          return added
            .reverse()
            .map(event => event.args.id.toString())
            .filter(id => !removedSet.has(id));
      }).then(setYourItems)
  }, [itemShareContract])

  useEffect(() => {
    yourItems.forEach(loadItem)
  }, [yourItems])

  useEffect(() => {
    if (!itemShareContract) {
      return
    }

    const itemAddedListener = (owner, id) => {
      if (owner == context.address) {
        setYourItems(prevYourItems => [id.toString(), ...prevYourItems])
      }
    };

    const itemRemovedListener = (owner, id) => {
      setItems(prevItems => {
        const { [id.toString()]:_, ...remaining } = prevItems;
        return remaining;
      });
      if (owner == context.address) {
        setYourItems(prevYourItems => prevYourItems.filter(_id => _id != id.toString()))
      }
    };

    itemShareContract.on("ItemAdded", itemAddedListener);
    itemShareContract.on("ItemRemoved", itemRemovedListener);

    return () => {
        itemShareContract.off("ItemAdded", itemAddedListener);
        itemShareContract.off("ItemRemoved", itemRemovedListener);
    };
  }, [itemShareContract]);

  const handleAddItem = () => {
    ensItemShareContract.addItem(metadata)
      .then(() => console.log(`New item with metadata '${metadata}' added.`))
      .catch((error) => console.error(`Failed to add new item: ${error}`))
      .finally(() => setMetadata(''));
  };

  const handleMetadataChange = (event) => {
    setMetadata(event.target.value);
  };

  const handleRemoveItem = (id) => {
    ensItemShareContract.removeItem(id)
      .then(() => console.log(`Item '${id}' removed.`))
      .catch((error) => console.error(`Failed to remove item: ${error}`));
  };

  return (
    <div className="ens-item-share">
      <p>ENSItemShare contract address: {ensItemShareContract.address}</p>
      <p>ItemShare contract address: {itemShareContract ? itemShareContract.address : 'Loading...'}</p>
      <input type="text" value={metadata} onChange={handleMetadataChange} placeholder="Enter metadata" />
      <button onClick={handleAddItem}>Add Item</button>
      <h1>Your Items</h1>
      <div>
      {yourItems
        .map(id => [id, items[id]])
        .filter(([_, item]) => item)
        .map(([id, item]) => (
            <div key={id.toString()}>
                <p>Item ID: {id.toString()}</p>
                <p>Item Owner: {item.data.owner}</p>
                <p>Metadata: {item.metadata}</p>
                {item.data.owner === context.address &&
                  <button onClick={() => handleRemoveItem(id)}>Remove Item</button>
                }
            </div>
          )
        )
      }
      </div>
    </div>
  );
};

export default ENSItemShare;
