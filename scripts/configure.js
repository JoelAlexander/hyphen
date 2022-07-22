const path = require('node:path')
const fs = require('fs')

const args = process.argv.slice(2)
const chainId = parseInt(args[0])
const url = args[1]
const ensAddress = args[2]
const ensDomain = args[3]

const configuration = {
  chainId: chainId,
  blockchainUrl: url,
  ensAddress: ensAddress,
  ensDomain: ensDomain
}

fs.writeFileSync(
  path.join(__dirname, '..', 'configuration.json'),
  JSON.stringify(configuration))
