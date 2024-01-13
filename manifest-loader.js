const fs = require('fs');
const path = require('path');
const manifest = require('./manifest.json');

module.exports = function (source) {

  const contractsDeclaration = `const CONTRACTS = {};`;
  const getContractAbiExpression = (contractName) => {
    const contractNameParts = contractName.split('/');
    const moduleContractPath = path.join("artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    const moduleDependencyContractPath = path.join("node_modules", contractNameParts[0] || '', contractNameParts[1] || '', "artifacts", "contracts", contractNameParts.slice(2, contractNameParts.length - 1).join('/'), `${contractNameParts[contractNameParts.length - 1]}.sol`, `${contractNameParts[contractNameParts.length - 1]}.json`);
    const isDependency = !fs.existsSync(moduleContractPath)
    const modulePath = isDependency ? moduleDependencyContractPath : moduleContractPath;
    const expression = `(await import('../${modulePath}'))`;
    return expression + '.abi';
  }

  const ensAbi = `const ENS_ABI = ${getContractAbiExpression('@local-blockchain-toolbox/ens-contracts/registry/ENS')};`

  const ensEntries = [
    [ manifest.name, manifest.source],
    [ 'ens', '@local-blockchain-toolbox/ens-contracts/registry/ENS' ],
    [ 'resolver', '@local-blockchain-toolbox/ens-contracts/resolvers/PublicResolver' ],
    [ 'addr.reverse', '@local-blockchain-toolbox/contract-primitives/IntrinsicRegistrar']
  ];

  const deployedEntries = Object.entries(manifest.deploy).map(([key, value]) => [`${key}.${manifest.name}`, value.source]);
  const allEntries = [...ensEntries, ...deployedEntries];
  const importStatements = allEntries
    .map(
      ([address, contractName]) => `CONTRACTS['${address}'] = ${getContractAbiExpression(contractName)};`
    )
    .join('\n');

  return `${contractsDeclaration}\n${importStatements}\n${source}`;
};
