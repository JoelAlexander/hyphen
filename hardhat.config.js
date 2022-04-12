require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');

// Public address for account: 0x7c65D04C226d47fA70ba3f1913443684547AF18F
module.exports = {
  defaultNetwork: "home",
  networks: {
    home: {
      url: "https://crypto.joelalexander.me",
      chainId: 5904,
      accounts: ["0xd89a25235e8ed445265fdb7d3a878abf1c7d701f628191ac62dffa8e914f6868"],
      gasPrice: 1100000000
    }
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: false
        }
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};
