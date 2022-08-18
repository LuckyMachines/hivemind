// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");

async function main() {
  const Lobby = await ethers.getContractFactory("Lobby");
  const lobby = Lobby.attach(deployedContracts.lobby);

  const GameRound = await ethers.getContractFactory("GameRound");
  const round1 = GameRound.attach(deployedContracts.round1);
  const round2 = GameRound.attach(deployedContracts.round2);
  const round3 = GameRound.attach(deployedContracts.round3);
  const round4 = GameRound.attach(deployedContracts.round4);

  const Winners = await ethers.getContractFactory("Winners");
  const winners = Winners.attach(deployedContracts.winners);

  const Registry = await ethers.getContractFactory("HubRegistry");
  const registry = Registry.attach(deployedContracts.hubRegistry);

  console.log("Getting hub IDs...");
  const lobbyID = await registry.idFromName("hivemind.lobby");
  const round1ID = await registry.idFromName("hivemind.round1");
  const round2ID = await registry.idFromName("hivemind.round2");
  const round3ID = await registry.idFromName("hivemind.round3");
  const round4ID = await registry.idFromName("hivemind.round4");
  const winnersID = await registry.idFromName("hivemind.winners");

  console.log("Opening connections to hubs...");
  let tx;
  tx = await lobby.setAllowAllInputs(true);
  await tx.wait();
  tx = await round1.setInputsAllowed([lobbyID], [true]);
  await tx.wait();
  tx = await round2.setInputsAllowed([round1ID], [true]);
  await tx.wait();
  tx = await round3.setInputsAllowed([round2ID], [true]);
  await tx.wait();
  tx = await round4.setInputsAllowed([round3ID], [true]);
  await tx.wait();
  tx = await winners.setInputsAllowed([round4ID], [true]);
  await tx.wait();

  console.log("Connecting hubs...");
  console.log("Lobby...");
  tx = await lobby.addHubConnections([round1ID]);
  await tx.wait();
  console.log("Round 1...");
  tx = await round1.addHubConnections([round2ID, lobbyID]);
  await tx.wait();
  console.log("Round 2...");
  tx = await round2.addHubConnections([round3ID, lobbyID]);
  await tx.wait();
  console.log("Round 3...");
  tx = await round3.addHubConnections([round4ID, lobbyID]);
  await tx.wait();
  console.log("Round 4...");
  tx = await round4.addHubConnections([winnersID, lobbyID]);
  await tx.wait();
  console.log("Winners...");
  tx = await winners.addHubConnections([lobbyID]);
  await tx.wait();

  console.log("All done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
