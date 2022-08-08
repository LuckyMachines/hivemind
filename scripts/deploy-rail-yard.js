// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
const fs = require("fs");
const settings = require("../hivemind-settings.json");
const adminAddress = settings.adminAddress; // using hardhat account 0
const hubRegistry = deployedContracts.hubRegistry;

async function main() {
  //
  // Deploy Rail Yard Contracts for group travel
  //
  const RailYard = await ethers.getContractFactory("RailYard");

  console.log("Deploying Rail Yard...");
  const railYard = await RailYard.deploy(adminAddress);
  await railYard.deployed();

  let deployedContractsJSON = {
    hubRegistry: hubRegistry,
    railYard: railYard.address
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

  console.log("All done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
