// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
const fs = require("fs");
const settings = require("../hivemind-settings.json");
const adminAddress = settings.adminAddress; // using hardhat account 0

async function main() {
  const Winners = await ethers.getContractFactory("Winners");
  const GameRound = await ethers.getContractFactory("GameRound");
  const Lobby = await ethers.getContractFactory("Lobby");
  const GameController = await ethers.getContractFactory("GameController");
  const HivemindKeeper = await ethers.getContractFactory("HivemindKeeper");

  console.log("Deploying Lobby...");
  const lobby = await Lobby.deploy(
    "hivemind.lobby",
    deployedContracts.scoreKeeper,
    deployedContracts.railYard,
    "hivemind.round1",
    deployedContracts.hubRegistry,
    adminAddress
  );
  await lobby.deployed();

  console.log("Deploying Game Controller...");
  const gameController = await GameController.deploy(
    lobby.address,
    deployedContracts.scoreKeeper,
    deployedContracts.railYard,
    deployedContracts.hubRegistry
  );
  await gameController.deployed();

  console.log("Deploying Round 1...");
  const round1 = await GameRound.deploy(
    "hivemind.round1",
    "hivemind.round2",
    deployedContracts.questionPack1,
    deployedContracts.scoreKeeper,
    gameController.address,
    deployedContracts.railYard,
    deployedContracts.hubRegistry,
    adminAddress,
    settings.vrfCoordinator,
    settings.vrfKeyHash,
    settings.vrfSubscriptionID
  );
  await round1.deployed();

  console.log("Deploying Round 2...");
  const round2 = await GameRound.deploy(
    "hivemind.round2",
    "hivemind.round3",
    deployedContracts.questionPack2,
    deployedContracts.scoreKeeper,
    gameController.address,
    deployedContracts.railYard,
    deployedContracts.hubRegistry,
    adminAddress,
    settings.vrfCoordinator,
    settings.vrfKeyHash,
    settings.vrfSubscriptionID
  );
  await round2.deployed();

  console.log("Deploying Round 3...");
  const round3 = await GameRound.deploy(
    "hivemind.round3",
    "hivemind.round4",
    deployedContracts.questionPack3,
    deployedContracts.scoreKeeper,
    gameController.address,
    deployedContracts.railYard,
    deployedContracts.hubRegistry,
    adminAddress,
    settings.vrfCoordinator,
    settings.vrfKeyHash,
    settings.vrfSubscriptionID
  );
  await round3.deployed();

  console.log("Deploying Round 4...");
  const round4 = await GameRound.deploy(
    "hivemind.round4",
    "hivemind.winners",
    deployedContracts.questionPack4,
    deployedContracts.scoreKeeper,
    gameController.address,
    deployedContracts.railYard,
    deployedContracts.hubRegistry,
    adminAddress,
    settings.vrfCoordinator,
    settings.vrfKeyHash,
    settings.vrfSubscriptionID
  );
  await round4.deployed();

  console.log("Deploying Winners...");
  const winners = await Winners.deploy(
    "hivemind.winners",
    deployedContracts.scoreKeeper,
    gameController.address,
    deployedContracts.hubRegistry,
    adminAddress
  );

  console.log("Deploying Hivemind Keeper...");

  const hivemindKeeper = await HivemindKeeper.deploy(
    lobby.address,
    round1.address,
    round2.address,
    round3.address,
    round4.address,
    winners.address
  );
  await hivemindKeeper.deployed();

  let deployedContractsJSON = {
    hubRegistry: deployedContracts.hubRegistry,
    railYard: deployedContracts.railYard,
    gameController: gameController.address,
    scoreKeeper: deployedContracts.scoreKeeper,
    hivemindKeeper: hivemindKeeper.address,
    lobby: lobby.address,
    round1: round1.address,
    round2: round2.address,
    round3: round3.address,
    round4: round4.address,
    winners: winners.address,
    questionPack1: deployedContracts.questionPack1,
    questionPack2: deployedContracts.questionPack2,
    questionPack3: deployedContracts.questionPack3,
    questionPack4: deployedContracts.questionPack4
  };

  try {
    fs.writeFileSync(
      `${process.cwd()}/deployed-contracts.json`,
      JSON.stringify(deployedContractsJSON, null, 4)
    );
  } catch (err) {
    console.log(
      `unable to save deployed-contracts.json to ${path}. Error: ${err.message}`
    );
  }
  console.log("Deployed contract addresses saved to deployed-contracts.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
