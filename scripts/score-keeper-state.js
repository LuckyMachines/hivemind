// node scripts/score-keeper-stats.js railcarID
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const deployedContracts = require("../deployed-contracts.json");
const ScoreKeeper = require("../artifacts/contracts/ScoreKeeper.sol/ScoreKeeper.json");
const GameRound = require("../artifacts/contracts/GameRound.sol/GameRound.json");
const fs = require("fs");
require("dotenv").config();

let gameController;

async function main() {
  console.log(process.argv);
  const PROVIDER_URL = process.env.GOERLI_RPC_URL;
  console.log("Provider URL:", PROVIDER_URL);

  let keys = [];
  const keysFromFile = fs
    .readFileSync(`${process.cwd()}/.privateKeys`)
    .toString();
  keysFromFile.split(/\r?\n/).forEach((line) => {
    const privateKey = line.trim();
    keys.push(privateKey);
  });

  const wallet = new HDWalletProvider(keys, PROVIDER_URL);
  // console.log("Wallet:", wallet);

  let provider = await new Web3(wallet);
  let accounts = await provider.eth.getAccounts();
  let scoreKeeper = new provider.eth.Contract(
    ScoreKeeper.abi,
    deployedContracts.scoreKeeper
  );
  //console.log(gameController.methods);
  const railcarID = process.argv[2];
  let gameID;
  gameID = await scoreKeeper.methods.gameIDFromRailcar(railcarID).call();
  console.log("Game ID from scorekeeper/railcar:", gameID);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
