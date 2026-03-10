import React, { useState } from "react";
import Addresses from "../contracts/deployed-contracts.json";
import LobbyABI from "../contracts/Lobby.json";
const settings = require("../settings");

const Lobby = (props) => {
  const [joinGameLoading, setJoinGameLoading] = useState(false);
  const [usdcLoading, setUsdcLoading] = useState(false);
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

          if (!playerInGame) {
            const lobbyContract = new web3.eth.Contract(
              LobbyABI.abi,
              Addresses.lobby
            );
            const entryFee = await lobbyContract.methods.entryFee().call();
            const tx = await gameController.methods.joinGame().send({
              from: accounts[0],
              value: entryFee,
              gasLimit: settings.gasLimit
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

  const joinWithUSDC = async () => {
    if (!accounts || !accounts[0]) {
      window.alert("Please connect your web3 wallet first");
      return;
    }

    setUsdcLoading(true);
    try {
      // x402 payment flow: POST to /api/game/join
      // The x402 middleware will return 402 with payment details
      // The browser needs to handle the USDC payment on Base Sepolia
      const response = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: accounts[0] }),
      });

      if (response.status === 402) {
        // x402 payment required - extract payment details from response
        const paymentDetails = await response.json();
        console.log("x402 payment required:", paymentDetails);

        // Display payment instructions to user
        window.alert(
          "USDC payment required on Base Sepolia.\n" +
          "Amount: " + (paymentDetails.price || "$0.05") + "\n" +
          "Please approve the USDC transaction in your wallet."
        );

        // In production, use x402-fetch or handle the payment flow:
        // 1. Sign USDC payment on Base Sepolia
        // 2. Retry the request with payment proof in X-PAYMENT header
        // For now, show the user what's needed
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join game");
      }

      const result = await response.json();
      console.log("Joined game via USDC:", result);

      props.setPlayersInGame(
        await gameController.methods.getPlayerCount(result.gameID).call()
      );
      props.setLobbyButton("Waiting for game to start...");
      props.setGameID(result.gameID);
    } catch (err) {
      console.error("USDC join error:", err.message);
      window.alert("Failed to join with USDC: " + err.message);
    }
    setUsdcLoading(false);
  };

  const isWaiting = props.lobbyButton !== "Join Game";

  if (!props.show) return null;

  return (
    <div className="glass-card lobby-card play-fade-in">
      <div className="lobby-card__label">Game ID</div>
      <div className="lobby-card__game-id">{props.gameID}</div>
      <br />
      <button
        className={`lobby-join-btn ${isWaiting ? "lobby-join-btn--waiting" : ""}`}
        onClick={joinGame}
        disabled={joinGameLoading || isWaiting}
      >
        {joinGameLoading ? "Joining..." : props.lobbyButton}
      </button>
      {!isWaiting && (
        <button
          className="lobby-join-btn lobby-join-btn--usdc"
          onClick={joinWithUSDC}
          disabled={usdcLoading}
          style={{ marginTop: "8px", background: "linear-gradient(135deg, #2775ca, #3b82f6)" }}
        >
          {usdcLoading ? "Processing USDC..." : "Pay with USDC (x402)"}
        </button>
      )}
      {props.children}
    </div>
  );
};

export default Lobby;
