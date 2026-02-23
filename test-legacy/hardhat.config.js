require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    hh: {
      url: process.env.HARDHAT_RPC_URL,
      accounts: [
        process.env.HARDHAT_PRIVATE_KEY_1,
        process.env.HARDHAT_PRIVATE_KEY_2,
        process.env.HARDHAT_PRIVATE_KEY_3
      ]
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY_1]
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.MAINNET_PRIVATE_KEY_1]
    }
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY
    }
  }
};
