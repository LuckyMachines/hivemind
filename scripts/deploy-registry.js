// `npx hardhat run scripts/deploy-hivemind-registry.js`
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const settings = require("../hivemind-settings.json");
const adminAddress = settings.adminAddress; // using hardhat account 0

async function main() {
  //
  // Deploy internal hub registry contracts
  //

  console.log("Deploying Valid Characters...");
  const ValidCharacters = await ethers.getContractFactory("ValidCharacters");
  const vc = await ValidCharacters.deploy();
  await vc.deployed();
  console.log("Valid Characters deployed to:", vc.address);

  console.log("Deploying Hub Registry...");
  const HubRegistry = await ethers.getContractFactory("HubRegistry");

  const hubRegistry = await upgrades.deployProxy(HubRegistry, [
    adminAddress,
    vc.address
  ]);
  await hubRegistry.deployed();
  console.log("Hub Registry deployed to:", hubRegistry.address);

  console.log("Deployments complete.");

  let deployedContractsJSON = {
    hubRegistry: hubRegistry.address
  };
  //console.log(json);

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
