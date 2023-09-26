import { useContext } from 'react';
import HyphenContext from '../context/HyphenContext';
import { usePromise } from 'react-use'
import useInteractiveContractState from '../hooks/useInteractiveContractState'
const ethers = require('ethers');

const updateApprovalForAll = (blockNumber, owner, operator, isApproved) => {
  return (approvals) => {
    console.log(JSON.stringify(approvals))
    return {
      ...approvals,
      [owner]: {
        ...approvals[owner],
        [operator]: {isApproved: isApproved, blockNumber: blockNumber}
      }
    }
  }
}

const useIsApprovedForAll = (address) => {
  const mounted = usePromise()
  const context = useContext(HyphenContext)
  const ensContract = context.getContract(context.configuration.ens)

  const [approvals, { withPendingApprovalForAll }] = useInteractiveContractState(
    ensContract,
    context.getBlockNumber(),
    ensContract.isApprovedForAll(context.address, address).then((isApproved) => {
      return { [context.address]: {
        [address]: {isApproved: isApproved, blockNumber: context.getBlockNumber()}
      }
    }}),
    {
      ApprovalForAll: {
        filterArgs: [context.address, address, null],
        digestEvent: updateApprovalForAll
      }
    }
  )

  const handleApprove = () => {
    withPendingApprovalForAll(context.address, address, true)(ensContract.setApprovalForAll(address, true))
  }

  const handleDisapprove = () => {
    withPendingApprovalForAll(context.address, address, false)(ensContract.setApprovalForAll(address, false))
  }


  const isApproved = approvals ? approvals[context.address] ? approvals[context.address][address] ? approvals[context.address][address].isApproved : false : false : false

  return [
    isApproved,
    handleApprove,
    handleDisapprove
  ]
}

export default useIsApprovedForAll