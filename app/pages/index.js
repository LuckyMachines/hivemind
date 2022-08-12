import React, { Component } from "react";
import { Grid, Button } from "semantic-ui-react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import Title from "../components/Title";
import SecretPhrase from "../components/SecretPhrase";
import Lobby from "../components/Lobby";
import Score from "../components/Score";
import Winners from "../components/Winners";
import Addresses from "../../deployed-contracts.json";
import GameController from "../../artifacts/contracts/GameController.sol/GameController.json";
import GameRound from "../../artifacts/contracts/GameRound.sol/GameRound.json";
import { ethers } from "ethers";
require("dotenv").config();

const settings = require("../settings");

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
      showScore: false,
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
      title: "Lobby"
    };
  }

  async componentDidMount() {
    this._isMounted = true;
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

    let url = process.env.HARDHAT_RPC_URL;
    let p2 = new ethers.providers.JsonRpcProvider(url);
    const gc2 = new ethers.Contract(
      Addresses.gameController,
      GameController.abi,
      p2
    );
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

  setGameID = (id) => {
    this.setState({ gameID: id });
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

  roundStarted = (hubAlias, gameID, groupID, startTime) => {
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
    if (gameID == this.state.gameID) {
      console.log(
        `Reveal Start: ${hubAlias}, ${startTime}, ${gameID}, ${groupID}`
      );
      switch (this.state.currentHub) {
        case "hivemind.round1":
          this.setState({ round1Button: "Reveal Answers" });
          break;
        case "hivemind.round2":
          this.setState({ round2Button: "Reveal Answers" });
          break;
        case "hivemind.round3":
          this.setState({ round3Button: "Reveal Answers" });
          break;
        case "hivemind.round4":
          this.setState({ round4Button: "Reveal Answers" });
          break;
        case "hivemind.lobby":
          switch (hubAlias) {
            case "hivemind.round1":
              this.setState({ round1Button: "Reveal Answers" });
              break;
            case "hivemind.round2":
              this.setState({ round2Button: "Reveal Answers" });
              break;
            case "hivemind.round3":
              this.setState({ round3Button: "Reveal Answers" });
              break;
            case "hivemind.round4":
              this.setState({ round4Button: "Reveal Answers" });
              break;
            default:
              break;
          }
          this.showHub(hubAlias);
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

    switch (hubAlias) {
      case "hivemind.round1":
        this.setState({
          round1Question: question,
          round1Responses: choices
        });
        break;
      case "hivemind.round2":
        this.setState({
          round2Question: question,
          round2Responses: choices
        });
        break;
      case "hivemind.round3":
        this.setState({
          round3Question: question,
          round3Responses: choices
        });
        break;
      case "hivemind.round4":
        this.setState({
          round4Question: question,
          round4Responses: choices
        });
        break;
      default:
        break;
    }
  };

  updatePlayerScore = async (hubAlias) => {
    const gc = this.state.gameController;
    const score = await gc.methods
      .getScore(this.state.gameID, this.state.accounts[0])
      .call();
    this.setState({ playerScore: score });
    let guess;
    let responseScores;
    let winningIndex;
    if (hubAlias != "hivemind.round1") {
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
      guess = await gc.methods
        .getPlayerGuess(previousHub, this.state.gameID, this.state.accounts[0])
        .call();
      responseScores = await gc.methods
        .getResponseScores(previousHub, this.state.gameID)
        .call();
      winningIndex = await gc.methods
        .getWinningIndex(previousHub, this.state.gameID)
        .call();
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
      case "hivemind.round1":
      default:
        break;
    }
  };

  submitChoices = async (playerChoice, crowdChoice) => {
    // send player choice, crowd choice, and secret phrase to contract
    console.log(`${playerChoice}, ${crowdChoice}, ${this.state.secretPhrase}`);
    switch (this.state.currentHub) {
      case "hivemind.round1":
        this.setState({ round1Button: "Waiting for all players to answer" });
        break;
      case "hivemind.round2":
        this.setState({ round2Button: "Waiting for all players to answer" });
        break;
      case "hivemind.round3":
        this.setState({ round3Button: "Waiting for all players to answer" });
        break;
      case "hivemind.round4":
        this.setState({ round4Button: "Waiting for all players to answer" });
        break;
      default:
        break;
    }
    const gc = this.state.gameController;
    await gc.methods
      .submitAnswers(
        playerChoice,
        crowdChoice,
        this.state.secretPhrase,
        this.state.gameID,
        this.state.currentHub
      )
      .send({ from: this.state.accounts[0] });
    console.log("Submitted Answers");

    let web3 = this.state.provider;
    const gameRound = new web3.eth.Contract(GameRound.abi, Addresses.round1);

    let hashedChoices = await gameRound.methods
      .hashedAnswer(this.state.gameID, this.state.accounts[0])
      .call();
    console.log("Choices submitted:", hashedChoices);
  };

  revealChoices = async (playerChoice, crowdChoice) => {
    switch (this.state.currentHub) {
      case "hivemind.round1":
        this.setState({ round1Button: "Waiting for all players to reveal" });
        break;
      case "hivemind.round2":
        this.setState({ round2Button: "Waiting for all players to reveal" });
        break;
      case "hivemind.round3":
        this.setState({ round3Button: "Waiting for all players to reveal" });
        break;
      case "hivemind.round4":
        this.setState({ round4Button: "Waiting for all players to reveal" });
        break;
      default:
        break;
    }
    const gc = this.state.gameController;
    await gc.methods
      .revealAnswers(
        playerChoice,
        crowdChoice,
        this.state.secretPhrase,
        this.state.gameID,
        this.state.currentHub
      )
      .send({ from: this.state.accounts[0] });
  };

  // TODO: pickup with these 3 functions
  ////
  ///
  //
  //
  claimPrize = async () => {
    // Claim prize
    // Reset game locally, go back to lobby
    console.log("Claim prize...");
    // TODO: claim prize before resetting locally
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
      round4WinningIndex: []
    });
  };

  resetAndJoinNewGame = async () => {
    console.log("Reset and join new game...");
    await this.resetGame();
    this.showHub("hivemind.lobby");
  };

  abandonGame = async () => {
    console.log("Abandon game...");
    const gc = this.state.gameController;
    await gc.methods.abandonActiveGame().send({ from: this.state.accounts[0] });
    await this.resetGame();
    this.showHub("hivemind.lobby");
  };
  //
  ///
  ////
  /////
  //////
  ////////
  /////////
  /////////
  //////
  ////
  ///
  //

  showHub = async (hubAlias) => {
    if (hubAlias != "hivemind.winners" && hubAlias != "hivemind.lobby") {
      await this.loadQuestions(hubAlias);
    }
    if (hubAlias != "hivemind.lobby") {
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
            showScore: false,
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
            showScore: true,
            title: "Round 1"
          });

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
            showScore: true,
            title: "Round 2"
          });
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
            showScore: true,
            title: "Round 3"
          });
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
            showScore: true,
            title: "Round 4"
          });
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
            showScore: true,
            title: "Game Results"
          });
          break;
        default:
          break;
      }
    });
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
          <Grid.Row color="black">
            <h1
              style={{
                textColor: "white",
                fontSize: "4em",
                fontWeight: "normal"
              }}
            >
              {settings.projectTitle}
            </h1>
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
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
            />
            <Question
              question={this.state.round2Question}
              responses={this.state.round2Responses}
              show={this.state.showRound2}
              buttonText={this.state.round2Button}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
            />
            <Question
              question={this.state.round3Question}
              responses={this.state.round3Responses}
              show={this.state.showRound3}
              buttonText={this.state.round3Button}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
            />
            <Question
              question={this.state.round4Question}
              responses={this.state.round4Responses}
              show={this.state.showRound4}
              buttonText={this.state.round4Button}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
              revealChoices={this.revealChoices}
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
              show={this.state.showScore}
              score={this.state.playerScore}
              guess1={this.state.round1SubmittedGuess}
              guess2={this.state.round2SubmittedGuess}
              guess3={this.state.round3SubmittedGuess}
              guess4={this.state.round4SubmittedGuess}
              responseScores1={this.state.round1ResponseScores}
              responseScores2={this.state.round2ResponseScores}
              responseScores3={this.state.round3ResponseScores}
              responseScores4={this.state.round4ResponseScores}
              winningIndex1={this.state.round1WinningIndex}
              winningIndex2={this.state.round2WinningIndex}
              winningIndex3={this.state.round3WinningIndex}
              winningIndex4={this.state.round4WinningIndex}
            />
          </Grid.Row>
        </Grid>
      </Layout>
    );
  }
}

export default Dashboard;
