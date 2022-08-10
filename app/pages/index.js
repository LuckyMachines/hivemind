import React, { Component } from "react";
import { Grid, Button } from "semantic-ui-react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import SecretPhrase from "../components/SecretPhrase";
import Lobby from "../components/Lobby";
import Winners from "../components/Winners";
import Addresses from "../../deployed-contracts.json";
import GameController from "../../artifacts/contracts/GameController.sol/GameController.json";
import GameRound from "../../artifacts/contracts/GameRound.sol/GameRound.json";
import { ethers } from "ethers";

const settings = require("../settings");

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
      currentHub: "hivemind.lobby",
      gameID: "0",
      round1Question: "",
      round1Responses: ["", "", "", ""],
      round2Question: "",
      round2Responses: ["", "", "", ""],
      round3Question: "",
      round3Responses: ["", "", "", ""],
      round4Question: "",
      round4Responses: ["", "", "", ""]
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

    let url = "http://127.0.0.1:8545";
    let p2 = new ethers.providers.JsonRpcProvider(url);
    const gc2 = await new ethers.Contract(
      Addresses.gameController,
      GameController.abi,
      p2
    );
    gc2.on("RoundStart", (hubAlias, startTime, gameID, groupID) => {
      this.roundStarted(hubAlias, gameID, groupID, startTime);
    });
    // TODO: Subscribe to events:
    // All players in for round (switch to reveal mode)
    // Round Results are in... (Display question results / points / standings)
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
      this.loadQuestions(hubAlias);
      this.showHub(hubAlias);
    }
  };

  loadQuestions = async (hubAlias) => {
    const gc = this.state.gameController;
    const gcQuestion = await gc.methods
      .getQuestion(hubAlias, this.state.gameID)
      .call();
    const question = gcQuestion.q;
    const choices = gcQuestion.choices;

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

  submitChoices = async (playerChoice, crowdChoice) => {
    // send player choice, crowd choice, and secret phrase to contract
    // console.log(`${playerChoice}, ${crowdChoice}, ${this.state.secretPhrase}`);
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

    let web3 = this.state.provider;
    const gameRound = new web3.eth.Contract(
      GameRound.abi,
      Addresses.gameController
    );

    let hashedChoices = await gameRound.methods
      .hashedAnswer(this.state.gameID, this.state.accounts[0])
      .call();
    console.log("Choices submitted:", hashedChoices);
  };

  revealChoices = async () => {
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

  showHub = (hubAlias) => {
    this.setState({ currentHub: hubAlias });

    switch (hubAlias) {
      case "hivemind.lobby":
        this.setState({
          showSecretPhrase: false,
          showRound1: false,
          showRound2: false,
          showRound3: false,
          showRound4: false,
          showWinners: false,
          showLobby: true
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
          showLobby: false
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
          showLobby: false
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
          showLobby: false
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
          showLobby: false
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
          showLobby: false
        });
        break;
      default:
        break;
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
      <Layout page="dashboard">
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
              setGameID={this.setGameID}
            />
            <Question
              question={this.state.round1Question}
              responses={this.state.round1Responses}
              show={this.state.showRound1}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
            />
            <Question
              question={this.state.round2Question}
              responses={this.state.round2Responses}
              show={this.state.showRound2}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
            />
            <Question
              question={this.state.round3Question}
              responses={this.state.round3Responses}
              show={this.state.showRound3}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
            />
            <Question
              question={this.state.round4Question}
              responses={this.state.round4Responses}
              show={this.state.showRound4}
              provider={this.state.provider}
              submitChoices={this.submitChoices}
            />
            <Winners
              accounts={this.state.accounts}
              gameController={this.state.gameController}
              provider={this.state.provider}
              show={this.state.showWinners}
            >
              Winners
            </Winners>
          </Grid.Row>
        </Grid>
      </Layout>
    );
  }
}

export default Dashboard;
