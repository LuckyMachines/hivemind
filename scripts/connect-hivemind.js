// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");

async function main() {
  const Lobby = await ethers.getContractFactory("Lobby");
  const lobby = Lobby.attach(deployedContracts.lobby);

  const GameController = await ethers.getContractFactory("GameController");
  const gameController = GameController.attach(
    deployedContracts.gameController
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

  const Registry = await ethers.getContractFactory("HubRegistry");
  const registry = Registry.attach(deployedContracts.hubRegistry);

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
  await scoreKeeper.grantScoreSetterRole(winners.address);
  await scoreKeeper.grantScoreSetterRole(gameController.address);

  console.log("Adding event senders...");
  await gameController.addEventSender(round1.address);
  await gameController.addEventSender(round2.address);
  await gameController.addEventSender(round3.address);
  await gameController.addEventSender(round4.address);
  await gameController.addEventSender(winners.address);

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
