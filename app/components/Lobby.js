import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";
import Addresses from "../../deployed-contracts.json";

const Lobby = (props) => {
  const [joinGameLoading, setJoinGameLoading] = useState(false);
  const [playersInGame, setPlayersInGame] = useState("(Not in game)");
  const [gameID, setGameID] = useState("(Not in game)");
  const [buttonText, setButtonText] = useState("Join Game");
  const web3 = props.provider;
  const accounts = props.accounts;
  const gameController = props.gameController;
  let eventOptions = {
    address: [Addresses.gameController]
  };

  let subscription;

  const joinGame = async () => {
    setJoinGameLoading(true);
    if (web3 && accounts && gameController) {
      try {
        if (buttonText == "Join Game") {
          let playerInGame = await gameController.methods
            .getIsInActiveGame(accounts[0])
            .call();
          subscription = web3.eth.subscribe(
            "logs",
            eventOptions,
            (err, event) => {
              if (!err) {
                console.log(event);
              } else {
                console.log(err.message);
              }
            }
          );
          // TODO: set gas parameters
          if (!playerInGame) {
            await gameController.methods.joinGame().send({ from: accounts[0] });
          }
          const currentGameID = await gameController.methods
            .getCurrentGame(accounts[0])
            .call();
          console.log("New game ID:", currentGameID);
          setGameID(currentGameID);
          props.setGameID(currentGameID);
          const playerCount = await gameController.methods
            .getPlayerCount(currentGameID)
            .call();
          setPlayersInGame(playerCount);
          setButtonText("Waiting for game to start...");
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
      <div>
        <p>
          <strong>
            Game ID: {gameID}
            <br />
            Players in game: {playersInGame}
          </strong>
        </p>
        <Button onClick={joinGame} loading={joinGameLoading}>
          {buttonText}
        </Button>
        {props.children}
      </div>
    );
  return content;
};

export default Lobby;
