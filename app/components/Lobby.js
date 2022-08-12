import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";
import Addresses from "../../deployed-contracts.json";

const Lobby = (props) => {
  const [joinGameLoading, setJoinGameLoading] = useState(false);
  // const [playersInGame, setPlayersInGame] = useState("(Not in game)");
  // const [gameID, setGameID] = useState("(Not in game)");
  // const [buttonText, setButtonText] = useState("Join Game");
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
            const tx = await gameController.methods
              .joinGame()
              .send({ from: accounts[0] });
            console.log("Gas used to join game:", tx.gasUsed);
          }
          const currentGameID = await gameController.methods
            .getCurrentGame(accounts[0])
            .call();
          console.log("New game ID:", currentGameID);
          props.setGameID(currentGameID);
          const playerCount = await gameController.methods
            .getPlayerCount(currentGameID)
            .call();
          props.setPlayersInGame(playerCount);
          props.setLobbyButton("Waiting for game to start...");
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
          <strong>
            Game ID: {props.gameID}
            <br />
            Players in game: {props.playersInGame}
          </strong>
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
