import React, { Component } from "react";
import { Grid, Button } from "semantic-ui-react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import SecretPhrase from "../components/SecretPhrase";
import Lobby from "../components/Lobby";
import Winners from "../components/Winners";

const settings = require("../settings");

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connectedWallet: "",
      provider: "",
      accounts: [],
      secretPhrase: "",
      showRound1: false,
      showRound2: false,
      showRound3: false,
      showRound4: false,
      showWinners: false,
      showLobby: true
    };
  }

  setProvider = (p) => {
    this.setState({ provider: p });
  };
  setAccounts = (a) => {
    this.setState({ accounts: a });
  };
  setConnectedWallet = (w) => {
    this.setState({ connectedWallet: w });
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
            <SecretPhrase />
          </Grid.Row>
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <Lobby show={this.state.showLobby}>Lobby</Lobby>
            <Question show={this.state.showRound1} />
            <Question show={this.state.showRound2} />
            <Question show={this.state.showRound3} />
            <Question show={this.state.showRound4} />
            <Winners show={this.state.showWinners}>Winners</Winners>
          </Grid.Row>
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <Button color="black" size="massive">
              Submit Answers
            </Button>
          </Grid.Row>
        </Grid>
      </Layout>
    );
  }
}

export default Dashboard;
