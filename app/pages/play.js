import React, { useState, useEffect } from "react";
import Head from "next/head";
import ConnectWallet from "../components/ConnectWallet";
import Question from "../components/Question";
import SecretPhrase from "../components/SecretPhrase";
import Lobby from "../components/Lobby";
import Score from "../components/Score";
import Winners from "../components/Winners";
import Panel from "../components/Panel";
import PanelTabs from "../components/PanelTabs";
import { useToast } from "../components/Toast";
import useGameState from "../hooks/useGameState";

const settings = require("../settings");

/* ── SVG icons for panel headers ── */
const ICON_GAME = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const ICON_STATUS = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 13l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_SCORE = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="10" width="3" height="6" rx="1" fill="currentColor" opacity="0.5" />
    <rect x="7.5" y="6" width="3" height="10" rx="1" fill="currentColor" opacity="0.7" />
    <rect x="13" y="2" width="3" height="14" rx="1" fill="currentColor" />
  </svg>
);
const ICON_WALLET = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="4" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1 7h16" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="13" cy="11" r="1.5" fill="currentColor" />
  </svg>
);

function Dashboard() {
  const { addToast } = useToast();
  const game = useGameState(addToast);

  const {
    provider, setProvider,
    accounts, setAccounts,
    gameController,
    setConnectedWallet,
    chainId, setChainId,
    secretPhrase, setSecretPhrase,
    currentHub, gameID,
    playersInGame, setPlayersInGame,
    playerScore, playerRank,
    rounds,
    lobbyButton, setLobbyButton,
    submitChoices, revealChoices,
    claimPrize, resetGame,
    setPlayerChoice, setCrowdChoice,
    setGameID,
    roundIndex, showLobby, showWinners, showSecretPhrase,
    activeRound, title, scoreRoundNum
  } = game;

  const handleSetGameID = (id) => setGameID(id, gameController, provider, accounts);
  const handleSubmitChoices = (hashed) => submitChoices(hashed, gameController, gameID, accounts, currentHub);
  const handleRevealChoices = (pc, cc) => revealChoices(pc, cc, gameController, gameID, accounts, currentHub, secretPhrase);
  const handleClaimPrize = () => { claimPrize(gameController, gameID, accounts, provider, playerScore); resetGame(); };
  const handleJoinNewGame = () => resetGame();

  /* ── Collapsed state with localStorage persistence ── */
  const [collapsed, setCollapsed] = useState({});
  const [mobileTab, setMobileTab] = useState("game");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hm-panels");
      if (saved) setCollapsed(JSON.parse(saved));
    } catch {}
  }, []);

  const togglePanel = (id) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("hm-panels", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  /* ── Render sections ── */
  const gameContent = (
    <div className="play-fade-in" key={currentHub}>
      {showLobby && (
        <Lobby
          accounts={accounts}
          gameController={gameController}
          show={true}
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
  );

  const statusContent = (
    <>
      {/* Round Progress */}
      <div className="status-block">
        <div className="status-block__label">Round Progress</div>
        <div className="play-round-dots">
          {[1, 2, 3, 4].map((r) => (
            <div
              key={r}
              className={`play-round-dot ${
                r === (roundIndex > 4 ? 4 : roundIndex)
                  ? roundIndex > 4 ? "play-round-dot--completed" : "play-round-dot--active"
                  : r < roundIndex
                  ? "play-round-dot--completed"
                  : ""
              }`}
            >
              <span className="play-round-dot__label">{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Game Info */}
      <div className="status-block">
        <div className="status-block__label">Game Info</div>
        <div className="status-row">
          <span className="status-row__key">Game ID</span>
          <span className="status-row__value">{gameID}</span>
        </div>
        <div className="status-row">
          <span className="status-row__key">Players</span>
          <span className="status-row__value">{playersInGame}</span>
        </div>
        <div className="status-row">
          <span className="status-row__key">Phase</span>
          <span className="status-row__value">{title}</span>
        </div>
      </div>

      {/* Secret Phrase */}
      {showSecretPhrase && (
        <div className="status-block">
          <SecretPhrase show={true} phrase={secretPhrase} setPhrase={setSecretPhrase} />
        </div>
      )}

      {/* Wallet */}
      <div className="status-block">
        <div className="status-block__label">Wallet</div>
        <ConnectWallet
          setProvider={setProvider}
          setAccounts={setAccounts}
          setConnectedWallet={setConnectedWallet}
          setChainId={setChainId}
        />
      </div>
    </>
  );

  const scoreContent = scoreRoundNum ? (
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
  ) : (
    <div className="panel-empty">
      <div className="panel-empty__icon">{ICON_SCORE}</div>
      <div className="panel-empty__text">Results will appear here after Round 1</div>
    </div>
  );

  /* Build round history for scores tab */
  const completedRounds = [];
  for (let r = 1; r <= 4; r++) {
    if (rounds[r].responseScores.some((s) => s !== "-")) {
      completedRounds.push(r);
    }
  }

  const historyContent = completedRounds.length > 0 ? (
    <div className="round-history">
      {completedRounds.map((r) => (
        <div key={r} className="round-history__item">
          <div className="round-history__round">Round {r}</div>
          <Score
            show={true}
            score={null}
            guess={rounds[r].submittedGuess}
            responseScores={rounds[r].responseScores}
            winningIndex={rounds[r].winningIndex}
            question={rounds[r].question}
            responses={rounds[r].responses}
            isMinority={rounds[r].isMinority}
          />
        </div>
      ))}
    </div>
  ) : (
    <div className="panel-empty">
      <div className="panel-empty__text">No completed rounds yet</div>
    </div>
  );

  /* ── Mobile tab definitions ── */
  const mobileTabs = [
    { id: "game", label: "Game", icon: ICON_GAME, content: gameContent },
    { id: "scores", label: "Scores", icon: ICON_SCORE, badge: scoreRoundNum ? playerScore : null, content: (
      <div className="mobile-scores-stack">
        {scoreContent}
        {completedRounds.length > 1 && (
          <>
            <div className="panel__divider" />
            <div className="panel__sub-header">Round History</div>
            {historyContent}
          </>
        )}
      </div>
    )},
    { id: "info", label: "Info", icon: ICON_STATUS, content: statusContent },
  ];

  return (
    <>
      <Head>
        <title>HJIVEMIND — Play</title>
        <meta name="description" content="Play HJIVEMIND, a fully on-chain multiplayer coordination game on Ethereum Sepolia." />
        <meta property="og:title" content="HJIVEMIND — Play" />
        <meta property="og:description" content="On-chain multiplayer coordination game. 4 rounds of majority/minority trivia." />
        <meta property="og:image" content="https://game.hjivemind.com/game.png" />
        <meta property="og:url" content="https://game.hjivemind.com/play" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="HJIVEMIND — Play" />
        <meta name="twitter:description" content="On-chain multiplayer coordination game." />
        <meta name="twitter:image" content="https://game.hjivemind.com/game.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <div className="hm-shell">
        {/* ── Top Bar (all sizes) ── */}
        <header className="hm-topbar">
          <div className="hm-topbar__brand">
            <img src="/logo.png" alt="HJIVEMIND" className="hm-topbar__logo" />
            <span className="hm-topbar__title">{settings.projectTitle}</span>
          </div>
          <div className="hm-topbar__phase">{title}</div>
          <div className="hm-topbar__wallet">
            <ConnectWallet
              setProvider={setProvider}
              setAccounts={setAccounts}
              setConnectedWallet={setConnectedWallet}
              setChainId={setChainId}
            />
          </div>
        </header>

        {/* ── Desktop Grid (md+) ── */}
        <div className="hm-grid">
          {/* Left sidebar - Status */}
          <Panel
            id="status"
            title="Status"
            icon={ICON_STATUS}
            collapsed={collapsed.status}
            onToggle={togglePanel}
            className="hm-grid__status"
          >
            {statusContent}
          </Panel>

          {/* Center - Game */}
          <Panel
            id="game"
            title={title}
            icon={ICON_GAME}
            badge={activeRound > 0 ? `${activeRound}/4` : null}
            collapsed={collapsed.game}
            onToggle={togglePanel}
            className="hm-grid__game"
          >
            {gameContent}
          </Panel>

          {/* Right sidebar - Scores */}
          <div className="hm-grid__scores">
            <PanelTabs
              activeTab={undefined}
              tabs={[
                {
                  id: "results",
                  label: "Results",
                  badge: scoreRoundNum ? playerScore : null,
                  content: (
                    <Panel id="results" title="Round Results" icon={ICON_SCORE} collapsed={collapsed.results} onToggle={togglePanel}>
                      {scoreContent}
                    </Panel>
                  ),
                },
                {
                  id: "history",
                  label: "History",
                  badge: completedRounds.length > 0 ? completedRounds.length : null,
                  content: (
                    <Panel id="history" title="Round History" collapsed={collapsed.history} onToggle={togglePanel}>
                      {historyContent}
                    </Panel>
                  ),
                },
              ]}
            />
          </div>
        </div>

        {/* ── Mobile Tabs (sm-) ── */}
        <div className="hm-mobile">
          <PanelTabs
            tabs={mobileTabs}
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            className="hm-mobile__tabs"
          />
        </div>
      </div>
    </>
  );
}

export default Dashboard;
