import React, { Component } from "react";
import { Grid } from "semantic-ui-react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import Title from "../components/Title";
import SecretPhrase from "../components/SecretPhrase";
import Lobby from "../components/Lobby";
import Score from "../components/Score";
import Winners from "../components/Winners";
import Addresses from "../contracts/deployed-contracts.json";
import GameController from "../contracts/GameController.json";
import GameRound from "../contracts/GameRound.json";
// import { ethers } from "ethers";

const settings = require("../settings");

let gc2;

function pause(timeInSeconds) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, timeInSeconds * 1000)
  );
}

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connectedWallet: "",
      provider: "",
      gameController: "",
      accounts: [],
      secretPhrase: "",
      showSecretPhrase: false,
      showRound1: false,
      showRound2: false,
      showRound3: false,
      showRound4: false,
      showWinners: false,
      showLobby: true,
      showScoreRound2: false,
      showScoreRound3: false,
      showScoreRound4: false,
      showScoreWinners: false,
      currentHub: "hivemind.lobby",
      gameID: "(Not in game)",
      playersInGame: "(Not in game)",
      playerScore: "0",
      playerRank: "?",
      round1Question: "",
      round1Responses: [],
      round2Question: "",
      round2Responses: [],
      round3Question: "",
      round3Responses: [],
      round4Question: "",
      round4Responses: [],
      round1PlayerChoice: "",
      round2PlayerChoice: "",
      round3PlayerChoice: "",
      round4PlayerChoice: "",
      round1CrowdChoice: "",
      round2CrowdChoice: "",
      round3CrowdChoice: "",
      round4CrowdChoice: "",
      round1Button: "Submit Answers",
      round2Button: "Submit Answers",
      round3Button: "Submit Answers",
      round4Button: "Submit Answers",
      round1InputLocked: false,
      round2InputLocked: false,
      round3InputLocked: false,
      round4InputLocked: false,
      lobbyButton: "Join Game",
      round1SubmittedGuess: "",
      round2SubmittedGuess: "",
      round3SubmittedGuess: "",
      round4SubmittedGuess: "",
      round1ResponseScores: ["-", "-", "-", "-"],
      round2ResponseScores: ["-", "-", "-", "-"],
      round3ResponseScores: ["-", "-", "-", "-"],
      round4ResponseScores: ["-", "-", "-", "-"],
      round1WinningIndex: [],
      round2WinningIndex: [],
      round3WinningIndex: [],
      round4WinningIndex: [],
      round1IsMinority: false,
      round2IsMinority: false,
      round3IsMinority: false,
      round4IsMinority: false,
      title: "Lobby"
    };
  }

  async componentDidMount() {
    this._isMounted = true;
    this.FX_ROUND_1 = new Audio("sfx/round1.m4a");
    this.FX_ROUND_2 = new Audio("sfx/round2.m4a");
    this.FX_ROUND_3 = new Audio("sfx/round3.m4a");
    this.FX_ROUND_4 = new Audio("sfx/round4.m4a");
    this.FX_GAME_FINISH = new Audio("sfx/gameFinish.m4a");
    this.FX_ROUND_1.load();
    this.FX_ROUND_2.load();
    this.FX_ROUND_3.load();
    this.FX_ROUND_4.load();
    this.FX_GAME_FINISH.load();
    window.hivemind = this;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadGameController(p) {
    const gameController = new p.eth.Contract(
      GameController.abi,
      Addresses.gameController
    );
    this.setState({ gameController: gameController });

    /*
    Event subscription option 1: good locally, not on testnets
    // const url = process.env.MUMBAI_RPC_URL;
    const url = process.env.GOERLI_RPC_URL;
    let p2 = new ethers.providers.JsonRpcProvider(url);
    gc2 = new ethers.Contract(Addresses.gameController, GameController.abi, p2);
    console.log("Subscribing to events...");
    console.log("GC2:", gc2);
    gc2.on("RoundStart", (hubAlias, startTime, gameID, groupID) => {
      this.roundStarted(hubAlias, gameID, groupID, startTime);
    });
    gc2.on("RevealStart", (hubAlias, startTime, gameID, groupID) => {
      this.revealStarted(hubAlias, gameID, groupID, startTime);
    });
    gc2.on("RoundEnd", (hubAlias, startTime, gameID, groupID) => {
      this.roundEnded(hubAlias, gameID, groupID, startTime);
    });
    gc2.on("EnterWinners", (startTime, gameID, groupID) => {
      this.enterWinners(gameID, groupID, startTime);
    });
    */
    /*
    Event subscription option 2
    let options = {
      fromBlock: 0,
      address: [
        Addresses.round1,
        Addresses.round2,
        Addresses.round3,
        Addresses.round4,
        Addresses.winners
      ], //Only get events from specific addresses
      topics: [settings.roundStartSubscriptionTopic] //What topics to subscribe to
    };

    let subscription = p.eth.subscribe("logs", options, (err, event) => {
      //if (!err) console.log(event);
    });
    subscription.on("data", (event) => console.log(event));
    */
  }

  async loadAccounts(p) {
    const accounts = await p.eth.getAccounts();
    this.setState({ accounts: accounts });
  }

  setProvider = (p) => {
    this.setState({ provider: p });
    this.loadGameController(p);
    this.loadAccounts(p);
  };

  setAccounts = (a) => {
    this.setState({ accounts: a });
  };

  setGameID = async (id) => {
    this.setState({ gameID: id });
    let options = {
      filter: {
        gameID: [id]
      },
      fromBlock: 0
    };
    try {
      let currentRound = await this.state.gameController.methods
        .getLatestRound(id)
        .call();
      await this.showHub(currentRound);
    } catch (err) {
      {
        console.log("Error loading railcar:", err.message);
      }
    }
    this.state.provider.eth.clearSubscriptions();

    this.state.gameController.events
      .RoundStart(options)
      .on("data", (event) =>
        this.roundStarted(
          event.returnValues.hubAlias,
          event.returnValues.gameID,
          event.returnValues.groupID,
          event.returnValues.startTime
        )
      );

    this.state.gameController.events
      .RevealStart(options)
      .on("data", (event) =>
        this.revealStarted(
          event.returnValues.hubAlias,
          event.returnValues.gameID,
          event.returnValues.groupID,
          event.returnValues.startTime
        )
      );

    this.state.gameController.events
      .RoundEnd(options)
      .on("data", (event) =>
        this.roundEnded(
          event.returnValues.hubAlias,
          event.returnValues.gameID,
          event.returnValues.groupID,
          event.returnValues.startTime
        )
      );

    this.state.gameController.events
      .EnterWinners(options)
      .on("data", (event) =>
        this.enterWinners(
          event.returnValues.startTime,
          event.returnValues.gameID,
          event.returnValues.groupID
        )
      );
    // subscribe to events now that we have a game ID
    /*
    // Event option 3: listening to past events, not good for real time updates
    let options = {
      filter: {
        gameID: [id]
      },
      fromBlock: 0, //Number || "earliest" || "pending" || "latest"
      toBlock: "latest"
    };
    
    this.state.gameController
      .getPastEvents("RoundStart", options)
      .then((results) =>
        this.roundStarted(
          results[0].returnValues.hubAlias,
          results[0].returnValues.gameID,
          results[0].returnValues.groupID,
          results[0].returnValues.startTime
        )
      )
      .catch((err) => {});

    this.state.gameController
      .getPastEvents("RevealStart", options)
      .then((results) =>
        this.revealStarted(
          results[0].returnValues.hubAlias,
          results[0].returnValues.gameID,
          results[0].returnValues.groupID,
          results[0].returnValues.startTime
        )
      )
      .catch((err) => {
        console.log(err.message);
      });

    this.state.gameController
      .getPastEvents("RoundEnd", options)
      .then((results) =>
        this.roundEnded(
          results[0].returnValues.hubAlias,
          results[0].returnValues.gameID,
          results[0].returnValues.groupID,
          results[0].returnValues.startTime
        )
      )
      .catch((err) => {});

    this.state.gameController
      .getPastEvents("EnterWinners", options)
      .then((results) =>
        this.enterWinners(
          results[0].returnValues.startTime,
          results[0].returnValues.gameID,
          results[0].returnValues.groupID
        )
      )
      .catch((err) => {});
      */
  };

  setPlayersInGame = (numPlayers) => {
    this.setState({ playersInGame: numPlayers });
  };

  setLobbyButton = (buttonText) => {
    this.setState({ lobbyButton: buttonText });
  };

  setConnectedWallet = (w) => {
    this.setState({ connectedWallet: w });
  };

  setSecretPhrase = (phrase) => {
    this.setState({ secretPhrase: phrase });
  };

  setPlayerChoice = (choice) => {
    switch (this.state.currentHub) {
      case "hivemind.round1":
        this.setState({ round1PlayerChoice: choice });
        break;
      case "hivemind.round2":
        this.setState({ round2PlayerChoice: choice });
        break;
      case "hivemind.round3":
        this.setState({ round3PlayerChoice: choice });
        break;
      case "hivemind.round4":
        this.setState({ round4PlayerChoice: choice });
        break;
      default:
        break;
    }
  };

  setCrowdChoice = (choice) => {
    switch (this.state.currentHub) {
      case "hivemind.round1":
        this.setState({ round1CrowdChoice: choice });
        break;
      case "hivemind.round2":
        this.setState({ round2CrowdChoice: choice });
        break;
      case "hivemind.round3":
        this.setState({ round3CrowdChoice: choice });
        break;
      case "hivemind.round4":
        this.setState({ round4CrowdChoice: choice });
        break;
      default:
        break;
    }
  };

  roundStarted = async (hubAlias, gameID, groupID, startTime) => {
    console.log("Round started:", hubAlias);
    console.log("Game ID", gameID);
    if (
      gameID == this.state.gameID &&
      this.hubIsNew(this.state.currentHub, hubAlias)
    ) {
      console.log("Move to hub:", hubAlias);
      // load questions / responses from specified hub
      this.showHub(hubAlias);
    }
  };

  revealStarted = (hubAlias, gameID, groupID, startTime) => {
    // console.log(
    //   `Reveal event: ${hubAlias}, ${gameID}, ${groupID}, ${startTime}`
    // );
    if (gameID == this.state.gameID) {
      console.log(
        `Reveal Start: ${hubAlias}, ${startTime}, ${gameID}, ${groupID}`
      );
      switch (this.state.currentHub) {
        case "hivemind.round1":
          this.setState({
            round1Button: "Reveal Answers"
          });
          break;
        case "hivemind.round2":
          this.setState({
            round2Button: "Reveal Answers"
          });
          break;
        case "hivemind.round3":
          this.setState({
            round3Button: "Reveal Answers"
          });
          break;
        case "hivemind.round4":
          this.setState({
            round4Button: "Reveal Answers"
          });
          break;
        case "hivemind.lobby":
          switch (hubAlias) {
            case "hivemind.round1":
              this.setState({
                round1Button: "Reveal Answers",
                round1InputLocked: false
              });
              break;
            case "hivemind.round2":
              this.setState({
                round2Button: "Reveal Answers",
                round2InputLocked: false
              });
              break;
            case "hivemind.round3":
              this.setState({
                round3Button: "Reveal Answers",
                round3InputLocked: false
              });
              break;
            case "hivemind.round4":
              this.setState({
                round4Button: "Reveal Answers",
                round4InputLocked: false
              });
              break;
            default:
              break;
          }
          if (this.state.currentHub != hubAlias) {
            this.showHub(hubAlias);
          }
        default:
          break;
      }
    }
  };

  roundEnded = (hubAlias, gameID, groupID, startTime) => {
    if (gameID == this.state.gameID) {
      console.log(
        `Round End: ${hubAlias}, ${startTime}, ${gameID}, ${groupID}`
      );
    }
  };

  enterWinners = (gameID, groupID, startTime) => {
    console.log(`Enter winners: ${gameID}, ${groupID}, ${startTime}`);
    this.showHub("hivemind.winners");
  };

  loadQuestions = async (hubAlias) => {
    const gc = this.state.gameController;
    let question = "";
    let choices = [];
    console.log("Loading question...");
    while (question == "") {
      const gcQuestion = await gc.methods
        .getQuestion(hubAlias, this.state.gameID)
        .call();
      question = gcQuestion.q;
      choices = gcQuestion.choices;

      // if question didn't load...
      if (question == "") {
        await pause(1);
      }
    }

    let isMinority = false;
    try {
      isMinority = await gc.methods
        .getIsMinorityRound(hubAlias, this.state.gameID)
        .call();
    } catch (err) {
      console.log("Error fetching minority mode:", err.message);
    }

    switch (hubAlias) {
      case "hivemind.round1":
        this.setState({
          round1Question: question,
          round1Responses: choices,
          round1IsMinority: isMinority
        });
        break;
      case "hivemind.round2":
        this.setState({
          round2Question: question,
          round2Responses: choices,
          round2IsMinority: isMinority
        });
        break;
      case "hivemind.round3":
        this.setState({
          round3Question: question,
          round3Responses: choices,
          round3IsMinority: isMinority
        });
        break;
      case "hivemind.round4":
        this.setState({
          round4Question: question,
          round4Responses: choices,
          round4IsMinority: isMinority
        });
        break;
      default:
        break;
    }
  };

  updatePlayerScore = async (hubAlias) => {
    const gc = this.state.gameController;
    console.log("Updating player score...");
    if (hubAlias != "hivemind.round1" && this.state.gameID != "(Not in game)") {
      let previousHub;
      switch (hubAlias) {
        case "hivemind.round2":
          previousHub = "hivemind.round1";
          break;
        case "hivemind.round3":
          previousHub = "hivemind.round2";
          break;
        case "hivemind.round4":
          previousHub = "hivemind.round3";
          break;
        case "hivemind.winners":
          previousHub = "hivemind.round4";
          break;
        default:
          break;
      }
      // if round 1, nothing to load
      let guess = "";
      let responseScores = "";
      let winningIndex = "";
      let score = "";
      const totalPlayers = await gc.methods
        .getPlayerCount(this.state.gameID)
        .call();

      console.log("Loading round results...");

      while (responseScores == "") {
        try {
          responseScores = await gc.methods
            .getResponseScores(previousHub, this.state.gameID)
            .call();
          // console.log("Response scores:", responseScores);
          if (responseScores != "") {
            if (
              Number(responseScores[0]) +
                Number(responseScores[1]) +
                Number(responseScores[2]) +
                Number(responseScores[3]) <
              Number(totalPlayers)
            ) {
              responseScores = "";
            }
          }
        } catch (err) {
          console.log(err.message);
        }
        if (!responseScores) {
          await pause(5);
        }
      }

      while (score == "") {
        try {
          score = await gc.methods
            .getScore(this.state.gameID, this.state.accounts[0])
            .call();
        } catch (err) {
          console.log(err.message);
        }
        if (score == "") {
          await pause(5);
        }
      }
      score = await gc.methods
        .getScore(this.state.gameID, this.state.accounts[0])
        .call();

      this.setState({ playerScore: score });

      while (winningIndex == "") {
        try {
          winningIndex = await gc.methods
            .getWinningIndex(previousHub, this.state.gameID)
            .call();
        } catch (err) {
          console.log(err.message);
        }
        if (!winningIndex) {
          await pause(5);
        } else {
          while (guess == "") {
            try {
              guess = await gc.methods
                .getPlayerGuess(
                  previousHub,
                  this.state.gameID,
                  this.state.accounts[0]
                )
                .call();
            } catch (err) {
              console.log(err.message);
            }
            if (!guess) {
              await pause(3);
            }
          }
        }
      }

      switch (hubAlias) {
        case "hivemind.round2":
          // update round 1 stats
          this.setState({
            round1SubmittedGuess: guess,
            round1ResponseScores: responseScores,
            round1WinningIndex: winningIndex
          });
          break;
        case "hivemind.round3":
          // update round 2 stats
          this.setState({
            round2SubmittedGuess: guess,
            round2ResponseScores: responseScores,
            round2WinningIndex: winningIndex
          });
          break;
        case "hivemind.round4":
          // update round 3 stats
          this.setState({
            round3SubmittedGuess: guess,
            round3ResponseScores: responseScores,
            round3WinningIndex: winningIndex
          });
          break;
        case "hivemind.winners":
          // update round 4 stats
          let rank = "";
          console.log("Loading final rank...");
          while (rank == "") {
            try {
              rank = await gc.methods
                .getFinalRanking(this.state.gameID, this.state.accounts[0])
                .call();
            } catch (err) {
              console.log(err.message);
              console.log("Error loading rank. Trying again...");
            }
            // if rank didn't load...
            if (rank == "") {
              await pause(5);
            }
          }
          this.setState({
            round4SubmittedGuess: guess,
            round4ResponseScores: responseScores,
            round4WinningIndex: winningIndex,
            playerRank: rank
          });
          break;
        default:
          break;
      }
    }
  };

  submitChoices = async (hashedChoices) => {
    // send player choice, crowd choice, and secret phrase to contract
    console.log(`${hashedChoices}`);
    const gc = this.state.gameController;
    try {
      const tx = await gc.methods
        .submitAnswers(hashedChoices, this.state.gameID, this.state.currentHub)
        .send({ from: this.state.accounts[0] });
      console.log("Submitted Answers. Gas Used:", tx.gasUsed);
    } catch (err) {
      console.log("Error submitting choices:", err.message);
    }
    try {
      switch (this.state.currentHub) {
        case "hivemind.round1":
          this.setState({
            round1Button: "Waiting for all players to answer",
            round1InputLocked: true
          });
          break;
        case "hivemind.round2":
          this.setState({
            round2Button: "Waiting for all players to answer",
            round2InputLocked: true
          });
          break;
        case "hivemind.round3":
          this.setState({
            round3Button: "Waiting for all players to answer",
            round3InputLocked: true
          });
          break;
        case "hivemind.round4":
          this.setState({
            round4Button: "Waiting for all players to answer",
            round4InputLocked: true
          });
          break;
        default:
          break;
      }

      let web3 = this.state.provider;
      const gameRound = new web3.eth.Contract(GameRound.abi, Addresses.round1);

      // let hashedChoices = await gameRound.methods
      //   .hashedAnswer(this.state.gameID, this.state.accounts[0])
      //   .call();
      // console.log("Choices submitted:", hashedChoices);
    } catch (err) {
      console.log(err.message);
    }
  };

  revealChoices = async (playerChoice, crowdChoice) => {
    const gc = this.state.gameController;
    try {
      const tx = await gc.methods
        .revealAnswers(
          playerChoice,
          crowdChoice,
          this.state.secretPhrase,
          this.state.gameID,
          this.state.currentHub
        )
        .send({ from: this.state.accounts[0] });
      console.log("Answer revealed. Gas used:", tx.gasUsed);
      switch (this.state.currentHub) {
        case "hivemind.round1":
          this.setState({
            round1Button: "Waiting for all players to reveal"
          });
          break;
        case "hivemind.round2":
          this.setState({
            round2Button: "Waiting for all players to reveal"
          });
          break;
        case "hivemind.round3":
          this.setState({
            round3Button: "Waiting for all players to reveal"
          });
          break;
        case "hivemind.round4":
          this.setState({
            round4Button: "Waiting for all players to reveal"
          });
          break;
        default:
          break;
      }
    } catch (err) {
      console.log("Error revealing choices:", err.message);
    }
  };

  claimPrize = async () => {
    // Reset game locally, go back to lobby
    console.log("Claim prize...");
    const gc = this.state.gameController;
    const payoutAmount = await gc.methods
      .checkPayout(this.state.accounts[0])
      .call();
    if (Number(payoutAmount) > 0) {
      gc.methods
        .claimPrize(this.state.gameID, this.state.playerScore)
        .send({ from: this.state.accounts[0] });
      console.log(
        `Claimed prize: ${
          (this.state.provider.eth.fromWei(payoutAmount), "ether")
        } MATIC`
      );
    } else {
      console.log("Sorry, no payout available for this game.");
    }
    await this.resetGame();
    this.showHub("hivemind.lobby");
  };

  resetGame = async () => {
    // reset locally, will not exit an already in-progress game, need to call abandon game for that'
    console.log("Reset game (locally)...");
    this.setState({
      secretPhrase: "",
      currentHub: "hivemind.lobby",
      gameID: "(Not in game)",
      playersInGame: "(Not in game)",
      playerScore: "0",
      playerRank: "?",
      round1Question: "",
      round1Responses: [],
      round2Question: "",
      round2Responses: [],
      round3Question: "",
      round3Responses: [],
      round4Question: "",
      round4Responses: [],
      round1Button: "Submit Answers",
      round2Button: "Submit Answers",
      round3Button: "Submit Answers",
      round4Button: "Submit Answers",
      round1InputLocked: false,
      round2InputLocked: false,
      round3InputLocked: false,
      round4InputLocked: false,
      lobbyButton: "Join Game",
      round1SubmittedGuess: "",
      round2SubmittedGuess: "",
      round3SubmittedGuess: "",
      round4SubmittedGuess: "",
      round1PlayerChoice: "",
      round2PlayerChoice: "",
      round3PlayerChoice: "",
      round4PlayerChoice: "",
      round1CrowdChoice: "",
      round2CrowdChoice: "",
      round3CrowdChoice: "",
      round4CrowdChoice: "",
      round1ResponseScores: ["-", "-", "-", "-"],
      round2ResponseScores: ["-", "-", "-", "-"],
      round3ResponseScores: ["-", "-", "-", "-"],
      round4ResponseScores: ["-", "-", "-", "-"],
      round1WinningIndex: [],
      round2WinningIndex: [],
      round3WinningIndex: [],
      round4WinningIndex: [],
      round1IsMinority: false,
      round2IsMinority: false,
      round3IsMinority: false,
      round4IsMinority: false
    });
  };

  resetAndJoinNewGame = async () => {
    console.log("Reset and join new game...");
    await this.resetGame();
    this.showHub("hivemind.lobby");
  };

  abandonGame = async () => {
    console.log("Abandon game...");
    await this.state.gameController.methods
      .abandonActiveGame()
      .send({ from: this.state.accounts[0] });
    await this.resetGame();
    this.showHub("hivemind.lobby");
  };

  showHub = async (hubAlias) => {
    if (hubAlias != this.state.currentHub) {
      if (hubAlias != "hivemind.winners" && hubAlias != "hivemind.lobby") {
        await this.loadQuestions(hubAlias);
      }
      if (hubAlias != "hivemind.lobby" && hubAlias != "hivemind.round1") {
        await this.updatePlayerScore(hubAlias);
      }

      this.setState({ currentHub: hubAlias }, () => {
        switch (hubAlias) {
          case "hivemind.lobby":
            this.setState({
              showSecretPhrase: false,
              showRound1: false,
              showRound2: false,
              showRound3: false,
              showRound4: false,
              showWinners: false,
              showLobby: true,
              showScoreRound2: false,
              showScoreRound3: false,
              showScoreRound4: false,
              showScoreWinners: false,
              title: "Lobby"
            });
            break;
          case "hivemind.round1":
            this.setState({
              showSecretPhrase: true,
              showRound1: true,
              showRound2: false,
              showRound3: false,
              showRound4: false,
              showWinners: false,
              showLobby: false,
              showScoreRound2: false,
              showScoreRound3: false,
              showScoreRound4: false,
              showScoreWinners: false,
              title: "Round 1",
              round1InputLocked: false
            });
            this.FX_ROUND_1.play();
            break;
          case "hivemind.round2":
            this.setState({
              showSecretPhrase: true,
              showRound1: false,
              showRound2: true,
              showRound3: false,
              showRound4: false,
              showWinners: false,
              showLobby: false,
              showScoreRound2: true,
              showScoreRound3: false,
              showScoreRound4: false,
              showScoreWinners: false,
              title: "Round 2",
              round2InputLocked: false
            });
            this.FX_ROUND_2.play();
            break;
          case "hivemind.round3":
            this.setState({
              showSecretPhrase: true,
              showRound1: false,
              showRound2: false,
              showRound3: true,
              showRound4: false,
              showWinners: false,
              showLobby: false,
              showScoreRound2: false,
              showScoreRound3: true,
              showScoreRound4: false,
              showScoreWinners: false,
              title: "Round 3",
              round3InputLocked: false
            });
            this.FX_ROUND_3.play();
            break;
          case "hivemind.round4":
            this.setState({
              showSecretPhrase: true,
              showRound1: false,
              showRound2: false,
              showRound3: false,
              showRound4: true,
              showWinners: false,
              showLobby: false,
              showScoreRound2: false,
              showScoreRound3: false,
              showScoreRound4: true,
              showScoreWinners: false,
              title: "Round 4",
              round4InputLocked: false
            });
            this.FX_ROUND_4.play();
            break;
          case "hivemind.winners":
            this.setState({
              showSecretPhrase: false,
              showRound1: false,
              showRound2: false,
              showRound3: false,
              showRound4: false,
              showWinners: true,
              showLobby: false,
              showScoreRound2: false,
              showScoreRound3: false,
              showScoreRound4: false,
              showScoreWinners: true,
              title: "Game Results"
            });
            this.FX_GAME_FINISH.play();
            console.log("Play game finish");
            break;
          default:
            break;
        }
      });
    }
  };

  hubIsNew = (currentHubAlias, testHubAlias) => {
    let isNew = false;
    switch (currentHubAlias) {
      case "hivemind.lobby":
        if (
          testHubAlias == "hivemind.round1" ||
          testHubAlias == "hivemind.round2" ||
          testHubAlias == "hivemind.round3" ||
          testHubAlias == "hivemind.round4" ||
          testHubAlias == "hivemind.winners"
        ) {
          isNew = true;
        }
        break;
      case "hivemind.round1":
        if (
          testHubAlias == "hivemind.round2" ||
          testHubAlias == "hivemind.round3" ||
          testHubAlias == "hivemind.round4" ||
          testHubAlias == "hivemind.winners"
        ) {
          isNew = true;
        }
        break;
      case "hivemind.round2":
        if (
          testHubAlias == "hivemind.round3" ||
          testHubAlias == "hivemind.round4" ||
          testHubAlias == "hivemind.winners"
        ) {
          isNew = true;
        }
        break;
      case "hivemind.round3":
        if (
          testHubAlias == "hivemind.round4" ||
          testHubAlias == "hivemind.winners"
        ) {
          isNew = true;
        }
        break;
      case "hivemind.round4":
        if (testHubAlias == "hivemind.winners") {
          isNew = true;
        }
        break;
      default:
        break;
    }
    return isNew;
  };

  render() {
    return (
      <Layout page="hivemind">
        <Grid centered style={{ paddingTop: "10px" }}>
          <Grid.Row color="black" style={{ flexDirection: "column", alignItems: "center", paddingBottom: "0px" }}>
            <img
              src="/logo.png"
              alt="HJIVEMIND"
              style={{ width: "80px", height: "80px", marginBottom: "10px" }}
            />
            <h1 className="hjivemind-title">
              {settings.projectTitle}
            </h1>
            <p className="hjivemind-tagline">
              A coordination game protocol
            </p>
          </Grid.Row>
          <Grid.Row color="black">
            <ConnectWallet
              setProvider={this.setProvider}
              setAccounts={this.setAccounts}
              setConnectedWallet={this.setConnectedWallet}
            />
          </Grid.Row>
          <Grid.Row color="black" style={{ paddingTop: "0px" }}>
            {this.state.connectedWallet
              ? `Connected: ${this.state.connectedWallet}`
              : "Not connected"}
          </Grid.Row>
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <Title title={this.state.title} />
          </Grid.Row>
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <SecretPhrase
              show={this.state.showSecretPhrase}
              phrase={this.state.secretPhrase}
              setPhrase={this.setSecretPhrase}
            />
          </Grid.Row>
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <Lobby
              accounts={this.state.accounts}
              gameController={this.state.gameController}
              show={this.state.showLobby}
              provider={this.state.provider}
              gameID={this.state.gameID}
              playersInGame={this.state.playersInGame}
              lobbyButton={this.state.lobbyButton}
              setGameID={this.setGameID}
              setPlayersInGame={this.setPlayersInGame}
              setLobbyButton={this.setLobbyButton}
            />
            <Question
              question={this.state.round1Question}
              responses={this.state.round1Responses}
              show={this.state.showRound1}
              buttonText={this.state.round1Button}
              provider={this.state.provider}
              playerChoice={this.state.round1PlayerChoice}
              crowdChoice={this.state.round1CrowdChoice}
              inputLocked={this.state.round1InputLocked}
              isMinority={this.state.round1IsMinority}
              setPlayerChoice={this.setPlayerChoice}
              setCrowdChoice={this.setCrowdChoice}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
              secretPhrase={this.state.secretPhrase}
            />
            <Question
              question={this.state.round2Question}
              responses={this.state.round2Responses}
              show={this.state.showRound2}
              buttonText={this.state.round2Button}
              provider={this.state.provider}
              playerChoice={this.state.round2PlayerChoice}
              crowdChoice={this.state.round2CrowdChoice}
              inputLocked={this.state.round2InputLocked}
              isMinority={this.state.round2IsMinority}
              setPlayerChoice={this.setPlayerChoice}
              setCrowdChoice={this.setCrowdChoice}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
              secretPhrase={this.state.secretPhrase}
            />
            <Question
              question={this.state.round3Question}
              responses={this.state.round3Responses}
              show={this.state.showRound3}
              buttonText={this.state.round3Button}
              provider={this.state.provider}
              playerChoice={this.state.round3PlayerChoice}
              crowdChoice={this.state.round3CrowdChoice}
              inputLocked={this.state.round3InputLocked}
              isMinority={this.state.round3IsMinority}
              setPlayerChoice={this.setPlayerChoice}
              setCrowdChoice={this.setCrowdChoice}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
              secretPhrase={this.state.secretPhrase}
            />
            <Question
              question={this.state.round4Question}
              responses={this.state.round4Responses}
              show={this.state.showRound4}
              buttonText={this.state.round4Button}
              provider={this.state.provider}
              playerChoice={this.state.round4PlayerChoice}
              crowdChoice={this.state.round4CrowdChoice}
              inputLocked={this.state.round4InputLocked}
              isMinority={this.state.round4IsMinority}
              setPlayerChoice={this.setPlayerChoice}
              setCrowdChoice={this.setCrowdChoice}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
              secretPhrase={this.state.secretPhrase}
            />
            <Winners
              accounts={this.state.accounts}
              gameController={this.state.gameController}
              provider={this.state.provider}
              show={this.state.showWinners}
              rank={this.state.playerRank}
              claimPrize={this.claimPrize}
              joinNewGame={this.resetAndJoinNewGame}
            />
          </Grid.Row>
          <Grid.Row>
            <Score
              show={this.state.showScoreRound2}
              score={this.state.playerScore}
              guess={this.state.round1SubmittedGuess}
              responseScores={this.state.round1ResponseScores}
              winningIndex={this.state.round1WinningIndex}
              question={this.state.round1Question}
              responses={this.state.round1Responses}
              isMinority={this.state.round1IsMinority}
            />
            <Score
              show={this.state.showScoreRound3}
              score={this.state.playerScore}
              guess={this.state.round2SubmittedGuess}
              responseScores={this.state.round2ResponseScores}
              winningIndex={this.state.round2WinningIndex}
              question={this.state.round2Question}
              responses={this.state.round2Responses}
              isMinority={this.state.round2IsMinority}
            />
            <Score
              show={this.state.showScoreRound4}
              score={this.state.playerScore}
              guess={this.state.round3SubmittedGuess}
              responseScores={this.state.round3ResponseScores}
              winningIndex={this.state.round3WinningIndex}
              question={this.state.round3Question}
              responses={this.state.round3Responses}
              isMinority={this.state.round3IsMinority}
            />
            <Score
              show={this.state.showScoreWinners}
              score={this.state.playerScore}
              guess={this.state.round4SubmittedGuess}
              responseScores={this.state.round4ResponseScores}
              winningIndex={this.state.round4WinningIndex}
              question={this.state.round4Question}
              responses={this.state.round4Responses}
              isMinority={this.state.round4IsMinority}
            />
          </Grid.Row>
          {/* <Grid.Row>
            <span onClick={this.abandonGame}>abandon game</span>
          </Grid.Row> */}
        </Grid>
      </Layout>
    );
  }
}

export default Dashboard;
