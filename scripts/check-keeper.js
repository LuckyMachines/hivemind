// To run:
// node scripts/check-keeper
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const deployedContracts = require("../deployed-contracts.json");
const HivemindKeeper = require("../artifacts/contracts/HivemindKeeper.sol/HivemindKeeper.json");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const PROVIDER_URL = process.env.GOERLI_RPC_URL;
  // console.log("Provider URL:", PROVIDER_URL);

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

  let provider = await new Web3(wallet);
  let accounts = await provider.eth.getAccounts();
  let keeper = new provider.eth.Contract(
    HivemindKeeper.abi,
    deployedContracts.hivemindKeeper
  );

  try {
    console.log("Checking keeper...");
    let keeperUpdates = await keeper.methods.checkUpkeep(0).call();
    console.log("Keeper updates:");
    console.log(keeperUpdates);
    let kUpdates = await keeper.methods.getUpdates().call();
    console.log("Updates:", kUpdates);
    // let canUpdate = await keeper.methods
    //   .keeperCanUpdate(keeperUpdates.performData)
    //   .call();
    // console.log("Can update:", canUpdate);
    // let tx = await keeper.methods
    //   .performUpkeep(keeperUpdates.performData)
    //   .send({ from: accounts[0], gasLimit: "800000" });
    // console.log("Gas used:", tx.gasUsed);
  } catch (err) {
    console.log("Error getting keeper updates:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
