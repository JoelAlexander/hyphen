import { useState, useEffect, useContext } from 'react'
import HyphenContext from '../components/HyphenContext'
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

const useEventDigest = (contract, startBlock, eventHandlers) => {
  const context = useContext(HyphenContext)
  const [state, setState] = useState({})

  const digestEvents = (events) => {
    setState(mergeAndSortEvents(events).reduce((result, event) => {
      return eventHandlers[event.event].digestEvent(event.blockNumber, ...event.args)(result)
    }, state))
  }

  useEffect(() => {
    Promise.all(Object.entries(eventHandlers).map(([eventName, {filterArgs}]) => {
      const startBlockToUse = startBlock ? startBlock : 0
      const filterArgsToUse = filterArgs ? filterArgs : []
      const filter = contract.filters[eventName](...filterArgsToUse)
      const queryFilter = contract.queryFilter(filter, startBlockToUse, context.blockNumber)
      return queryFilter
    })).then(digestEvents)
  }, [])

  useEffect(() => {
    const unregisterListeners = Object.entries(eventHandlers).map(([eventName, {digestEvent, filterArgs}]) => {
      const filterArgsToUse = filterArgs ? filterArgs : []
      const filter = contract.filters[eventName](...filterArgsToUse)
      const listener = (...args) => {
        setState(digestEvent(context.blockNumber, ...args))
      }
      contract.on(filter, listener)
      return () => {
        contract.off(filter, listener)
      }
    })

    return () => {
      unregisterListeners.forEach((fn) => {fn()})
    }
  }, [context.blockNumber])

  return state
}

const useInteractiveContractState = (contract, startBlock, eventHandlers) => {
  const context = useContext(HyphenContext)
  const trueState = useEventDigest(contract, startBlock, eventHandlers)
  const [pendingEvents, setPendingEvents] = useState(
    Object.fromEntries(
      Object.entries(eventHandlers).map(([eventName, _]) => [eventName, {}])))
  const [withPendingEventFunctions, setWithPendingEventFunctions] = useState(
    Object.fromEntries(
      Object.entries(eventHandlers).map(([eventName, _]) => [eventName, () => {}])))
  const [mergedState, setMergedState] = useState({})

  useEffect(() => {
    const withPendingEventFunctions = Object.fromEntries(
      Object.entries(eventHandlers)
        .map(([eventName, _]) => {
          const withPendingEvent = (...args) => {
            const actionId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
            const [...newPendingEvent] = args
            newPendingEvent.blockNumber = context.blockNumber
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
                .finally(() => afterPromise())
            }
          }

          return [`withPending${eventName}`, withPendingEvent]
        })
    )
    setWithPendingEventFunctions(withPendingEventFunctions)
  }, context.blockNumber)

  useEffect(() => {
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