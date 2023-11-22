import { useState, useEffect, useContext } from 'react'
import HyphenContext from '../context/HyphenContext'
const ethers = require("ethers")

const mergeAndSortEvents = (events) => {
  const allEvents = [].concat(...events)

  return allEvents.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    } else if (a.transactionIndex !== b.transactionIndex) {
      return a.transactionIndex - b.transactionIndex
    } else if (a.args.id.toString() !== b.args.id.toString()) {
      return a.args.id.toString().localeCompare(b.args.id.toString())
    } else if (a.event !== b.event) {
      return a.event.localeCompare(b.event)
    } else {
      return 0
    }
  })
}

const useEventDigest = (contract, startBlock, initialStatePromise, eventHandlers) => {
  const context = useContext(HyphenContext)
  const [state, setState] = useState(null)

  useEffect(() => {
    const blockNumber = context.getBlockNumber()
    console.log(`Fetching Initial State Current Block: ${blockNumber}`)
    initialStatePromise.then((initialState) => {
      console.log(`Initital State: ${JSON.stringify(initialState)}`)
      console.log(`Digesting initial events: Start block: ${startBlock}, Current Block: ${blockNumber}`)
      if (startBlock < blockNumber) {
        console.log(`Digesting prior events`)
        const digestEvents = (events) => {
          setState(mergeAndSortEvents(events).reduce((result, event) => {
            return eventHandlers[event.event].digestEvent(event.blockNumber, ...event.args)(result)
          }, initialState))
        }
  
        Promise.all(Object.entries(eventHandlers).map(([eventName, {filterArgs}]) => {
          const filterArgsToUse = filterArgs ? filterArgs : []
          const filter = contract.filters[eventName](...filterArgsToUse)
          return contract.queryFilter(filter, startBlock, blockNumber)
        })).then(digestEvents)
      } else {
        console.log(`Setting initial state directly`)
        setState(initialState)
      }
    })
  }, [])

  useEffect(() => {
    const unregisterListeners = Object.entries(eventHandlers).map(([eventName, {filterArgs, digestEvent}]) => {
      const filterArgsToUse = filterArgs ? filterArgs : []
      const filter = contract.filters[eventName](...filterArgsToUse)
      const listener = (...args) => {
        const blockNumber = context.getBlockNumber()
        console.log(`:${blockNumber}:${eventName}`)
        setState(digestEvent(blockNumber, ...args))
      }
      contract.on(filter, listener)
      return () => {
        contract.off(filter, listener)
      }
    })

    return () => {
      unregisterListeners.forEach((fn) => {fn()})
    }
  }, [])

  return state
}

const useInteractiveContractState = (contract, startBlock, initialStatePromise, eventHandlers) => {
  const context = useContext(HyphenContext)
  const trueState = useEventDigest(contract, startBlock, initialStatePromise, eventHandlers)
  const [pendingEvents, setPendingEvents] = useState(
    Object.fromEntries(
      Object.entries(eventHandlers).map(([eventName, _]) => [eventName, {}])))
  const [withPendingEventFunctions, setWithPendingEventFunctions] = useState(
    Object.fromEntries(
      Object.entries(eventHandlers).map(([eventName, _]) => [eventName, () => {}])))
  const [mergedState, setMergedState] = useState(null)

  useEffect(() => {
    const withPendingEventFunctions = Object.fromEntries(
      Object.entries(eventHandlers)
        .map(([eventName, _]) => {
          const withPendingEvent = (...args) => {
            const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
            const [...newPendingEvent] = args
            const blockNumber = context.getBlockNumber()
            newPendingEvent.blockNumber = context.getBlockNumber()
            console.log(`New pending event at ${blockNumber}`)
            const beforePromise = () => {
              setPendingEvents((prev) => {
                return {...prev, [eventName]: { ...prev[eventName], [actionId]: newPendingEvent}}
              })
            }
            const afterPromise = () => {
              setPendingEvents(prev => {
                const {[eventName]: { [actionId]: _, ...remainingInner }, ...remainingOuter } = prev
                return {[eventName]: { ...remainingInner }, ...remainingOuter }
              })
            }
            return (promise) => {
              beforePromise()
              return Promise.resolve(promise)
                .finally(() => {
                  // .25 sec delay to reduce visual jitter.
                  setTimeout(() => {
                    afterPromise()
                  }, 250)
                })
            }
          }

          return [`withPending${eventName}`, withPendingEvent]
        })
    )
    setWithPendingEventFunctions(withPendingEventFunctions)
  }, [])

  useEffect(() => {
    if (trueState === null) {
      return
    }

    const mergeFunctions = Object.entries(eventHandlers)
      .map(([eventName, { digestEvent }]) => {
        const pendingEventsForEventName = Object.values(pendingEvents[eventName])
        return (state) => {
          return pendingEventsForEventName.reduce((result, pendingEvent) => {
            return digestEvent(pendingEvent.blockNumber, ...pendingEvent)(result)
          }, state)
        }
      })

    const newMergedState = mergeFunctions.reduce((result, mergeFunction) => {
      return mergeFunction(result)
    }, trueState)

    setMergedState(newMergedState)
  }, [trueState, pendingEvents])

  return [mergedState, withPendingEventFunctions]
}

export default useInteractiveContractState;