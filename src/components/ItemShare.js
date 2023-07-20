import React, { useState, useEffect, useContext, useRef } from 'react'
import HyphenContext from './HyphenContext'
import Address from './Address'
import Blockies from 'react-blockies'
import { Tab, Tabs } from 'react-bootstrap'
import Overlay from 'react-bootstrap/Overlay'
import Popover from 'react-bootstrap/Popover'
import './ItemShare.css'
import { CSSTransition } from 'react-transition-group'
const BigNumber = require('bignumber.js')
const ethers = require("ethers")

const ZeroAddress = "0x0000000000000000000000000000000000000000"
const BlocksPerDay = 86400 / 6

const Item = (
  {id, item, requests, actions }) => {
  const [handleDeleteItem, handleTransferOwnership, handleReturnItem, handleRequestItem, handleApproveRequest, handleDenyRequest] = [...actions]
  const context = useContext(HyphenContext)
  const [term, setTerm] = useState(BlocksPerDay)
  const [ownerEnsName, setOwnerEnsName] = useState('')
  const [holderEnsName, setHolderEnsName] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [isRequestVisible, setIsRequestVisible] = useState(false)
  const [showOverflowPopover, setShowOverflowPopover] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestPopoverTarget, setRequestPopoverTarget] = useState(null)
  const [target, setTarget] = useState(null)
  const ref = useRef(null)
  
  const handleRequestClick = () => {
    setIsRequestVisible(true)
    setSelectedRequest(null)
  }
  
  const handleClearClick = () => {
    setTerm(BlocksPerDay)
    setIsRequestVisible(false)
  }

  const handleSubmitClick = () => {
    if (window.confirm('Are you sure you want to submit this request?')) {
      handleRequestItem(id, term)
      handleClearClick()
    }
  }
  
  const handleConfirm = () => {
    handleRequestItem(id, term)
    handleClearClick()
  }

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
      let ensName = await context.getEnsName(item.item.owner)
      setOwnerEnsName(ensName || item.item.owner)
    }
    fetchENSName()
  }, [item.item.owner])

  React.useEffect(() => {
    async function fetchENSName() {
      let ensName = await context.getEnsName(item.item.holder)
      setHolderEnsName(ensName || item.item.holder)
    }
    fetchENSName()
  }, [item.item.holder])

  const generateColor = (id) => {
    const maxHue = 360
    let bigNumber = new BigNumber(id)
    let hue = bigNumber.modulo(maxHue).toNumber()
    let saturation = bigNumber.modulo(30).toNumber() + 20
    let lightness = bigNumber.modulo(50).toNumber() + 50
    let color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    return color
  } 

  const computeTime = (blocks) => {
    const seconds = blocks * 6
    if (seconds < 60) {
        return 'less than one minute'
    }

    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      const remainingHours = hours % 24
      return `${days} day${days == 1 ? '' : 's'}${remainingHours > 0 ? `, ${remainingHours} hour${remainingHours == 1 ? '' : 's'}` : ''}`
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60
      return `${hours} hour${hours == 1 ? '' : 's'}${remainingMinutes > 0 ? `, ${remainingMinutes} minute${remainingMinutes == 1 ? '' : 's'}` : ''}`
    } else {
        return `${minutes} minute${minutes == 1 ? '' : 's'}`
    }
  }

  const backgroundColor = generateColor(id)
  const requestEntries = requests ? Object.entries(requests) : []

  return (
    <div style={{ backgroundColor: backgroundColor, padding: '20px', borderRadius: '10px', margin: '10px 0'}}>
      <div style={{display: 'flex'}}>
        <Blockies scale={8} seed={id} />
        <div style={{ marginLeft: '1em' }}>
          <h2>{item.metadata}</h2>
          <p>🏠 <strong>{isMyItem ? 'You' : ownerEnsName}</strong></p>
          { isBorrowed && <p>🤲 <strong>{isHeldItem ? 'You' : holderEnsName}</strong></p>}
        </div>
        { isMyItem &&
          <div style={{ position: 'relative', float: 'right', marginLeft: 'auto' }} ref={ref}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" onClick={(event) => {
              setShowOverflowPopover(!showOverflowPopover)
              setTarget(event.target)
            }}>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </div>
        }
      </div>
      {
        requestEntries.length > 0 &&
        <div style={{ marginTop: '0.5em', display: 'flex', alignItems: 'center' }}>
          <p>🙋&nbsp;</p>
          {
            requestEntries.map(([requester, term]) => {
              const isSelectedRequest = selectedRequest && selectedRequest.requester === requester
              var style = { display: "inline-block", marginRight: '.5em', lineHeight: '0',
                borderStyle: 'solid', borderWidth: '2px', borderColor: isSelectedRequest ? 'yellow' : backgroundColor }
              return (
                <div key={`request-${id}-${requester}`} style={style}
                  onClick={() => {
                    if (isSelectedRequest) {
                      setSelectedRequest(null)
                    } else {
                      setSelectedRequest({ requester: requester, term: term })
                    }
                  }}>
                  <Blockies scale={4} seed={requester} />
                </div>
              )
            })
          }
        </div>
      }
      { selectedRequest != null && !isRequestVisible && <div>
        <Address address={selectedRequest.requester} />
        <p>{computeTime(term)}</p>
        {isMyItem && (
          <button onClick={() => handleApproveRequest(id, selectedRequest.requester, selectedRequest.term)}>Approve</button>
        )}
        {isMyItem && (
          <button onClick={() => handleDenyRequest(id, selectedRequest.requester, selectedRequest.term)}>Deny</button>
        )}
      </div>}
      <div style={{display: 'flex', marginTop: '0.5em'}}>
        {isHeldItem && !item.item.available &&
          <button onClick={() => handleReturnItem(id)}>Return Item</button>
        }
        {item.item.available && !isMyItem &&
          <div>
            {!isRequestVisible && <button onClick={handleRequestClick}>Request to Borrow</button>}
            {isRequestVisible && 
              <div>
                <input type="range" min={1*BlocksPerDay} max={14*BlocksPerDay} value={term} onChange={handleTermChange} placeholder="Enter number of days" />
                <p>{computeTime(term)}</p>
                <button onClick={handleSubmitClick}>Submit Request</button>
                <button onClick={handleClearClick}>Cancel</button>
              </div>
            }
          </div>
        }
      </div>
      <Overlay show={showOverflowPopover} target={target} placement="bottom" container={ref.current} rootClose
        onHide={() => setShowOverflowPopover(false)}>
        <Popover id={`popover-contained-${id}`} title="Menu">
          <div>
            <button onClick={() => {
              const confirmDelete = window.confirm('Are you sure you want to delete this item?');
              if (confirmDelete) {
                handleDeleteItem(id);
                setShowOverflowPopover(false);
              }
            }}>
              Remove Item
            </button>
          </div>
        </Popover>
      </Overlay>
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
          <input type="text" value={metadata} onChange={handleMetadataChange} placeholder="Enter item name" onKeyPress={handleKeyPress}/>
          <button onClick={handleCancelCreateItem} className="cancel-button">x</button>
        </div>
      </CSSTransition>
    </div>
    <div className="item-share">
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
