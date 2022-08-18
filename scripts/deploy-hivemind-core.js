// `npx hardhat run scripts/deploy-hivemind.js`
const { ethers } = require("hardhat");
const deployedContracts = require("../deployed-contracts.json");
const fs = require("fs");
const settings = require("../hivemind-settings.json");
const adminAddress = settings.adminAddress; // using hardhat account 0
const hubRegistry = deployedContracts.hubRegistry;
const railYard = deployedContracts.railYard;

const csvToArrays = (input, numColumnsToUse) => {
  // Setup output array with correct number of sub-arrays
  let outputArray = [];
  for (let i = 0; i < numColumnsToUse; i++) {
    outputArray.push([]);
  }
  // load csv into arrays
  if (input) {
    const data = fs.readFileSync(input, "utf8");
    let rows = data.split(/\r?\n/);
    // console.log("Rows:", rows);
    try {
      rows.forEach((inputRow) => {
        if (inputRow != "") {
          const rowItems = inputRow.split(",");
          // add all columns to arrays
          for (let i = 0; i < rowItems.length; i++) {
            outputArray[i].push(rowItems[i]);
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  // outputArray = [[column 1 items],[column 2 items],[column 3 items],[column n items]]
  return outputArray;
};

const questions1FromArray = csvToArrays(
  `${process.cwd()}/questions/fav4.csv`,
  5
);
const questions1 = questions1FromArray[0];
const responses1 = [];
for (let i = 0; i < questions1.length; i++) {
  responses1.push(["", "", "", ""]);
  responses1[i][0] = questions1FromArray[1][i];
  responses1[i][1] = questions1FromArray[2][i];
  responses1[i][2] = questions1FromArray[3][i];
  responses1[i][3] = questions1FromArray[4][i];
}
// console.log("Questions 1:", questions1);
// console.log("Responses 1:", responses1);

const questions2FromArray = csvToArrays(
  `${process.cwd()}/questions/thisThat.csv`,
  3
);
const questions2 = questions2FromArray[0];
const responses2 = [];
for (let i = 0; i < questions2.length; i++) {
  responses2.push(["", "", "", ""]);
  responses2[i][0] = questions2FromArray[1][i];
  responses2[i][1] = questions2FromArray[2][i];
}
// console.log("Questions 2:", questions2);
// console.log("Responses 2:", responses2);

const questions3FromArray = csvToArrays(
  `${process.cwd()}/questions/finishPhrase.csv`,
  5
);
const questions3 = questions3FromArray[0];
const responses3 = [];
for (let i = 0; i < questions3.length; i++) {
  responses3.push(["", "", "", ""]);
  responses3[i][0] = questions3FromArray[1][i];
  responses3[i][1] = questions3FromArray[2][i];
  responses3[i][2] = questions3FromArray[3][i];
  responses3[i][3] = questions3FromArray[4][i];
}
// console.log("Questions 3", questions3);
// console.log("Responses 3", responses3);

const questions4FromArray = csvToArrays(
  `${process.cwd()}/questions/combo.csv`,
  5
);
const questions4 = questions4FromArray[0];
const responses4 = [];
for (let i = 0; i < questions4.length; i++) {
  responses4.push(["", "", "", ""]);
  responses4[i][0] = questions4FromArray[1][i];
  responses4[i][1] = questions4FromArray[2][i];
  responses4[i][2] = questions4FromArray[3][i];
  responses4[i][3] = questions4FromArray[4][i];
}
// console.log("Questions 4", questions4);
// console.log("Responses 4", responses4);

async function main() {
  //
  // Deploy Hivemind Contracts
  //
  const Questions = await ethers.getContractFactory("Questions");
  const ScoreKeeper = await ethers.getContractFactory("ScoreKeeper");

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

  let deployedContractsJSON = {
    hubRegistry: hubRegistry,
    railYard: railYard,
    scoreKeeper: scoreKeeper.address,
    questionPack1: qp1.address,
    questionPack2: qp2.address,
    questionPack3: qp3.address,
    questionPack4: qp4.address
  };

  try {
    fs.writeFileSync(
      `${process.cwd()}/deployed-contracts.json`,
      JSON.stringify(deployedContractsJSON, null, 4)
    );
  } catch (err) {
    console.log(
      `unable to save deployed-contracts.json to ${path}. Error: ${err.message}`
    );
  }
  console.log("Deployed contract addresses saved to deployed-contracts.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
