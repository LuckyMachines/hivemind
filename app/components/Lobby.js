import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";
import Addresses from "../../deployed-contracts.json";
import GameController from "../../artifacts/contracts/GameController.sol/GameController.json";

const Lobby = (props) => {
  const [joinGameLoading, setJoinGameLoading] = useState(false);
  const [playersInGame, setPlayersInGame] = useState("(Not in game)");
  const [gameID, setGameID] = useState("(Not in game)");
  const [buttonText, setButtonText] = useState("Join Game");
  const web3 = props.provider;
  let accounts;
  let gameController;

  const joinGame = async () => {
    setJoinGameLoading(true);
    if (web3) {
      accounts = await web3.eth.getAccounts();
      gameController = new web3.eth.Contract(
        GameController.abi,
        Addresses.gameController
      );
      try {
        if (buttonText == "Join Game") {
          let playerInGame = await gameController.methods
            .getIsInActiveGame(accounts[0])
            .call();
          // TODO: check if player is already in game
          // TODO: set gas parameters
          if (!playerInGame) {
            await gameController.methods.joinGame().send({ from: accounts[0] });
          }
          const currentGameID = await gameController.methods
            .getCurrentGame(accounts[0])
            .call();
          console.log("New game ID:", currentGameID);
          setGameID(currentGameID);
          const playerCount = await gameController.methods
            .getPlayerCount(currentGameID)
            .call();
          setPlayersInGame(playerCount);
          setButtonText("Waiting for game to start...");
        } else if (buttonText == "Start Game") {
          // move into next round
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
