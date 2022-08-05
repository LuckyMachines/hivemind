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
        switch (buttonText) {
          case "Join Game":
            // TODO: set gas parameters
            await lobby.methods.joinGame().send({ from: accounts[0] });
            const newGameID = await scoreKeeper.methods
              .currentGameID(accounts[0])
              .call();
            setGameID(newGameID);
            const playerCount = await lobby.methods.playerCount(gameID).call();
            setPlayersInGame(playerCount);
            setButtonText("Waiting for game to start...");
            break;
          case "Start Game":
            break;
          default:
            console.log(
              "This button does nothing, but have fun clicking away!"
            );
            break;
        }
        // Join game
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
