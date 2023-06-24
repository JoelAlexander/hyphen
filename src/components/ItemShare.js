import React, { useState, useEffect, useContext } from 'react'
import ItemShare from 'contracts/ItemShare.sol/ItemShare.json'
import HyphenContext from './HyphenContext'

const ENSItemShare = () => {
  const context = useContext(HyphenContext)
  const ensItemShareContract = context.getContract('itemshare.hyphen')
  const [itemShareContract, setItemShareContract] = useState(null)
  const [items, setItems] = useState({})
  const [yourItems, setYourItems] = useState([])
  const [yourHeldItems, setYourHeldItems] = useState([])
  const [requests, setRequests] = useState({})
  const [newOwner, setNewOwner] = useState('')
  const [metadata, setMetadata] = useState('')


  const mergeAndSortEvents = (events) => {
    const allEvents = [].concat(...events);
  
    return allEvents.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      } else if (a.transactionIndex !== b.transactionIndex) {
        return a.transactionIndex - b.transactionIndex;
      } else if (a.args.id.toString() !== b.args.id.toString()) {
        return a.args.id.toString().localeCompare(b.args.id.toString());
      } else if (a.event !== b.event) {
        return a.event.localeCompare(b.event);
      } else {
        return 0;
      }
    });
  };

  const loadItem = async (id) => {
    if (items[id.toString()]) {
      return
    }

    const data = await itemShareContract.getItem(id)
    const metadata = await ensItemShareContract.getMetadata(id)
    const newItem = { data: data, metadata: metadata }
    setItems(prevItems => ({ ...prevItems, [id.toString()]: newItem }))
  }

  useEffect(() => {
    ensItemShareContract.itemShare()
      .then((address) => setItemShareContract(context.getContract(address, ItemShare.abi)))
  }, [])

  useEffect(() => {
    if (!itemShareContract) {
      return
    }

    const yourRemovedItemsFilter = itemShareContract.filters.ItemRemoved(context.address)
    const yourRemovedItemsEvents = itemShareContract.queryFilter(yourRemovedItemsFilter, 0, context.blockNumber)

    const yourAddedItemsFilter = itemShareContract.filters.ItemAdded(context.address)
    const yourAddedItemsEvents = itemShareContract.queryFilter(yourAddedItemsFilter, 0, context.blockNumber)

    const requestsToYouFilter = itemShareContract.filters.ItemRequested(context.address)
    const requestsToYouEvents = itemShareContract.queryFilter(requestsToYouFilter, 0, context.blockNumber)

    const requestsFromYouFilter = itemShareContract.filters.ItemRequested(null, context.address)
    const requestsFromYouEvents = itemShareContract.queryFilter(requestsFromYouFilter, 0, context.blockNumber)

    const requestsDeniedFromYouFilter = itemShareContract.filters.RequestDenied(context.address)
    const requestsDeniedFromYouEvents = itemShareContract.queryFilter(requestsDeniedFromYouFilter, 0, context.blockNumber)

    const requestsDeniedToYouFilter = itemShareContract.filters.RequestDenied(null, context.address)
    const requestsDeniedToYouEvents = itemShareContract.queryFilter(requestsDeniedToYouFilter, 0, context.blockNumber)

    const requestsApprovedFromYouFilter = itemShareContract.filters.RequestApproved(context.address)
    const requestsApprovedFromYouEvents = itemShareContract.queryFilter(requestsApprovedFromYouFilter, 0, context.blockNumber)

    const requestsApprovedToYouFilter = itemShareContract.filters.RequestApproved(null, context.address);
    const requestsApprovedToYouEvents = itemShareContract.queryFilter(requestsApprovedToYouFilter, 0, context.blockNumber);

    const ownershipTransferredFromYouFilter = itemShareContract.filters.OwnershipTransferred(context.address)
    const ownershipTransferredFromYouEvents = itemShareContract.queryFilter(ownershipTransferredFromYouFilter, 0, context.blockNumber)

    const ownershipTransferredToYouFilter = itemShareContract.filters.OwnershipTransferred(null, context.address)
    const ownershipTransferredToYouEvents = itemShareContract.queryFilter(ownershipTransferredToYouFilter, 0, context.blockNumber)

    const returnsToYouFilter = itemShareContract.filters.ItemReturned(context.address);
    const returnsToYouEvents = itemShareContract.queryFilter(returnsToYouFilter, 0, context.blockNumber);

    const returnsFromYouFilter = itemShareContract.filters.ItemReturned(null, context.address);
    const returnsFromYouEvents = itemShareContract.queryFilter(returnsFromYouFilter, 0, context.blockNumber);

    Promise.all([yourAddedItemsEvents, yourRemovedItemsEvents, requestsApprovedToYouEvents, requestsApprovedFromYouEvents, returnsToYouEvents, returnsFromYouEvents])
        .then(mergeAndSortEvents)
        .then(events => {
            const yourItems = events.reduce((result, event) => {
                const id = event.args.id.toString()
                const isAdd = (event.event == 'ItemAdded') ||
                  (event.event == 'RequestApproved' && context.address == event.args.requester) ||
                  (event.event == 'ItemReturned' && context.address == event.args.owner)
                const isRemove = (event.event == 'ItemRemoved') ||
                  (event.event == 'RequestApproved' && context.address == event.args.owner) ||
                  (event.event == 'ItemReturned' && context.address == event.args.requester)
                const selfEvent = event.args.owner == event.args.requester
                if (isAdd && !selfEvent) {
                  return [id, ...result]
                } else if (isRemove && !selfEvent) {
                    return result.filter(_id => id != _id)
                } else {
                  return result
                }
            }, [])
            setYourHeldItems(yourItems)
            return yourItems
        })

    Promise.all([yourRemovedItemsEvents, yourAddedItemsEvents, ownershipTransferredFromYouEvents, ownershipTransferredToYouEvents])
      .then(mergeAndSortEvents)
      .then(events => {
        const yourItems = events.reduce((result, event) => {
          const id = event.args.id.toString()
          const isTransfer = event.event == 'OwnershipTransferred'
          const isSelfTransfer = isTransfer && (event.args.toOwner == event.args.fromOwner)
          const isTransferTo = isTransfer && !isSelfTransfer && (event.args.toOwner == context.address)
          const isTransferFrom = isTransfer && !isSelfTransfer && (event.args.fromOwner == context.address)
          const added = event.event === 'ItemAdded' || isTransferTo
          const removed = event.event === 'ItemRemoved' || isTransferFrom
          if (added) {
            return [id, ...result]
          } else if (removed) {
            return result.filter(_id => id != _id)
          }
          return result
        }, [])
        setYourItems(yourItems)
        return yourItems
      })

    Promise.all([requestsToYouEvents, requestsFromYouEvents, requestsApprovedToYouEvents, requestsApprovedFromYouEvents, requestsDeniedToYouEvents, requestsDeniedFromYouEvents])
      .then(mergeAndSortEvents)
      .then(events => {
        setRequests(
          events.reduce((result, event) => {
            const id = event.args.id.toString()
            if (event.event === 'ItemRequested') {
              result[id] = { [event.args.requester]: event.args.term, ...result[id] }
            } else if (event.event === 'RequestApproved' || event.event === 'RequestDenied') {
              const { [event.args.requester]: _, ...remaining } = result[id]
              result[id] = remaining
            }
            return result
          }, {}))
      })
  }, [itemShareContract])

  useEffect(() => {
    yourItems.forEach(loadItem)
    yourHeldItems.forEach(loadItem)
  }, [yourItems, yourHeldItems])

  useEffect(() => {
    if (!itemShareContract) {
      return
    }

    const addId = (_id) => {
      const id = _id.toString()
      return prev => { return [id, ...prev] }
    }

    const removeId = (_id) => {
      const id = _id.toString()
      return prev => { return prev.filter(__id => __id != id) }
    }

    const addRequest = (_id, requester, term) => {
      const id = _id.toString()
      return prev => {
        return { ...prev, [id]: { ...prev[id], [requester]: term }}
      }
    }

    const removeRequest = (_id, requester) => {
      const id = _id.toString()
      return prev => {
        const {[id]: { [requester]: _, ...requesters}, ...items} = prev
        return {[id]: {...requesters}, ...items} 
      }
    }

    const removeAllRequests = (_id) => {
      const id = _id.toString()
      return prev => {
        const {[id]: _, ...items} = prev
        return {...items}
      }
    }

    const itemAddedListener = (owner, id) => {
      if (owner == context.address) {
        setYourItems(addId(id))
        setYourHeldItems(addId(id))
      }
    }

    const itemRemovedListener = (owner, id) => {
      if (owner == context.address) {
        setYourItems(removeId(id))
        setYourHeldItems(removeId(id))
      }
      setRequests(removeAllRequests(id))
    }

    const itemRequestedListener = (_, requester, id, term) => {
      setRequests(addRequest(id, requester, term))
    }

    const requestApprovedListener = (_, requester, id, __) => {
      setRequests(removeRequest(id, requester))
    }

    const requestDeniedListener = (_, requester, id, __) => {
      setRequests(removeRequest(id, requester))
    }

    const itemReturnedListener = (owner, requester, id) => {
      const isSelfTransfer = owner === requester
      if (!isSelfTransfer) {
        if (owner === context.address) {
          setYourHeldItems(addId(id))
        } else if (requester === context.address) {
          setYourHeldItems(removeId(id))
        }
      }
    }

    const ownershipTransferredListener = (fromOwner, toOwner, id) => {
      const isSelfTransfer = fromOwner === toOwner
      if (!isSelfTransfer) {
        if (toOwner === context.address) {
          setYourItems(addId(id))
        }

        if (fromOwner === context.address) {
          setYourItems(removeId(id))
        }
      }
    }

    itemShareContract.on("ItemAdded", itemAddedListener)
    itemShareContract.on("ItemRemoved", itemRemovedListener)
    itemShareContract.on("ItemRequested", itemRequestedListener)
    itemShareContract.on("RequestApproved", requestApprovedListener)
    itemShareContract.on("RequestDenied", requestDeniedListener)
    itemShareContract.on("ItemReturned", itemReturnedListener)
    itemShareContract.on("OwnershipTransferred", ownershipTransferredListener)

    return () => {
      itemShareContract.off("ItemAdded", itemAddedListener)
      itemShareContract.off("ItemRemoved", itemRemovedListener)
      itemShareContract.off("ItemRequested", itemRequestedListener)
      itemShareContract.off("RequestApproved", requestApprovedListener)
      itemShareContract.off("RequestDenied", requestDeniedListener)
      itemShareContract.off("ItemReturned", itemReturnedListener)
      itemShareContract.off("OwnershipTransferred", ownershipTransferredListener)
    }
  }, [itemShareContract])

  const handleAddItem = () => {
    ensItemShareContract.addItem(metadata)
      .finally(() => setMetadata(''))
  }

  const handleMetadataChange = (event) => {
    setMetadata(event.target.value)
  }

  const handleRemoveItem = (id) => {
    ensItemShareContract.removeItem(id)
  }

  const handleRequestItem = (id) => {
    itemShareContract.requestItem(id, 100)
  }

  const handleApproveRequest = (id, requester, term) => {
    itemShareContract.approveRequest(requester, id, term)
  }

  const handleDenyRequest = (id, requester, term) => {
    itemShareContract.denyRequest(requester, id, term)
  }

  const handleTransferOwnership = (id) => {
    itemShareContract.transferOwnership(newOwner, id)
  }

  const handleNewOwnerChange = (event) => {
    setNewOwner(event.target.value)
  }

  const handleReturnItem = (id) => {
    itemShareContract.returnItem(id)
  }

  const yourItemsSet = new Set(yourItems)

  return (
    <div className="ens-item-share">
      <p>ENSItemShare contract address: {ensItemShareContract.address}</p>
      <p>ItemShare contract address: {itemShareContract ? itemShareContract.address : 'Loading...'}</p>
      <input type="text" value={metadata} onChange={handleMetadataChange} placeholder="Enter metadata" />
      <button onClick={handleAddItem}>Add Item</button>
      <h1>Requests for your items</h1>
      <div>
      {yourItems
        .map(id => {
          const requesters = requests[id]
          if (requesters) {
            return [].concat(Object.entries(requesters).map(([requester, term]) => (
              <div key={id.toString()}>
                  <p>Item ID: {id.toString()}</p>
                  <p>Requester: {requester}</p>
                  <p>Term: {term.toString()}</p>
                  <button onClick={() => handleApproveRequest(id, requester, term)}>Approve Request</button>
                  <button onClick={() => handleDenyRequest(id, requester, term)}>Deny Request</button>
              </div>
            )))
          }
        })
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
                  <div>
                    <button onClick={() => handleRemoveItem(id)}>Remove Item</button>
                    <input type="text" value={newOwner} onChange={handleNewOwnerChange} placeholder="Enter new owner's address" />
                    <button onClick={() => handleTransferOwnership(id)}>Transfer Ownership</button>
                  </div>
                }
                <button onClick={() => handleRequestItem(id)}>Request Item for 100 blocks</button>
            </div>
          )
        )
      }
      </div>
      <h1>Your Held Items</h1>
      <div>
      {yourHeldItems
        .map(id => [id, items[id]])
        .filter(([_, item]) => item)
        .map(([id, item]) => (
            <div key={id.toString()}>
                <p>Item ID: {id.toString()}</p>
                <p>Item Owner: {item.data.owner}</p>
                <p>Metadata: {item.metadata}</p>
                {item.data.owner === context.address &&
                  <div>
                    <button onClick={() => handleRemoveItem(id)}>Remove Item</button>
                  </div>
                }
                {item.data.termEnd !== 0 &&
                  <div>
                    <button onClick={() => handleReturnItem(id)}>Return Item</button>
                  </div>
                }
            </div>
          )
        )
      }
      </div>
    </div>
  )
}

export default ENSItemShare
