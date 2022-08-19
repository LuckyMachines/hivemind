// `npx hardhat run scripts/connect-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
const settings = require("../hivemind-settings.json");
const adminAddress = settings.adminAddress;

async function main() {
  const QUEUE_TYPE_ROUND_1 = 1;
  const QUEUE_TYPE_ROUND_2 = 2;
  const QUEUE_TYPE_ROUND_3 = 3;
  const QUEUE_TYPE_ROUND_4 = 4;

  const Lobby = await ethers.getContractFactory("Lobby");
  const lobby = Lobby.attach(deployedContracts.lobby);

  const GameController = await ethers.getContractFactory("GameController");
  const gameController = GameController.attach(
    deployedContracts.gameController
  );

  const HivemindKeeper = await ethers.getContractFactory("HivemindKeeper");
  const hivemindKeeper = HivemindKeeper.attach(
    deployedContracts.hivemindKeeper
  );

  const Questions = await ethers.getContractFactory("Questions");
  const qp1 = Questions.attach(deployedContracts.questionPack1);
  const qp2 = Questions.attach(deployedContracts.questionPack2);
  const qp3 = Questions.attach(deployedContracts.questionPack3);
  const qp4 = Questions.attach(deployedContracts.questionPack4);

  const GameRound = await ethers.getContractFactory("GameRound");
  const round1 = GameRound.attach(deployedContracts.round1);
  const round2 = GameRound.attach(deployedContracts.round2);
  const round3 = GameRound.attach(deployedContracts.round3);
  const round4 = GameRound.attach(deployedContracts.round4);

  const ScoreKeeper = await ethers.getContractFactory("ScoreKeeper");
  const scoreKeeper = ScoreKeeper.attach(deployedContracts.scoreKeeper);

  const Winners = await ethers.getContractFactory("Winners");
  const winners = Winners.attach(deployedContracts.winners);

  console.log("Setting game controller address on Lobby...");
  let tx;
  tx = await lobby.setGameControllerAddress(gameController.address);
  await tx.wait();

  console.log("Setting keeper address on Rounds...");
  console.log("Round 1");
  tx = await round1.setHivemindKeeper(hivemindKeeper.address);
  console.log("Round 2");
  tx = await round2.setHivemindKeeper(hivemindKeeper.address);
  console.log("Round 3");
  tx = await round3.setHivemindKeeper(hivemindKeeper.address);
  console.log("Round 4");
  tx = await round4.setHivemindKeeper(hivemindKeeper.address);

  console.log("Setting queue types on Rounds...");
  console.log("Round 1");
  tx = await round1.setQueueType(QUEUE_TYPE_ROUND_1);
  console.log("Round 2");
  tx = await round2.setQueueType(QUEUE_TYPE_ROUND_2);
  console.log("Round 3");
  tx = await round3.setQueueType(QUEUE_TYPE_ROUND_3);
  console.log("Round 4");
  tx = await round4.setQueueType(QUEUE_TYPE_ROUND_4);

  console.log("Setting game round roles...");
  console.log("QP1 => Round 1");
  tx = await qp1.grantGameRoundRole(round1.address);
  await tx.wait();
  console.log("QP2 => Round 2");
  tx = await qp2.grantGameRoundRole(round2.address);
  await tx.wait();
  console.log("QP3 => Round 3");
  tx = await qp3.grantGameRoundRole(round3.address);
  await tx.wait();
  console.log("QP4 => Round 4");
  tx = await qp4.grantGameRoundRole(round4.address);
  await tx.wait();

  console.log("Authorizing score keepers...");
  console.log("Lobby");
  tx = await scoreKeeper.grantScoreSetterRole(lobby.address);
  await tx.wait();
  console.log("Round 1");
  tx = await scoreKeeper.grantScoreSetterRole(round1.address);
  await tx.wait();
  console.log("Round 2");
  tx = await scoreKeeper.grantScoreSetterRole(round2.address);
  await tx.wait();
  console.log("Round 3");
  tx = await scoreKeeper.grantScoreSetterRole(round3.address);
  await tx.wait();
  console.log("Round 4");
  tx = await scoreKeeper.grantScoreSetterRole(round4.address);
  await tx.wait();
  console.log("Winners");
  tx = await scoreKeeper.grantScoreSetterRole(winners.address);
  await tx.wait();
  console.log("Game Controller");
  tx = await scoreKeeper.grantScoreSetterRole(gameController.address);
  await tx.wait();

  console.log("Adding event senders...");
  console.log("Round 1");
  tx = await gameController.addEventSender(round1.address);
  await tx.wait();
  console.log("Round 2");
  tx = await gameController.addEventSender(round2.address);
  await tx.wait();
  console.log("Round 3");
  tx = await gameController.addEventSender(round3.address);
  await tx.wait();
  console.log("Round 4");
  tx = await gameController.addEventSender(round4.address);
  await tx.wait();
  console.log("Winners");
  tx = await gameController.addEventSender(winners.address);
  await tx.wait();

  console.log("Adding Queue Roles...");
  console.log("Lobby");
  tx = await hivemindKeeper.addQueueRole(lobby.address);
  await tx.wait();
  console.log("Round 1");
  tx = await hivemindKeeper.addQueueRole(round1.address);
  await tx.wait();
  console.log("Round 2");
  tx = await hivemindKeeper.addQueueRole(round2.address);
  await tx.wait();
  console.log("Round 3");
  tx = await hivemindKeeper.addQueueRole(round3.address);
  await tx.wait();
  console.log("Round 4");
  tx = await hivemindKeeper.addQueueRole(round4.address);
  await tx.wait();
  console.log("Winners");
  tx = await hivemindKeeper.addQueueRole(winners.address);
  await tx.wait();

  console.log("Setting keeper role");
  console.log("Round 1 (Admin)");
  tx = await round1.addKeeper(adminAddress);
  await tx.wait();
  console.log("Round 1");
  tx = await round1.addKeeper(hivemindKeeper.address);
  await tx.wait();
  console.log("Round 2");
  tx = await round2.addKeeper(hivemindKeeper.address);
  await tx.wait();
  console.log("Round 3");
  tx = await round3.addKeeper(hivemindKeeper.address);
  await tx.wait();
  console.log("Round 4");
  tx = await round4.addKeeper(hivemindKeeper.address);
  await tx.wait();
  // console.log("Winners");
  // tx = await winners.addKeeper(hivemindKeeper.address);
  // await tx.wait();

  console.log("All done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
