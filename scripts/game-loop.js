// `npx hardhat run scripts/game-loop.js --network hh
const hre = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
function pause(timeInSeconds) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, timeInSeconds * 1000)
  );
}

async function main() {
  const gameID = 1;
  const GameRound = await hre.ethers.getContractFactory("GameRound");
  const round1 = GameRound.attach(deployedContracts.round1);
  const round2 = GameRound.attach(deployedContracts.round2);
  const round3 = GameRound.attach(deployedContracts.round3);
  const round4 = GameRound.attach(deployedContracts.round4);
  console.log("Running game loop for game ID:", gameID);
  let needsUpdate = await round1.needsUpdate(gameID);
  console.log("Needs update:", needsUpdate);
  while (true) {
    if (needsUpdate) {
      console.log("Updating Round 1");
      await round1.updatePhase(gameID);
    }
    needsUpdate = await round2.needsUpdate(gameID);
    if (needsUpdate) {
      console.log("Updating Round 2");
      await round2.updatePhase(gameID);
    }
    needsUpdate = await round3.needsUpdate(gameID);
    if (needsUpdate) {
      console.log("Updating Round 3");
      await round1.updatePhase(gameID);
    }
    needsUpdate = await round4.needsUpdate(gameID);
    if (needsUpdate) {
      console.log("Updating Round 4");
      await round4.updatePhase(gameID);
    }
    await pause(5);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
