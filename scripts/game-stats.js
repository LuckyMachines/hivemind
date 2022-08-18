// node scripts/game-stats.js PLAYER ADDRESS
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const deployedContracts = require("../deployed-contracts.json");
const Lobby = require("../artifacts/contracts/Lobby.sol/Lobby.json");
const GameController = require("../artifacts/contracts/GameController.sol/GameController.json");
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
  let lobby = new provider.eth.Contract(Lobby.abi, deployedContracts.lobby);
  gameController = new provider.eth.Contract(
    GameController.abi,
    deployedContracts.gameController
  );
  let round1 = new provider.eth.Contract(
    GameRound.abi,
    deployedContracts.round1
  );
  //console.log(gameController.methods);
  const playerAddress = process.argv[2];
  console.log("Getting game stats for player:", playerAddress);
  let playerIsInGame;
  let gameID;
  let railcarID;
  let playerCount;
  let currentRound;
  let railcarMembers;
  try {
    playerIsInGame = await gameController.methods
      .getIsInActiveGame(playerAddress)
      .call();
  } catch (err) {
    console.log("Error - Player is in game:", err.message);
  }
  try {
    gameID = await gameController.methods.getCurrentGame(playerAddress).call();
  } catch (err) {
    console.log("Error - get current game:", err.message);
  }
  try {
    if (gameID) {
      railcarID = await gameController.methods.getRailcarID(gameID).call();
    }
  } catch (err) {
    console.log("Error - get railcar id", err.message);
  }
  try {
    if (gameID) {
      playerCount = await gameController.methods.getPlayerCount(gameID).call();
    }
  } catch (err) {
    console.log("Error - player count:", err.message);
  }
  try {
    if (gameID) {
      currentRound = await gameController.methods.getLatestRound(gameID).call();
    }
  } catch (err) {
    console.log("Error - get latest round:", err.message);
  }
  try {
    if (railcarID) {
      railcarMembers = await gameController.methods
        .getRailcarMembers(railcarID)
        .call();
    }
  } catch (err) {
    console.log("Error - get railcar members", err.message);
  }

  console.log("\nGame ID:", gameID);
  console.log("Player is in game:", playerIsInGame);
  console.log("Railcar ID:", railcarID);
  console.log("Player count:", playerCount);
  console.log("Current Round:", currentRound);
  console.log("Railcar Members:", railcarMembers);

  let railcarInLobby;
  let railcarInRound1;
  try {
    railcarInLobby = await lobby.methods.groupIsInHub(railcarID).call();
  } catch (err) {
    console.log(err.message);
  }
  try {
    railcarInRound1 = await round1.methods.groupIsInHub(railcarID).call();
  } catch (err) {
    console.log(err.message);
  }
  console.log("Railcar is in lobby:", railcarInLobby);
  console.log("Railcar is in round1 hub:", railcarInRound1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
