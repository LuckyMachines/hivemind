import React from "react";
import Layout from "../components/Layout";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import Title from "../components/Title";
import SecretPhrase from "../components/SecretPhrase";
import Lobby from "../components/Lobby";
import Score from "../components/Score";
import Winners from "../components/Winners";
import { useToast } from "../components/Toast";
import useGameState from "../hooks/useGameState";

const settings = require("../settings");

function Dashboard() {
  const { addToast } = useToast();
  const game = useGameState(addToast);

  const {
    provider, setProvider,
    accounts, setAccounts,
    gameController,
    setConnectedWallet,
    secretPhrase, setSecretPhrase,
    currentHub, gameID,
    playersInGame, setPlayersInGame,
    playerScore, playerRank,
    rounds,
    lobbyButton, setLobbyButton,
    showHub,
    submitChoices, revealChoices,
    claimPrize, resetGame,
    setPlayerChoice, setCrowdChoice,
    setGameID,
    // Derived
    roundIndex, showLobby, showWinners, showSecretPhrase,
    activeRound, title, scoreRoundNum
  } = game;

  const handleSetGameID = (id) => setGameID(id, gameController, provider, accounts);
  const handleSubmitChoices = (hashed) => submitChoices(hashed, gameController, gameID, accounts, currentHub);
  const handleRevealChoices = (pc, cc) => revealChoices(pc, cc, gameController, gameID, accounts, currentHub, secretPhrase);
  const handleClaimPrize = () => {
    claimPrize(gameController, gameID, accounts, provider, playerScore);
    resetGame();
  };
  const handleJoinNewGame = () => resetGame();

  return (
    <Layout page="hivemind">
      <div className="play-page">
        {/* Header */}
        <div className="play-header">
          <img src="/logo.png" alt="HJIVEMIND" className="play-header__logo" />
          <h1 className="hjivemind-title">{settings.projectTitle}</h1>
          <p className="hjivemind-tagline">A coordination game protocol</p>
        </div>

        {/* Wallet Bar */}
        <div className="play-wallet-bar">
          <ConnectWallet
            setProvider={setProvider}
            setAccounts={setAccounts}
            setConnectedWallet={setConnectedWallet}
          />
        </div>

        {/* Main Content */}
        <div className="play-content">
          {/* Round Title */}
          <div className="play-round-bar">
            <h2 className="play-round-title">
              <Title title={title} />
            </h2>
            {roundIndex > 0 && (
              <div className="play-round-dots">
                {[1, 2, 3, 4].map((r) => (
                  <div
                    key={r}
                    className={`play-round-dot ${
                      r === roundIndex
                        ? "play-round-dot--active"
                        : r < roundIndex
                        ? "play-round-dot--completed"
                        : ""
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Secret Phrase */}
          <SecretPhrase
            show={showSecretPhrase}
            phrase={secretPhrase}
            setPhrase={setSecretPhrase}
          />

          {/* Game Content */}
          <div className="play-fade-in" key={currentHub}>
            {showLobby && (
              <Lobby
                accounts={accounts}
                gameController={gameController}
                show={showLobby}
                provider={provider}
                gameID={gameID}
                playersInGame={playersInGame}
                lobbyButton={lobbyButton}
                setGameID={handleSetGameID}
                setPlayersInGame={setPlayersInGame}
                setLobbyButton={setLobbyButton}
              />
            )}

            {activeRound > 0 && (
              <Question
                question={rounds[activeRound].question}
                responses={rounds[activeRound].responses}
                show={true}
                buttonText={rounds[activeRound].button}
                provider={provider}
                playerChoice={rounds[activeRound].playerChoice}
                crowdChoice={rounds[activeRound].crowdChoice}
                inputLocked={rounds[activeRound].inputLocked}
                isMinority={rounds[activeRound].isMinority}
                setPlayerChoice={(c) => setPlayerChoice(c, currentHub)}
                setCrowdChoice={(c) => setCrowdChoice(c, currentHub)}
                submitChoices={handleSubmitChoices}
                revealChoices={handleRevealChoices}
                secretPhrase={secretPhrase}
              />
            )}

            {showWinners && (
              <Winners
                accounts={accounts}
                gameController={gameController}
                provider={provider}
                show={true}
                rank={playerRank}
                claimPrize={handleClaimPrize}
                joinNewGame={handleJoinNewGame}
              />
            )}
          </div>

          {/* Score Section - show previous round's results */}
          {scoreRoundNum && (
            <Score
              show={true}
              score={playerScore}
              guess={rounds[scoreRoundNum].submittedGuess}
              responseScores={rounds[scoreRoundNum].responseScores}
              winningIndex={rounds[scoreRoundNum].winningIndex}
              question={rounds[scoreRoundNum].question}
              responses={rounds[scoreRoundNum].responses}
              isMinority={rounds[scoreRoundNum].isMinority}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
