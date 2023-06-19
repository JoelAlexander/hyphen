import React, { useState, useEffect, useContext } from 'react';
import ItemShare from 'contracts/ItemShare.sol/ItemShare.json';
import HyphenContext from './HyphenContext';

const ENSItemShare = () => {
  const context = useContext(HyphenContext);
  const ensItemShareContract = context.getContract('itemshare.hyphen');
  const [itemShareContract, setItemShareContract] = useState(null);
  const [items, setItems] = useState({});
  const [yourItems, setYourItems] = useState([]);
  const [activeRequestsForYourItems, setActiveRequestsForYourItems] = useState([]);
  const [yourRequestsForItems, setYourRequestsForItems] = useState([]);

  const [metadata, setMetadata] = useState('');

  const mergeAndSortEvents = (requests, approvals, denials, removedItems) => {
    const allEvents = [...requests, ...approvals, ...denials, ...removedItems];
    return allEvents.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
      }
      if (a.args.id.toString() !== b.args.id.toString()) {
          return a.args.id.toString().localeCompare(b.args.id.toString());
      }
      if (a.event === 'ItemRequested') {
          return -1;
      }
      if (b.event === 'ItemRequested') {
          return 1;
      }
      if (a.event === 'RequestApproved') {
          return -1;
      }
      if (b.event === 'RequestApproved') {
          return 1;
      }
      if (a.event === 'ItemRemoved') {
          return 1;
      }
      if (b.event === 'ItemRemoved') {
          return -1;
      }
      return 0;
    });
  };

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

    const yourRemovedItemsFilter = itemShareContract.filters.ItemRemoved(context.address, null);
    const yourRemovedItemsEvents = itemShareContract.queryFilter(yourRemovedItemsFilter, 0, context.blockNumber);

    const yourAddedItemsFilter = itemShareContract.filters.ItemAdded(context.address, null);
    const yourAddedItemsEvents = itemShareContract.queryFilter(yourAddedItemsFilter, 0, context.blockNumber);

    const requestsForYourItemsFilter = itemShareContract.filters.ItemRequested(context.address, null, null);
    const requestsForYourItemsEvents = itemShareContract.queryFilter(requestsForYourItemsFilter, 0, context.blockNumber);

    const approvalsOfRequestsForYourItemsFilter = itemShareContract.filters.RequestApproved(context.address, null, null);
    const approvalsOfRequestsForYourItemsEvents = itemShareContract.queryFilter(approvalsOfRequestsForYourItemsFilter, 0, context.blockNumber);

    const denialsOfRequestsForYourItemsFilter = itemShareContract.filters.RequestDenied(context.address, null, null);
    const denialsOfRequestsForYourItemsEvents = itemShareContract.queryFilter(denialsOfRequestsForYourItemsFilter, 0, context.blockNumber);

    Promise.all([yourRemovedItemsEvents, yourAddedItemsEvents])
      .then(([removed, added]) => {
        const removedSet = new Set(removed.map(event => event.args.id.toString()));
          setYourItems(
            added.reverse()
              .map(event => event.args.id.toString())
              .filter(id => !removedSet.has(id)));
      })

    Promise.all([requestsForYourItemsEvents, approvalsOfRequestsForYourItemsEvents, denialsOfRequestsForYourItemsEvents, yourRemovedItemsEvents])
      .then(([requests, approvals, denials, removals]) => {
        const sortedEvents = mergeAndSortEvents(requests, approvals, denials, removals);

        const activeRequests = sortedEvents.reduce((result, event) => {
          const id = event.args.id.toString();
          if (event.event === 'ItemRequested') {
            result[id] = event.args;
          } else if (event.event === 'RequestApproved' || event.event === 'RequestDenied' || event.event === 'ItemRemoved') {
            delete result[id];
          }
          return result;
        }, {});

        setActiveRequestsForYourItems(activeRequests);
      })
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
      setActiveRequestsForYourItems(prevRequests => {
        const { [id.toString()]:_, ...remaining } = prevRequests;
        return remaining;
      });
    };

    const itemRequestedListener = (owner, requester, id, term) => {
      if (owner == context.address) {
        setActiveRequestsForYourItems(prevRequests => ({ ...prevRequests, [id.toString()]: { requester, term }}));
      }
    };

    const requestApprovedListener = (owner, _, id, __) => {
      if (owner == context.address) {
        setActiveRequestsForYourItems(prevRequests => {
          const { [id.toString()]:_, ...remaining } = prevRequests;
          return remaining;
        });
      }
    };

    const requestDeniedListener = (owner, requester, id, term) => {
      if (owner == context.address) {
        setActiveRequestsForYourItems(prevRequests => {
          const { [id.toString()]:_, ...remaining } = prevRequests;
          return remaining;
        });
      }
    };

    itemShareContract.on("ItemAdded", itemAddedListener);
    itemShareContract.on("ItemRemoved", itemRemovedListener);
    itemShareContract.on("ItemRequested", itemRequestedListener);
    itemShareContract.on("RequestApproved", requestApprovedListener);
    itemShareContract.on("RequestDenied", requestDeniedListener);

    return () => {
      itemShareContract.off("ItemAdded", itemAddedListener);
      itemShareContract.off("ItemRemoved", itemRemovedListener);
      itemShareContract.off("ItemRequested", itemRequestedListener);
      itemShareContract.off("RequestApproved", requestApprovedListener);
      itemShareContract.off("RequestDenied", requestDeniedListener);
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

  const handleRequestItem = (id) => {
    itemShareContract.requestItem(id, 100)
      .then(() => console.log(`Requested item '${id}' for 100 blocks.`))
      .catch((error) => console.error(`Failed to request item: ${error}`));
  };

  const handleApproveRequest = (id, requester, term) => {
    itemShareContract.approveRequest(requester, id, term)
      .then(() => console.log(`Approved request from '${requester}' for item '${id}' for term '${term}'.`))
      .catch((error) => console.error(`Failed to approve request: ${error}`));
  };

  const handleDenyRequest = (id, requester, term) => {
    itemShareContract.denyRequest(requester, id, term)
      .then(() => console.log(`Denied request from '${requester}' for item '${id}' for term '${term}'.`))
      .catch((error) => console.error(`Failed to deny request: ${error}`));
  };

  return (
    <div className="ens-item-share">
      <p>ENSItemShare contract address: {ensItemShareContract.address}</p>
      <p>ItemShare contract address: {itemShareContract ? itemShareContract.address : 'Loading...'}</p>
      <input type="text" value={metadata} onChange={handleMetadataChange} placeholder="Enter metadata" />
      <button onClick={handleAddItem}>Add Item</button>
      <h1>Requests for your items</h1>
      <div>
      {Object.entries(activeRequestsForYourItems)
        .map(([id, request]) => (
            <div key={id.toString()}>
                <p>Item ID: {id.toString()}</p>
                <p>Requester: {request.requester}</p>
                <p>Term: {request.term.toString()}</p>
                <button onClick={() => handleApproveRequest(id, request.requester, request.term)}>Approve Request</button>
                <button onClick={() => handleDenyRequest(id, request.requester, request.term)}>Deny Request</button>
            </div>
          )
        )
      }
      </div>
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
                <button onClick={() => handleRequestItem(id)}>Request Item for 100 blocks</button>
            </div>
          )
        )
      }
      </div>
    </div>
  );
};

export default ENSItemShare;
