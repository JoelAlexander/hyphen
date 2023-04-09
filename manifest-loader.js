const fs = require('fs');
const path = require('path');
const configuration = require('./configuration.json');
const manifest = require('./manifest.json');

module.exports = function (source) {

  const contractsDeclaration = `const contracts = {};`;

  const getContractAbiExpression = (contractName) => {
    const contractNameParts = contractName.split('/');
    const moduleContractPath = path.join("artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    const moduleDependencyContractPath = path.join("node_modules", contractNameParts[0] || '', contractNameParts[1] || '', "artifacts", "contracts", contractNameParts.slice(2, contractNameParts.length - 1).join('/'), `${contractNameParts[contractNameParts.length - 1]}.sol`, `${contractNameParts[contractNameParts.length - 1]}.json`);
    const isDependency = !fs.existsSync(moduleContractPath)
    const modulePath = isDependency ? moduleDependencyContractPath : moduleContractPath;
    const expression = `(await import('../${modulePath}'))`;
    return expression + '.abi';
  }

  const ensEntries = [
    [ configuration.ens, '@ensdomains/ens-contracts/registry/ENS' ],
    [ 'resolver', '@ensdomains/ens-contracts/resolvers/PublicResolver' ],
    [ 'addr.reverse', '@ensdomains/ens-contracts/registry/ReverseRegistrar']
  ];
  const namespacesEntries = !manifest.namespaces ? [] :
    Object.entries(manifest.namespaces).map(([key, value]) => {
      if (value.type && value.type === 'FIFSRegistrar') {
        return [ `registrar.${key}`, '@ensdomains/ens-contracts/registry/FIFSRegistrar' ]
      } else {
        return null
      }
    }).filter((entry) => entry !== null);

  const deployedEntries = Object.entries(manifest.deploy).map(([key, value]) => [`${key}.${manifest.name}`, value.source]);
  const allEntries = [...ensEntries, ...namespacesEntries, ...deployedEntries];
  const importStatements = allEntries
    .map(
      ([address, contractName]) => `contracts['${address}'] = ${getContractAbiExpression(contractName)};`
    )
    .join('\n');

  return `${contractsDeclaration}\n${importStatements}\n${source}`;
};
