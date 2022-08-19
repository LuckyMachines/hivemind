// To run:
// node scripts/start-game
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const deployedContracts = require("../deployed-contracts.json");
const Lobby = require("../artifacts/contracts/Lobby.sol/Lobby.json");
const fs = require("fs");
require("dotenv").config();

function pause(timeInSeconds) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, timeInSeconds * 1000)
  );
}

async function main() {
  // const PROVIDER_URL = process.env.GOERLI_RPC_URL;
  const PROVIDER_URL = process.env.MUMBAI_RPC_URL;
  console.log("Provider URL:", PROVIDER_URL);

  let keys = [];
  const keysFromFile = fs
    .readFileSync(`${process.cwd()}/.privateKeys`)
    .toString();
  keysFromFile.split(/\r?\n/).forEach((line) => {
    const privateKey = line.trim();
    keys.push(privateKey);
  });
  // console.log("Keys", keys);

  const wallet = new HDWalletProvider(keys, PROVIDER_URL);
  // console.log("Wallet:", wallet);

  let provider = await new Web3(wallet);
  let accounts = await provider.eth.getAccounts();
  let lobby = new provider.eth.Contract(Lobby.abi, deployedContracts.lobby);

  try {
    console.log("Starting game...");
    const canStart = await lobby.methods.canStart().call();
    console.log("Can start:", canStart);
    if (canStart) {
      const start = await lobby.methods.startGame().send({
        from: accounts[0],
        gasLimit: "1000000"
      });
      console.log("Started game. Gas used:", start.gasUsed);
    }
  } catch (err) {
    console.log("Error starting game:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
