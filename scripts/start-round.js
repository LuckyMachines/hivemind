// To run:
// node scripts/start-round GAME_ID ROUND_#
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const deployedContracts = require("../deployed-contracts.json");
const Lobby = require("../artifacts/contracts/Lobby.sol/Lobby.json");
const GameRound = require("../artifacts/contracts/GameRound.sol/GameRound.json");
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
  const PROVIDER_URL = process.env.SEPOLIA_RPC_URL;
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

  const gameID = process.argv[2];
  const roundNumber = Number(process.argv[3]);

  let provider = await new Web3(wallet);
  let accounts = await provider.eth.getAccounts();
  let lobby = new provider.eth.Contract(Lobby.abi, deployedContracts.lobby);
  let round1 = new provider.eth.Contract(
    GameRound.abi,
    deployedContracts.round1
  );
  let round2 = new provider.eth.Contract(
    GameRound.abi,
    deployedContracts.round2
  );
  let round3 = new provider.eth.Contract(
    GameRound.abi,
    deployedContracts.round3
  );
  let round4 = new provider.eth.Contract(
    GameRound.abi,
    deployedContracts.round4
  );

  let round;
  switch (roundNumber) {
    case 1:
      round = round1;
      break;
    case 2:
      round = round2;
      break;
    case 3:
      round = round3;
      break;
    case 4:
      round = round4;
      break;
    default:
      round = round1;
      break;
  }

  try {
    console.log("Starting game round...");
    let questionSeed = "0";
    while (questionSeed == "0") {
      questionSeed = await round.methods.questionSeed(gameID).call();
      if (questionSeed == "0") {
        console.log("No seed. Pausing...");
        await pause(10);
      } else {
        console.log("Question seed:", questionSeed);
      }
    }
    const start = await round.methods.startNewRound(gameID).send({
      from: accounts[0],
      gasLimit: "1000000"
    });
    console.log("Started game round. Gas used:", start.gasUsed);
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
