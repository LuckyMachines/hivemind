require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    hh: {
      url: "http://127.0.0.1:8545",
      accounts: [
        process.env.HARDHAT_PRIVATE_KEY_1,
        process.env.HARDHAT_PRIVATE_KEY_2,
        process.env.HARDHAT_PRIVATE_KEY_3
      ]
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
  }
};
