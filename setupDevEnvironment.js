const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

(async function main() {
  console.log('Setup Development Environment');

  const chainIdInput = await askQuestion('Enter ChainID: ');
  const domain = await askQuestion('Enter Domain: ');
  const port = await askQuestion('Enter Port: ');
  const ens = await askQuestion('Enter ENS: ');
  const chainId = parseInt(chainIdInput, 10);

  const config = {
    chainId,
    url: `http://${domain}:${port}`
  };

  if (ens && ens != "") {
    config.ens = ens
  }

  fs.writeFileSync('./chain-config.json', JSON.stringify(config, null, 2));
  rl.close();
  
  process.exit(0);
}());
