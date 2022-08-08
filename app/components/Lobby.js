import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";
import Addresses from "../../deployed-contracts.json";
import LobbyContract from "../../artifacts/contracts/Lobby.sol/Lobby.json";
import ScoreKeeperContract from "../../artifacts/contracts/ScoreKeeper.sol/ScoreKeeper.json";

const Lobby = (props) => {
  const [joinGameLoading, setJoinGameLoading] = useState(false);
  const [playersInGame, setPlayersInGame] = useState("(Not in game)");
  const [gameID, setGameID] = useState("(Not in game)");
  const [buttonText, setButtonText] = useState("Join Game");
  const web3 = props.provider;
  let accounts;
  let lobby;
  let scoreKeeper;

  const joinGame = async () => {
    setJoinGameLoading(true);
    if (web3) {
      accounts = await web3.eth.getAccounts();
      lobby = new web3.eth.Contract(LobbyContract.abi, Addresses.lobby);
      scoreKeeper = new web3.eth.Contract(
        ScoreKeeperContract.abi,
        Addresses.scoreKeeper
      );
      try {
        if (buttonText == "Join Game") {
          let playerInGame = await scoreKeeper.methods
            .playerInActiveGame(accounts[0])
            .call();
          // TODO: check if player is already in game
          // TODO: set gas parameters
          if (!playerInGame) {
            await lobby.methods.joinGame().send({ from: accounts[0] });
          }
          const currentGameID = await scoreKeeper.methods
            .currentGameID(accounts[0])
            .call();
          console.log("New game ID:", currentGameID);
          setGameID(currentGameID);
          const playerCount = await lobby.methods
            .playerCount(currentGameID)
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
