import { useContext } from 'react'
import HyphenContext from '../context/HyphenContext'
import useInteractiveContractState from '../hooks/useInteractiveContractState'
import { namehash } from 'ethers/lib/utils'
const ethers = require('ethers')

const useIntrinsicRegistrar = () => {
  const context = useContext(HyphenContext)
  const ens = context.getContract('ens')
  const intrinsicRegistrar = context.getContract('addr.reverse')

  const strippedAddress = context.address.substring(2)
  const reverseNode = namehash(`addr.reverse`)
  const reverseAddressNode = namehash(`${strippedAddress}.addr.reverse`)
  const label = ethers.utils.solidityKeccak256(['string'], [strippedAddress.toLowerCase()])

  const [owner, { withPendingNewOwner, withPendingTransfer }] = useInteractiveContractState(
    ens,
    context.getBlockNumber(),
    ens.owner(reverseAddressNode),
    {
      NewOwner: {
        filterArgs: [reverseNode, label],
        digestEvent: (blockNumber, node, label, owner) => {
          return () => owner
        }
      },
      Transfer: {
        filterArgs: [reverseAddressNode],
        digestEvent: (blockNumber, node, owner) => {
          return  () => owner
        }
      }
    }
  )

  const handleConnectToNamespace = () => {
    withPendingNewOwner(reverseNode, label, context.address)(intrinsicRegistrar.claim())
  }

  const handleDisconnectFromNamespace = () => {
    withPendingTransfer(reverseAddressNode, intrinsicRegistrar.address)(ens.setOwner(reverseAddressNode, intrinsicRegistrar.address))
  }

  return [
    owner === context.address,
    handleConnectToNamespace,
    handleDisconnectFromNamespace
  ]
}

export default useIntrinsicRegistrar

