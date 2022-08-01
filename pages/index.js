import React, { Component } from "react";
import { Grid, Header, Button } from "semantic-ui-react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
const settings = require("../settings");

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connectedWallet: "",
      provider: "",
      accounts: []
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
          <Grid.Row style={{ backgroundColor: "#99ccff", color: "#001433" }}>
            <Grid.Column width={12}>
              <center>
                <ConnectWallet
                  setProvider={this.setProvider}
                  setAccounts={this.setAccounts}
                  setConnectedWallet={this.setConnectedWallet}
                />
                <br />
                <p>
                  <strong>Connected Wallet:</strong>{" "}
                  {this.state.connectedWallet}
                </p>
              </center>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Layout>
    );
  }
}

export default Dashboard;
