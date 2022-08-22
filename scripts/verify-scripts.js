// To run:
// npx hardhat scripts/verify-scripts
const deployedContracts = require("../deployed-contracts.json");
require("dotenv").config();

const hubAdmin = process.env.MUMBAI_ADMIN;

async function main() {
  console.log("Game Controller:");
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.gameController} "${deployedContracts.lobby}" "${deployedContracts.scoreKeeper}" "${deployedContracts.railYard}" "${deployedContracts.hubRegistry}"`
  );

  console.log("\nLobby:");
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.lobby} "hivemind.lobby" "${deployedContracts.scoreKeeper}" "${deployedContracts.railYard}" "hivemind.round1" "${deployedContracts.hubRegistry}" "${hubAdmin}"`
  );

  console.log("\nGame Rounds:");
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.round1} "hivemind.round1" "hivemind.round2" "${deployedContracts.questionPack1}" "${deployedContracts.scoreKeeper}" "${deployedContracts.gameController}" "${deployedContracts.railYard}" "${deployedContracts.hubRegistry}" "${hubAdmin}" "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed" "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f" "1436"`
  );
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.round2} "hivemind.round2" "hivemind.round3" "${deployedContracts.questionPack2}" "${deployedContracts.scoreKeeper}" "${deployedContracts.gameController}" "${deployedContracts.railYard}" "${deployedContracts.hubRegistry}" "${hubAdmin}" "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed" "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f" "1436"`
  );
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.round3} "hivemind.round3" "hivemind.round4" "${deployedContracts.questionPack3}" "${deployedContracts.scoreKeeper}" "${deployedContracts.gameController}" "${deployedContracts.railYard}" "${deployedContracts.hubRegistry}" "${hubAdmin}" "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed" "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f" "1436"`
  );
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.round4} "hivemind.round4" "hivemind.winners" "${deployedContracts.questionPack4}" "${deployedContracts.scoreKeeper}" "${deployedContracts.gameController}" "${deployedContracts.railYard}" "${deployedContracts.hubRegistry}" "${hubAdmin}" "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed" "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f" "1436"`
  );

  console.log("\nHivemind Keeper:");
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.hivemindKeeper} "${deployedContracts.lobby}" "${deployedContracts.round1}" "${deployedContracts.round2}" "${deployedContracts.round3}" "${deployedContracts.round4}" "${deployedContracts.winners}"`
  );

  console.log("\nHivemind Score Keeper:");
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.scoreKeeper}`
  );

  console.log("\nWinners:");
  console.log(
    `npx hardhat verify --network mumbai ${deployedContracts.winners} "hivemind.winners" "${deployedContracts.scoreKeeper}" "${deployedContracts.gameController}" "${deployedContracts.hubRegistry}" "${hubAdmin}"`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
