const { assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

let accounts;
let admin;
let gameController;
let lobby;
let scoreKeeper;
let railYard;
let hubRegistry;
let vc;
let round1;
let round2;
let round3;
let round4;
let winners;

function csvToArrays(input, numColumnsToUse) {
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
  return outputArray;
}

function createWallets(numWallets) {
  let newWallets = [];
  for (let i = 0; i < numWallets; i++) {
    const newWallet = ethers.Wallet.createRandom();
    newWallets.push(newWallet);
  }
  return newWallets;
}

describe("Hivemind", function () {
  beforeEach(async function () {
    accounts = await ethers.getSigners();
    admin = accounts[0];

    // Deploy Valid Characters
    const ValidCharacters = await ethers.getContractFactory("ValidCharacters");
    vc = await ValidCharacters.deploy();
    await vc.deployed();

    // Deploy Registry
    const HubRegistry = await ethers.getContractFactory("HubRegistry");
    hubRegistry = await upgrades.deployProxy(HubRegistry, [
      admin.address,
      vc.address
    ]);
    await hubRegistry.deployed();

    // Deploy Rail Yard
    const RailYard = await ethers.getContractFactory("RailYard");
    railYard = await RailYard.deploy(admin.address);
    await railYard.deployed();

    // Deploy Score Keeper
    const ScoreKeeper = await ethers.getContractFactory("ScoreKeeper");
    scoreKeeper = await ScoreKeeper.deploy();
    await scoreKeeper.deployed();

    // Deploy Lobby
    const Lobby = await ethers.getContractFactory("Lobby");
    lobby = await Lobby.deploy(
      "hivemind.lobby",
      scoreKeeper.address,
      railYard.address,
      "hivemind.round1",
      hubRegistry.address,
      admin.address
    );
    await lobby.deployed();

    const GameController = await hre.ethers.getContractFactory(
      "GameController"
    );
    gameController = await GameController.deploy(
      lobby.address,
      scoreKeeper.address,
      railYard.address,
      hubRegistry.address
    );
    await gameController.deployed();

    // Load Questions
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

    // Deploy Questions
    const Questions = await ethers.getContractFactory("Questions");

    const qp1 = await Questions.deploy(questions1, responses1);
    await qp1.deployed();

    const qp2 = await Questions.deploy(questions2, responses2);
    await qp2.deployed();

    const qp3 = await Questions.deploy(questions3, responses3);
    await qp3.deployed();

    const qp4 = await Questions.deploy(questions4, responses4);
    await qp4.deployed();

    // Deploy Game Rounds
    const GameRound = await ethers.getContractFactory("GameRound");

    round1 = await GameRound.deploy(
      "hivemind.round1",
      "hivemind.round2",
      qp1.address,
      scoreKeeper.address,
      gameController.address,
      railYard.address,
      hubRegistry.address,
      admin.address
    );
    await round1.deployed();

    round2 = await GameRound.deploy(
      "hivemind.round2",
      "hivemind.round3",
      qp2.address,
      scoreKeeper.address,
      gameController.address,
      railYard.address,
      hubRegistry.address,
      admin.address
    );
    await round2.deployed();

    round3 = await GameRound.deploy(
      "hivemind.round3",
      "hivemind.round4",
      qp3.address,
      scoreKeeper.address,
      gameController.address,
      railYard.address,
      hubRegistry.address,
      admin.address
    );
    await round3.deployed();

    round4 = await GameRound.deploy(
      "hivemind.round4",
      "hivemind.winners",
      qp4.address,
      scoreKeeper.address,
      gameController.address,
      railYard.address,
      hubRegistry.address,
      admin.address
    );
    await round4.deployed();

    const Winners = await ethers.getContractFactory("Winners");
    winners = await Winners.deploy(
      "hivemind.winners",
      scoreKeeper.address,
      gameController.address,
      hubRegistry.address,
      admin.address
    );
    await winners.deployed();

    // console.log("Accounts:", accounts[0].address);
    // console.log("Valid Characters:", vc.address);
    // console.log("Hub Registry:", hubRegistry.address);
    // console.log("Rail Yard:", railYard.address);
    // console.log("Score Keeper:", scoreKeeper.address);
    // console.log("Lobby:", lobby.address);
    // console.log("Game Controller:", gameController.address);
    // console.log("Q1:", qp1.address);
    // console.log("Q2:", qp2.address);
    // console.log("Q3:", qp2.address);
    // console.log("Q4:", qp2.address);
    // console.log("Round 1:", round1.address);
    // console.log("Round 2:", round2.address);
    // console.log("Round 3:", round3.address);
    // console.log("Round 4:", round4.address);
    // console.log("Winners:", winners.address);

    // Setup contracts

    // Lobby: set game controller
    await lobby.setGameControllerAddress(gameController.address);

    // Question Packs: set game round role
    await qp1.grantGameRoundRole(round1.address);
    await qp2.grantGameRoundRole(round2.address);
    await qp3.grantGameRoundRole(round3.address);
    await qp4.grantGameRoundRole(round4.address);

    // Score Keeper: grant score setter role
    await scoreKeeper.grantScoreSetterRole(lobby.address);
    await scoreKeeper.grantScoreSetterRole(round1.address);
    await scoreKeeper.grantScoreSetterRole(round2.address);
    await scoreKeeper.grantScoreSetterRole(round3.address);
    await scoreKeeper.grantScoreSetterRole(round4.address);
    await scoreKeeper.grantScoreSetterRole(winners.address);
    await scoreKeeper.grantScoreSetterRole(gameController.address);

    // Game Controller: add event senders
    await gameController.addEventSender(round1.address);
    await gameController.addEventSender(round2.address);
    await gameController.addEventSender(round3.address);
    await gameController.addEventSender(round4.address);
    await gameController.addEventSender(winners.address);

    // Get Hub IDs
    const lobbyID = await hubRegistry.idFromName("hivemind.lobby");
    const round1ID = await hubRegistry.idFromName("hivemind.round1");
    const round2ID = await hubRegistry.idFromName("hivemind.round2");
    const round3ID = await hubRegistry.idFromName("hivemind.round3");
    const round4ID = await hubRegistry.idFromName("hivemind.round4");
    const winnersID = await hubRegistry.idFromName("hivemind.winners");

    // Open connections to hubs
    await lobby.setAllowAllInputs(true);
    await round1.setInputsAllowed([lobbyID], [true]);
    await round2.setInputsAllowed([round1ID], [true]);
    await round3.setInputsAllowed([round2ID], [true]);
    await round4.setInputsAllowed([round3ID], [true]);
    await winners.setInputsAllowed([round4ID], [true]);

    // Connect hubs
    await lobby.addHubConnections([round1ID]);
    await round1.addHubConnections([round2ID, lobbyID]);
    await round2.addHubConnections([round3ID, lobbyID]);
    await round3.addHubConnections([round4ID, lobbyID]);
    await round4.addHubConnections([winnersID, lobbyID]);
    await winners.addHubConnections([lobbyID]);
  });

  describe("Deployment check", function () {
    it("works with 3 players", async function () {
      let players = createWallets(3);
      console.log("Player 1:", players[0].address);
    });

    it("works with 10 players", async function () {});
  });
});
