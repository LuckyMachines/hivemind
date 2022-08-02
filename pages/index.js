import React, { Component } from "react";
import { Grid, Button } from "semantic-ui-react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import SecretPhrase from "../components/SecretPhrase";
const settings = require("../settings");

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connectedWallet: "",
      provider: "",
      accounts: [],
      secretPhrase: ""
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
            <Question />
          </Grid.Row>
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <Button color="black">Submit Answers</Button>
          </Grid.Row>
        </Grid>
      </Layout>
    );
  }
}

export default Dashboard;
