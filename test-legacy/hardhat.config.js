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
    mumbai: {
      url: process.env.MUMBAI_RPC_URL,
      accounts: [process.env.MUMBAI_PRIVATE_KEY_1]
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: [process.env.POLYGON_PRIVATE_KEY_1]
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL,
      accounts: [process.env.GOERLI_PRIVATE_KEY_1]
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
      goerli: "QKEP4PUXN6P9ZCPYXE52R2MCKEX89GWGY8",
      polygonMumbai: "NR92TZ2YMUY1CU4NJU1D4VRHK9RTA4GVP3"
    }
  }
};
