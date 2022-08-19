const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const fs = require("fs");
const settings = require("../settings");
require("dotenv").config();

const PROVIDER_URL = process.env.MUMBAI_RPC_URL;
// const PROVIDER_URL = process.env.GOERLI_RPC_URL;

const provider = async (privateKeys, providerUrl) => {
  let keys = [];
  const keysFromFile = fs
    .readFileSync(`${process.cwd()}/.privateKeys`)
    .toString();
  keysFromFile.split(/\r?\n/).forEach((line) => {
    const privateKey = line.trim();
    keys.push(privateKey);
  });
  if (privateKeys) {
    privateKeys.forEach((key) => {
      keys.push(key);
    });
  }

  let wallet = new HDWalletProvider({
    privateKeys: keys,
    providerOrUrl: providerUrl ? providerUrl : PROVIDER_URL
  });
  let provider = await new Web3(wallet);
  provider;
  return provider;
};

module.exports = { provider };
