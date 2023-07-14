import React, { useState, useEffect, useContext } from 'react'
import HyphenContext from './HyphenContext'
import Blockies from 'react-blockies';
import { Tab, Tabs } from 'react-bootstrap'
import './ItemShare.css'
import { CSSTransition } from 'react-transition-group'
const ethers = require("ethers");

const ZeroAddress = "0x0000000000000000000000000000000000000000"

const Item = (
  {id, item, requests, actions }) => {
  const [handleDeleteItem, handleTransferOwnership, handleReturnItem, handleRequestItem, handleApproveRequest, handleDenyRequest] = [...actions]
  const context = useContext(HyphenContext)
  const [term, setTerm] = useState(0)
  const [ownerEnsName, setOwnerEnsName] = useState('')
  const [holderEnsName, setHolderEnsName] = useState('')
  const [newOwner, setNewOwner] = useState('')

  const handleTermChange = (e) => {
    setTerm(e.target.value)
  }

  const handleNewOwnerChange = (event) => {
    setNewOwner(event.target.value)
  }

  const termEnd = item.item.termEnd
  const isAvailable = item.item.available
  const isActiveItem = item.item.owner !== ZeroAddress
  const isMyItem = item.item.owner === context.address
  const isHeldItem = item.item.holder === context.address
  const isBorrowed = item.item.owner !== item.item.holder
  const isLockedByOwner = isActiveItem && !isBorrowed && !isAvailable
  const isLockedIndefinitelyByOwner = isLockedByOwner && termEnd != 0

  React.useEffect(() => {
    async function fetchENSName() {
      let ensName = await context.lookupAddress(item.item.owner)
      setOwnerEnsName(ensName || item.item.owner)
    }
    fetchENSName()
  }, [item.item.owner])

  React.useEffect(() => {
    async function fetchENSName() {
      let ensName = await context.lookupAddress(item.item.holder)
      setHolderEnsName(ensName || item.item.holder)
    }
    fetchENSName()
  }, [item.item.holder])

  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center'}}>
        <Blockies seed={id} />
        <p>{item.metadata}</p>
      </div>
      <h4>Owned by</h4>
      <p>{ownerEnsName}</p>
      { isBorrowed && <>
        <h4>Borrowed by</h4>
        <p>{holderEnsName}</p>
      </>}
      {/* TODO: Implement ownership transfer UI */}
      {/* {isMyItem &&
        <div>
          <button onClick={() => handleDeleteItem(id)}>Remove Item</button>
          <input type="text" value={newOwner} onChange={handleNewOwnerChange} placeholder="Enter new owner's address" />
          <button onClick={() => handleTransferOwnership(id)}>Transfer Ownership</button>
        </div>
      } */}
      {isHeldItem && !item.item.available &&
        <div>
          <button onClick={() => handleReturnItem(id)}>Return Item</button>
        </div>
      }
      {item.item.available && !isMyItem &&
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
        if (!prev[id]) {
          return prev
        }
        const { metadata, ..._ } = prev[id]
        return { ...prev, [id]: { metadata: newMetadata , ..._ }} }
    } 

    const updateItemData = (_id, updateItem) => {
      const id = _id.toString()
      return prev => {
        if (!prev[id]) {
          return prev
        }
        const { item, ..._ } = prev[id]
        return { ...prev, [id]: { item: updateItem(item) , ..._ }} }
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

      if (owner != context.address) {
        context.addActivityToast(owner, `${owner} has added an item`)
      }
    }

    const itemRemovedListener = (owner, id) => {
      if (owner == context.address) {
        setYourItems(removeId(id))
        setYourHeldItems(removeId(id))
      }
      setLiveFeedItems(removeId(id))
      setItems(updateItemData(id, _ => { return {owner: ZeroAddress, holder: ZeroAddress, termEnd: 0, available: false} }))
    }

    const itemRequestedListener = (owner, requester, id, term) => {
      setLiveFeedItems(addId(id))
      setRequests(addRequest(id, requester, term))
      if (owner == context.address) {
        context.addActivityToast(requester, `${requester} has requested your item ${id} for ${term} blocks`)
      }
    }

    const requestApprovedListener = (owner, requester, id, termEnd) => {
      setLiveFeedItems(addId(id))
      setRequests(removeRequest(id, requester))
      setItems(updateItemData(id, prev => { return { ...prev, holder: requester, termEnd: termEnd, available: false } }))
      if (requester == context.address) {
        context.addActivityToast(owner, `${owner} has approved your request to borrow item ${id} until ${termEnd}`)
      }
    }

    const requestDeniedListener = (owner, requester, id, term) => {
      setLiveFeedItems(addId(id))
      setRequests(removeRequest(id, requester))
      if (requester == context.address) {
        context.addActivityToast(owner, `${owner} has denied your request to borrow item ${id} for ${term} blocks`)
      }
    }

    const itemReturnedListener = (owner, requester, id) => {
      const isSelfTransfer = owner === requester
      if (!isSelfTransfer) {
        if (owner === context.address) {
          setYourHeldItems(addId(id))
          context.addActivityToast(requester, `${requester} has returned your item ${id}`)
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
          context.addActivityToast(fromOwner, `${fromOwner} has transferred item ${id} to you`)
        }

        if (fromOwner === context.address) {
          setYourItems(removeId(id))
        }
      }

      setLiveFeedItems(addId(id))
      setItems(updateItemData(id, prev => { return { ...prev, owner: newOwner } }))
    }

    const metadataUpdatedListener = (owner, id, newMetadata) => {
      setLiveFeedItems(addId(id))
      setItems(updateItemMetadata(id, newMetadata))
      if (owner != context.address) {
        context.addActivityToast(owner, `${owner} has changed item ${id} metadata to ${newMetadata}`)
      }
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
    setShowInput(false)
    itemShareContract.createItem()
      .then((result) => computeItemId(result.blockNumber).then(id => {
        console.log(`Adding metadata for ${id.toString()}`)
        return ensItemShareContract.addItemMetadata(id, metadata)
      }))
      .finally(() => setMetadata(''))
  }

  const handleCancelCreateItem = () => {
    setShowInput(false)
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

  const handleReturnItem = (id) => {
    itemShareContract.returnItem(id)
  }

  const itemActions = [handleDeleteItem, handleTransferOwnership, handleReturnItem, handleRequestItem, handleApproveRequest, handleDenyRequest]

  const getLoadedItemsAndRequests = (ids) => {
    return Array.from(ids).reverse().map(id => [id, items[id], requests[id]])
      .filter(([_, item, __]) => item && item.item && item.metadata)
  }

  function handleStartCreateItem() {
    setShowInput(true);
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if(window.confirm('Are you sure you want to submit this item?')) {
        handleCreateItem();
      }
    }
  }
  
  const createItem = (keyPrefix) => ([id, item, requests]) =>
    (<Item key={`${keyPrefix}-${id}`} id={id} item={item} requests={requests} actions={itemActions} />)

  const borrowedItemsHydrated = getLoadedItemsAndRequests(yourHeldItems)
    .filter(([_, item, __]) => item.item.owner != context.address)
    .map(createItem("yourhelditem"))

  const yourItemsHydrated = getLoadedItemsAndRequests(yourItems)
    .map(createItem("youritem"))

  const liveFeedItemsHydrated = getLoadedItemsAndRequests(liveFeedItems)
    .map(createItem("livefeeditem"))

  return (<>
    <div className="popover-container">
      <CSSTransition in={!showInput} timeout={300} classNames="fade" unmountOnExit>
        <button className="floating-button" onClick={handleStartCreateItem}>+</button>
      </CSSTransition>
      <CSSTransition in={showInput} timeout={300} classNames="fade" unmountOnExit>
        <div className="popover-input">
          <input type="text" value={metadata} onChange={handleMetadataChange} placeholder="Enter metadata" onKeyPress={handleKeyPress}/>
          <button onClick={handleCancelCreateItem} className="cancel-button">x</button>
        </div>
      </CSSTransition>
    </div>
    <div className="ens-item-share">
      <Tabs defaultActiveKey="yourItems" id="uncontrolled-tab-example">
        <Tab eventKey="yourItems" title="Your Items">
          {borrowedItemsHydrated.length > 0 && <>
            <h1>Currently Borrowing</h1>
            <div>
              {borrowedItemsHydrated}
            </div>
          </>}
          {yourItemsHydrated.length > 0 && <>
            <h1>Your Items</h1>
            <div>
              {yourItemsHydrated}
            </div>
          </> || <p>Nothing to show yet.  To get started, add or request to borrow an item.</p>}
        </Tab>
        <Tab eventKey="explore" title="Explore">
          {liveFeedItemsHydrated.length > 0 && <>
            <h1>Recent activity</h1>
            <div>
              {liveFeedItemsHydrated}
            </div>
          </> || <p>Nothing to show yet.  To get started, add an item.</p>}
        </Tab>
      </Tabs>
    </div>
  </>)
}

export default ENSItemShare
