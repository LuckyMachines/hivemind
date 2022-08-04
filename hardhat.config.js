require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

// WARNING: these are local hardhat test accounts, do not store any
// actual private keys in this file

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
  solidity: "0.8.9"
};
