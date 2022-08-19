import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";
const settings = require("../settings");
require("dotenv").config();

const Lobby = (props) => {
  const [joinGameLoading, setJoinGameLoading] = useState(false);
  const web3 = props.provider;
  const accounts = props.accounts;
  const gameController = props.gameController;

  const joinGame = async () => {
    setJoinGameLoading(true);
    if (web3 && accounts && gameController) {
      try {
        if (props.lobbyButton == "Join Game") {
          let playerInGame = await gameController.methods
            .getIsInActiveGame(accounts[0])
            .call();

          // TODO: set gas parameters
          if (!playerInGame) {
            const tx = await gameController.methods.joinGame().send({
              from: accounts[0],
              gasLimit: settings.gasLimit,
              gasPrice: settings.gasPrice
            });
            console.log("Gas used to join game:", tx.gasUsed);
          }
          const currentGameID = await gameController.methods
            .getCurrentGame(accounts[0])
            .call();
          console.log("New game ID:", currentGameID);
          const playerCount = await gameController.methods
            .getPlayerCount(currentGameID)
            .call();
          props.setPlayersInGame(playerCount);
          props.setLobbyButton("Waiting for game to start...");
          props.setGameID(currentGameID);
        } else if (buttonText == "Start Game") {
          // move into next round (probably do this automatically without button)
        } else {
          console.log("This button does nothing, but have fun clicking away!");
        }
      } catch (err) {
        console.log(err.message);
      }
    } else {
      window.alert("Please connect your web3 wallet");
    }
    setJoinGameLoading(false);
  };

  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ marginTop: "-40px" }}>
        <p>
          <strong>Game ID: {props.gameID}</strong>
        </p>
        <Button onClick={joinGame} loading={joinGameLoading}>
          {props.lobbyButton}
        </Button>
        {props.children}
      </div>
    );
  return content;
};

export default Lobby;
