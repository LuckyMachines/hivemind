// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
const fs = require("fs");
const settings = require("../hivemind-settings.json");
const { Console } = require("console");
const adminAddress = settings.adminAddress; // using hardhat account 0
const hubRegistry = deployedContracts.hubRegistry;

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
  const lobby = await Lobby.deploy();
  await lobby.deployed();

  console.log("Deploying Round 1...");
  const round1 = await GameRound.deploy(
    "hivemind.round1",
    "hivemind.round2",
    qp1.address,
    scoreKeeper.address,
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

  console.log("Authorizing score keepers...");
  await scoreKeeper.grantScoreSetterRole(lobby.address);
  await scoreKeeper.grantScoreSetterRole(round1.address);
  await scoreKeeper.grantScoreSetterRole(round2.address);
  await scoreKeeper.grantScoreSetterRole(round3.address);
  await scoreKeeper.grantScoreSetterRole(round4.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
