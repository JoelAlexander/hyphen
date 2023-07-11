import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import { Tab, Tabs } from 'react-bootstrap'
import './ItemShare.css'
import { CSSTransition } from 'react-transition-group'
const ethers = require("ethers");

const ZeroAddress = "0x0000000000000000000000000000000000000000"

const ENSItemShare = () => {
  const context = useContext(HyphenContext)
  const itemShareContract = context.getContract('itemshare.hyphen')
  const ensItemShareContract = context.getContract('itemsharemetadata.hyphen')
  const [items, setItems] = useState({})
  const [requests, setRequests] = useState({})
  const [yourItems, setYourItems] = useState(new Set())
  const [yourHeldItems, setYourHeldItems] = useState(new Set())
  const [liveFeedItems, setLiveFeedItems] = useState(new Set())

  const [showInput, setShowInput] = useState(false);
  const [metadata, setMetadata] = useState('')
  const [newOwner, setNewOwner] = useState('')

  const computeItemId = (blockNumber) => {
    return itemShareContract.resolvedAddress.then(contractAddress => {
      const packedData = ethers.utils.solidityPack(
        ['address', 'address', 'uint'],
        [contractAddress, context.address, blockNumber])
      console.log(packedData)
      const hash = ethers.utils.keccak256(packedData)
      return ethers.BigNumber.from(hash)
    })
  }

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

  const loadItems = (ids) => {
    const toLoad = Array.from(ids).filter(id => items[id] === undefined)
    if (toLoad.length === 0) {
      return
    }
    setItems(prev => {
      const { ...newItems } = prev
      toLoad.forEach(id => newItems[id] = null)
      console.log(`Loading ${toLoad.length} items`)
      return newItems
    })
    ensItemShareContract.getItemsAndMetadata(toLoad)
      .then(loaded => {
        const loadedItems = toLoad.map((id, i) => [id, loaded[i]])
        setItems(prev => {
          const { ...newItems } = prev
          loadedItems.forEach(([id, item]) => newItems[id] = item)
          console.log(`Loaded ${Object.keys(newItems).length} total items`)
          return newItems
        })
      })
  }

  useEffect(() => {
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

    const requestsApprovedToYouFilter = itemShareContract.filters.RequestApproved(null, context.address)
    const requestsApprovedToYouEvents = itemShareContract.queryFilter(requestsApprovedToYouFilter, 0, context.blockNumber)

    const ownershipTransferredFromYouFilter = itemShareContract.filters.OwnershipTransferred(context.address)
    const ownershipTransferredFromYouEvents = itemShareContract.queryFilter(ownershipTransferredFromYouFilter, 0, context.blockNumber)

    const ownershipTransferredToYouFilter = itemShareContract.filters.OwnershipTransferred(null, context.address)
    const ownershipTransferredToYouEvents = itemShareContract.queryFilter(ownershipTransferredToYouFilter, 0, context.blockNumber)

    const returnsToYouFilter = itemShareContract.filters.ItemReturned(context.address)
    const returnsToYouEvents = itemShareContract.queryFilter(returnsToYouFilter, 0, context.blockNumber)

    const returnsFromYouFilter = itemShareContract.filters.ItemReturned(null, context.address);
    const returnsFromYouEvents = itemShareContract.queryFilter(returnsFromYouFilter, 0, context.blockNumber)

    const recentAdditionsFilter = itemShareContract.filters.ItemAdded()
    const recentAdditionEvents = itemShareContract.queryFilter(recentAdditionsFilter, 0, context.blockNumber)

    const recentRemovalsFilter = itemShareContract.filters.ItemRemoved()
    const recentRemovalEvents = itemShareContract.queryFilter(recentRemovalsFilter, 0, context.blockNumber)

    const recentRequestsFilter = itemShareContract.filters.ItemRequested()
    const recentRequestEvents = itemShareContract.queryFilter(recentRequestsFilter, 0, context.blockNumber)

    const recentReturnsFilter = itemShareContract.filters.ItemReturned()
    const recentReturnEvents = itemShareContract.queryFilter(recentReturnsFilter, 0, context.blockNumber)

    const recentOwnershipTransferredFilter = itemShareContract.filters.ItemReturned()
    const recentOwnershipTransferredEvents = itemShareContract.queryFilter(recentOwnershipTransferredFilter, 0, context.blockNumber)

    Promise.all([yourAddedItemsEvents, yourRemovedItemsEvents, requestsApprovedToYouEvents, requestsApprovedFromYouEvents, returnsToYouEvents, returnsFromYouEvents])
        .then(mergeAndSortEvents)
        .then(events => {
          setYourHeldItems(events.reduce((result, event) => {
              const id = event.args.id.toString()
              const isAdd = (event.event == 'ItemAdded') ||
                (event.event == 'RequestApproved' && context.address == event.args.requester) ||
                (event.event == 'ItemReturned' && context.address == event.args.owner)
              const isRemove = (event.event == 'ItemRemoved') ||
                (event.event == 'RequestApproved' && context.address == event.args.owner) ||
                (event.event == 'ItemReturned' && context.address == event.args.requester)
              const selfEvent = event.args.owner == event.args.requester
              if (isAdd && !selfEvent) {
                result.add(id)
              } else if (isRemove && !selfEvent) {
                result.delete(id)
              }
              return result
          }, new Set(yourHeldItems)))
        })

    Promise.all([yourRemovedItemsEvents, yourAddedItemsEvents, ownershipTransferredFromYouEvents, ownershipTransferredToYouEvents])
      .then(mergeAndSortEvents)
      .then(events => {
        setYourItems(events.reduce((result, event) => {
          const id = event.args.id.toString()
          const isTransfer = event.event == 'OwnershipTransferred'
          const isSelfTransfer = isTransfer && (event.args.toOwner == event.args.fromOwner)
          const isTransferTo = isTransfer && !isSelfTransfer && (event.args.toOwner == context.address)
          const isTransferFrom = isTransfer && !isSelfTransfer && (event.args.fromOwner == context.address)
          if (event.event === 'ItemAdded' || isTransferTo) {
            result.add(id)
          } else if (event.event === 'ItemRemoved' || isTransferFrom) {
            result.delete(id)
          }
          return result
        }, new Set(yourItems)))
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

    Promise.all([recentAdditionEvents, recentRemovalEvents, recentRequestEvents, recentReturnEvents, recentOwnershipTransferredEvents])
      .then(mergeAndSortEvents)
      .then(events => {
        setLiveFeedItems(events.reduce((result, event) => {
          result.add(event.args.id.toString())
          return result
        }, new Set(liveFeedItems)))
      })
  }, [])

  useEffect(() => {
    loadItems(yourItems)
  }, [yourItems])

  useEffect(() => {
    loadItems(yourHeldItems)
  }, [yourHeldItems])

  useEffect(() => {
    loadItems(liveFeedItems)
  }, [liveFeedItems])

  useEffect(() => {
    const updateItemMetadata = (_id, newMetadata) => {
      const id = _id.toString()
      return prev => {
        const { metadata, ...remaining } = prev[id]
        return { ...prev, [id]: { metadata: newMetadata , ...remaining }} }
    } 

    const updateItemData = (_id, updateData) => {
      const id = _id.toString()
      return prev => {
        const { prevData, ...remaining } = prev[id]
        return { ...prev, [id]: { data: updateData(prevData) , ...remaining }} }
    }

    const addId = (_id) => {
      const id = _id.toString()
      return prev => { return new Set(prev).add(id) }
    }

    const removeId = (_id) => {
      const id = _id.toString()
      return prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      }
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

    const itemAddedListener = (owner, id) => {
      console.log(`ID Added: ${id}`)
      if (owner == context.address) {
        setYourItems(addId(id))
        setYourHeldItems(addId(id))
      }
      setLiveFeedItems(addId(id))
    }

    const itemRemovedListener = (owner, id) => {
      if (owner == context.address) {
        setYourItems(removeId(id))
        setYourHeldItems(removeId(id))
      }
      setLiveFeedItems(removeId(id))
      setItems(updateItemData(id, _ => { return {owner: ZeroAddress, holder: ZeroAddress, termEnd: 0, available: false} }))
    }

    const itemRequestedListener = (_, requester, id, term) => {
      setLiveFeedItems(addId(id))
      setRequests(addRequest(id, requester, term))
    }

    const requestApprovedListener = (_, requester, id, termEnd) => {
      setLiveFeedItems(addId(id))
      setRequests(removeRequest(id, requester))
      setItems(updateItemData(id, prev => { return { ...prev, holder: requester, termEnd: termEnd, available: false } }))
    }

    const requestDeniedListener = (_, requester, id, __) => {
      setLiveFeedItems(addId(id))
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

      setLiveFeedItems(addId(id))
      setItems(updateItemData(id, prev => { return { ...prev, holder: owner, termEnd: 0, available: true } }))
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

      setLiveFeedItems(addId(id))
      setItems(updateItemData(id, prev => { return { ...prev, owner: newOwner } }))
    }

    const metadataUpdatedListener = (id, newMetadata) => {
      setLiveFeedItems(addId(id))
      setItems(updateItemMetadata(id, newMetadata))
    }

    itemShareContract.on("ItemAdded", itemAddedListener)
    itemShareContract.on("ItemRemoved", itemRemovedListener)
    itemShareContract.on("ItemRequested", itemRequestedListener)
    itemShareContract.on("RequestApproved", requestApprovedListener)
    itemShareContract.on("RequestDenied", requestDeniedListener)
    itemShareContract.on("ItemReturned", itemReturnedListener)
    itemShareContract.on("OwnershipTransferred", ownershipTransferredListener)
    ensItemShareContract.on("MetadataUpdated", metadataUpdatedListener)

    return () => {
      itemShareContract.off("ItemAdded", itemAddedListener)
      itemShareContract.off("ItemRemoved", itemRemovedListener)
      itemShareContract.off("ItemRequested", itemRequestedListener)
      itemShareContract.off("RequestApproved", requestApprovedListener)
      itemShareContract.off("RequestDenied", requestDeniedListener)
      itemShareContract.off("ItemReturned", itemReturnedListener)
      itemShareContract.off("OwnershipTransferred", ownershipTransferredListener)
      ensItemShareContract.off("MetadataUpdated", metadataUpdatedListener)
    }
  }, [itemShareContract])

  const handleCreateItem = () => {
    setShowInput(false);
    itemShareContract.createItem()
      .then((result) => computeItemId(result.blockNumber).then(id => {
        console.log(`Adding metadata for ${id.toString()}`)
        return ensItemShareContract.addItemMetadata(id, metadata)
      }))
      .finally(() => setMetadata(''))
  }

  const handleMetadataChange = (event) => {
    setMetadata(event.target.value)
  }

  const handleDeleteItem = (id) => {
    const {_, metadata} = items[id]
    if (metadata) {
      ensItemShareContract.removeItemMetadata(id)
    }
    itemShareContract.deleteItem(id)
  }

  const handleRequestItem = (id, term) => {
    itemShareContract.requestItem(id, term)
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

  const getLoadedItemsAndRequests = (ids) => {
    return Array.from(ids).reverse().map(id => [id, items[id], requests[id]])
      .filter(([_, item, __]) => item && item.item && item.metadata)
  }


  function handleStartCreateItem() {
    setShowInput(true);
  }

  const Item = ({id, item, requests}) => {
    const [term, setTerm] = React.useState(0);

    const handleTermChange = (e) => {
      setTerm(e.target.value);
    };

    const isRequestable = item.item.owner !== ZeroAddress;
    const isMyItem = item.item.owner === context.address;
    const isHeldItem = item.item.holder === context.address;
    
    return (
      <div>
        <p>Item ID: {id}</p>
        <p>Item Owner: {item.item.owner}</p>
        <p>Metadata: {item.metadata}</p>
        {isMyItem &&
          <div>
            <button onClick={() => handleDeleteItem(id)}>Remove Item</button>
            <input type="text" value={newOwner} onChange={handleNewOwnerChange} placeholder="Enter new owner's address" />
            <button onClick={() => handleTransferOwnership(id)}>Transfer Ownership</button>
          </div>
        }
        {isHeldItem && !item.item.available &&
          <div>
            <button onClick={() => handleReturnItem(id)}>Return Item</button>
          </div>
        }
        {isRequestable && item.item.available && 
          <div>
            <input type="number" value={term} onChange={handleTermChange} placeholder="Enter number of blocks" />
            <button onClick={() => handleRequestItem(id, term)}>Request Item for {term} blocks</button>
          </div>
        }
        {requests && [].concat(Object.entries(requests).map(([requester, term]) => (
            <div key={`request-${id}-${requester}`}>
                <p>Requester: {requester}</p>
                <p>Term: {term.toString()}</p>
                { isMyItem && <button onClick={() => handleApproveRequest(id, requester, term)}>Approve Request</button> }
                { isMyItem && <button onClick={() => handleDenyRequest(id, requester, term)}>Deny Request</button> }
            </div>
          )))}
      </div>
    )
  }

  return (
    <div className="ens-item-share">
      <Tabs defaultActiveKey="yourItems" id="uncontrolled-tab-example">
        <Tab eventKey="yourItems" title="Your Items">
          <h1>Currently Borrowing</h1>
          <div>
          {getLoadedItemsAndRequests(yourHeldItems)
            .map(([id, item, requests]) => (<Item key={`yourhelditem-${id}`} id={id} item={item} requests={requests} />))
          }
          </div>
          <h1>Your Items</h1>
          <div>
          {getLoadedItemsAndRequests(yourItems)
            .map(([id, item, requests]) => (<Item key={`youritem-${id}`} id={id} item={item} requests={requests} />))
          }
          </div>
          <CSSTransition
            in={!showInput}
            timeout={300}
            classNames="fade"
            unmountOnExit
          >
            <button className="floating-button" onClick={handleStartCreateItem}>
              +
            </button>
          </CSSTransition>
          <CSSTransition
            in={showInput}
            timeout={300}
            classNames="fade"
            unmountOnExit
          >
            <div className="popover-input">
              <input type="text" value={metadata} onChange={handleMetadataChange} placeholder="Enter metadata" />
              <button onClick={handleCreateItem}>Submit</button>
            </div>
          </CSSTransition>
        </Tab>
        <Tab eventKey="explore" title="Explore">
          <h1>Live Feed Items</h1>
          <div>
          {getLoadedItemsAndRequests(liveFeedItems)
            .map(([id, item, requests]) => (<Item key={`livefeeditem-${id}`} id={id} item={item} requests={requests} />))
          }
          </div>
        </Tab>
      </Tabs>
    </div>
  )
}

export default ENSItemShare
