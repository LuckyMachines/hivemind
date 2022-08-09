// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
const fs = require("fs");
const settings = require("../hivemind-settings.json");
//const { Console } = require("console");
const adminAddress = settings.adminAddress; // using hardhat account 0
const hubRegistry = deployedContracts.hubRegistry;
const railYard = deployedContracts.railYard;

// TODO: read in from csv files
const questions1 = [
  "This is question 1?",
  "This is question 2?",
  "This is question 3?"
];
const responses1 = [
  ["Yes", "No", "", ""],
  ["Maybe", "No way", "", ""],
  ["Okay", "Nope", "", ""]
];
const questions2 = [
  "This is question 2.1?",
  "This is question 2.2?",
  "This is question 2.3?"
];
const responses2 = [
  ["Yes", "No", "Maybe", "So"],
  ["Maybe", "No way", "Sometimes", "This is crazy"],
  ["Okay", "Nope", "Sure", "Nah"]
];
const questions3 = questions1;
const responses3 = responses1;
const questions4 = questions2;
const responses4 = responses2;

async function main() {
  //
  // Deploy Hivemind Contracts
  //
  const Questions = await ethers.getContractFactory("Questions");
  const ScoreKeeper = await ethers.getContractFactory("ScoreKeeper");
  const Lobby = await ethers.getContractFactory("Lobby");
  const GameRound = await ethers.getContractFactory("GameRound");
  const Winners = await ethers.getContractFactory("Winners");
  const GameController = await ethers.getContractFactory("GameController");

  // TODO: grantScoreSetterRole() for all rounds & lobby

  console.log("Deploying Question Pack 1...");
  const qp1 = await Questions.deploy(questions1, responses1);
  await qp1.deployed();

  console.log("Deploying Question Pack 2...");
  const qp2 = await Questions.deploy(questions2, responses2);
  await qp2.deployed();

  console.log("Deploying Question Pack 3...");
  const qp3 = await Questions.deploy(questions3, responses3);
  await qp3.deployed();

  console.log("Deploying Question Pack 4...");
  const qp4 = await Questions.deploy(questions4, responses4);
  await qp4.deployed();

  console.log("Deploying Score Keeper...");
  const scoreKeeper = await ScoreKeeper.deploy();
  await scoreKeeper.deployed();

  console.log("Deploying Lobby...");
  const lobby = await Lobby.deploy(
    "hivemind.lobby",
    scoreKeeper.address,
    railYard,
    "hivemind.round1",
    hubRegistry,
    adminAddress
  );
  await lobby.deployed();

  console.log("Deploying Game Controller...");
  const gameController = await GameController.deploy(
    lobby.address,
    scoreKeeper.address,
    hubRegistry
  );
  await gameController.deployed();

  console.log("Deploying Round 1...");
  const round1 = await GameRound.deploy(
    "hivemind.round1",
    "hivemind.round2",
    qp1.address,
    scoreKeeper.address,
    gameController.address,
    hubRegistry,
    adminAddress
  );
  await round1.deployed();

  console.log("Deploying Round 2...");
  const round2 = await GameRound.deploy(
    "hivemind.round2",
    "hivemind.round3",
    qp2.address,
    scoreKeeper.address,
    gameController.address,
    hubRegistry,
    adminAddress
  );
  await round2.deployed();

  console.log("Deploying Round 3...");
  const round3 = await GameRound.deploy(
    "hivemind.round3",
    "hivemind.round4",
    qp3.address,
    scoreKeeper.address,
    gameController.address,
    hubRegistry,
    adminAddress
  );
  await round3.deployed();

  console.log("Deploying Round 4...");
  const round4 = await GameRound.deploy(
    "hivemind.round4",
    "hivemind.round5",
    qp4.address,
    scoreKeeper.address,
    gameController.address,
    hubRegistry,
    adminAddress
  );
  await round4.deployed();

  console.log("Deploying Winners...");
  const winners = await Winners.deploy(
    "hivemind.winners",
    scoreKeeper.address,
    hubRegistry,
    adminAddress
  );
  await winners.deployed();

  let deployedContractsJSON = {
    hubRegistry: hubRegistry,
    railYard: railYard,
    gameController: gameController.address,
    scoreKeeper: scoreKeeper.address,
    lobby: lobby.address,
    round1: round1.address,
    round2: round2.address,
    round3: round3.address,
    round4: round4.address,
    winners: winners.address,
    questionPack1: qp1.address,
    questionPack2: qp2.address,
    questionPack3: qp3.address,
    questionPack4: qp4.address
  };

  try {
    await fs.writeFileSync(
      `${process.cwd()}/deployed-contracts.json`,
      JSON.stringify(deployedContractsJSON, null, 4)
    );
  } catch (err) {
    console.log(
      `unable to save deployed-contracts.json to ${path}. Error: ${err.message}`
    );
  }

  console.log("Setting game controller address on Lobby...");
  await lobby.setGameControllerAddress(gameController.address);

  console.log("Setting game round roles...");
  await qp1.grantGameRoundRole(round1.address);
  await qp2.grantGameRoundRole(round2.address);
  await qp3.grantGameRoundRole(round3.address);
  await qp4.grantGameRoundRole(round4.address);

  console.log("Authorizing score keepers...");
  await scoreKeeper.grantScoreSetterRole(lobby.address);
  await scoreKeeper.grantScoreSetterRole(round1.address);
  await scoreKeeper.grantScoreSetterRole(round2.address);
  await scoreKeeper.grantScoreSetterRole(round3.address);
  await scoreKeeper.grantScoreSetterRole(round4.address);

  console.log("Adding event senders...");
  await gameController.addEventSender(round1.address);
  await gameController.addEventSender(round2.address);
  await gameController.addEventSender(round3.address);
  await gameController.addEventSender(round4.address);
  await gameController.addEventSender(winners.address);

  const Registry = await ethers.getContractFactory("HubRegistry");
  const registry = await Registry.attach(hubRegistry);

  console.log("Getting hub IDs...");
  const lobbyID = await registry.idFromName("hivemind.lobby");
  const round1ID = await registry.idFromName("hivemind.round1");
  const round2ID = await registry.idFromName("hivemind.round2");
  const round3ID = await registry.idFromName("hivemind.round3");
  const round4ID = await registry.idFromName("hivemind.round4");
  const winnersID = await registry.idFromName("hivemind.winners");

  console.log("Opening connections to hubs...");
  await lobby.setAllowAllInputs(true);
  await round1.setInputsAllowed([lobbyID], [true]);
  await round2.setInputsAllowed([round1ID], [true]);
  await round3.setInputsAllowed([round2ID], [true]);
  await round4.setInputsAllowed([round3ID], [true]);
  await winners.setInputsAllowed([round4ID], [true]);

  console.log("Connecting hubs...");
  await lobby.addHubConnections([round1ID]);
  await round1.addHubConnections([round2ID, lobbyID]);
  await round2.addHubConnections([round3ID, lobbyID]);
  await round3.addHubConnections([round4ID, lobbyID]);
  await round4.addHubConnections([winnersID, lobbyID]);
  await winners.addHubConnections([lobbyID]);

  console.log("All done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
