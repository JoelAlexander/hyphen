import { useContext } from 'react'
import HyphenContext from '../context/HyphenContext'
import useInteractiveContractState from '../hooks/useInteractiveContractState'
import { namehash } from 'ethers/lib/utils'
const ethers = require('ethers')

const useAccountTextRecord = (key) => {
  const context = useContext(HyphenContext)
  const resolver = context.getContract('resolver')

  const strippedAddress = context.address.substring(2)
  const reverseNode = namehash(`${strippedAddress}.addr.reverse`)

  const [text, { withPendingTextChanged }] = useInteractiveContractState(
    resolver,
    context.getBlockNumber(),
    resolver.text(reverseNode, key),
    {
      TextChanged: {
        filterArgs: [reverseNode, key, null, null ],
        digestEvent: (blockNumber, node, indexedKey, key, value) => {
          return () => value
        }
      }
    }
  )

  const handleChangeText = () => {
    withPendingTextChanged(context.address, address, true)(ensContract.setApprovalForAll(address, true))
  }

  return [
    text,
    handleChangeText
  ]
}

export default useAccountTextRecord