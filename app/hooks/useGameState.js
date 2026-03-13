import { useState, useCallback, useRef, useEffect } from "react";
import GameController from "../contracts/GameController.json";
import GameRound from "../contracts/GameRound.json";
import { getAddresses } from "../lib/chains";

const settings = require("../settings");

const HUB_ORDER = [
  "hjivemind.lobby",
  "hjivemind.round1",
  "hjivemind.round2",
  "hjivemind.round3",
  "hjivemind.round4",
  "hjivemind.winners"
];

function hubToRoundNumber(hub) {
  switch (hub) {
    case "hjivemind.round1": return 1;
    case "hjivemind.round2": return 2;
    case "hjivemind.round3": return 3;
    case "hjivemind.round4": return 4;
    default: return 0;
  }
}

function previousHub(hub) {
  const idx = HUB_ORDER.indexOf(hub);
  return idx > 0 ? HUB_ORDER[idx - 1] : null;
}

function hubIsNew(currentHub, testHub) {
  return HUB_ORDER.indexOf(testHub) > HUB_ORDER.indexOf(currentHub);
}

const EMPTY_ROUND = {
  question: "",
  responses: [],
  playerChoice: "",
  crowdChoice: "",
  button: "Submit Answers",
  inputLocked: false,
  submittedGuess: "",
  responseScores: ["-", "-", "-", "-"],
  winningIndex: [],
  isMinority: false
};

function makeInitialRounds() {
  return { 1: { ...EMPTY_ROUND }, 2: { ...EMPTY_ROUND }, 3: { ...EMPTY_ROUND }, 4: { ...EMPTY_ROUND } };
}

async function retryWithBackoff(fn, { maxRetries = 30, initialDelay = 1000, maxDelay = 10000 } = {}) {
  let delay = initialDelay;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result !== null && result !== undefined && result !== "") return result;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, maxDelay);
  }
  throw new Error("Max retries exceeded");
}

export default function useGameState(addToast) {
  const [provider, setProviderState] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [gameController, setGameController] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState("");
  const [secretPhrase, setSecretPhrase] = useState("");
  const [currentHub, setCurrentHub] = useState("hjivemind.lobby");
  const [gameID, setGameIDState] = useState("(Not in game)");
  const [playersInGame, setPlayersInGame] = useState("(Not in game)");
  const [playerScore, setPlayerScore] = useState("0");
  const [playerRank, setPlayerRank] = useState("?");
  const [rounds, setRounds] = useState(makeInitialRounds);
  const [lobbyButton, setLobbyButton] = useState("Join Game");
  const [chainId, setChainId] = useState(null);

  const mountedRef = useRef(true);
  const sfxRef = useRef({});

  useEffect(() => {
    sfxRef.current = {
      round1: new Audio("/sfx/round1.m4a"),
      round2: new Audio("/sfx/round2.m4a"),
      round3: new Audio("/sfx/round3.m4a"),
      round4: new Audio("/sfx/round4.m4a"),
      gameFinish: new Audio("/sfx/gameFinish.m4a")
    };
    Object.values(sfxRef.current).forEach((a) => a.load());
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const updateRound = useCallback((roundNum, updates) => {
    setRounds((prev) => ({
      ...prev,
      [roundNum]: { ...prev[roundNum], ...updates }
    }));
  }, []);

  // Provider / accounts — detect chain and use correct contract addresses
  const setProvider = useCallback(async (p) => {
    setProviderState(p);
    const detectedChainId = await window.ethereum.request({ method: "eth_chainId" });
    setChainId(detectedChainId);
    const addresses = getAddresses(detectedChainId);
    if (addresses && addresses.gameController) {
      const gc = new p.eth.Contract(GameController.abi, addresses.gameController);
      setGameController(gc);
    }
    p.eth.getAccounts().then(setAccounts);
  }, []);

  // Load questions for a round hub
  const loadQuestions = useCallback(async (gc, hubAlias, gID) => {
    const roundNum = hubToRoundNumber(hubAlias);
    if (!roundNum) return;
    try {
      const { q: question, choices } = await retryWithBackoff(async () => {
        const result = await gc.methods.getQuestion(hubAlias, gID).call();
        return result.q ? result : null;
      });

      let isMinority = false;
      try {
        isMinority = await gc.methods.getIsMinorityRound(hubAlias, gID).call();
      } catch (err) {
        console.log("Error fetching minority mode:", err.message);
      }

      updateRound(roundNum, { question, responses: choices, isMinority });
    } catch (err) {
      addToast("Failed to load question: " + err.message, { type: "error" });
    }
  }, [updateRound, addToast]);

  // Update player score for previous round
  const updatePlayerScoreForHub = useCallback(async (gc, hubAlias, gID, accts) => {
    if (hubAlias === "hjivemind.round1" || hubAlias === "hjivemind.lobby" || gID === "(Not in game)") return;

    const prevHub = previousHub(hubAlias);
    if (!prevHub || prevHub === "hjivemind.lobby") return;
    const prevRoundNum = hubToRoundNumber(prevHub);

    try {
      const totalPlayers = await gc.methods.getPlayerCount(gID).call();

      const responseScores = await retryWithBackoff(async () => {
        const rs = await gc.methods.getResponseScores(prevHub, gID).call();
        if (!rs) return null;
        const total = Number(rs[0]) + Number(rs[1]) + Number(rs[2]) + Number(rs[3]);
        return total >= Number(totalPlayers) ? rs : null;
      });

      const score = await retryWithBackoff(() =>
        gc.methods.getScore(gID, accts[0]).call()
      );
      setPlayerScore(score);

      const winningIndex = await retryWithBackoff(() =>
        gc.methods.getWinningIndex(prevHub, gID).call()
      );

      const guess = await retryWithBackoff(() =>
        gc.methods.getPlayerGuess(prevHub, gID, accts[0]).call()
      );

      updateRound(prevRoundNum, {
        submittedGuess: guess,
        responseScores,
        winningIndex
      });

      if (hubAlias === "hjivemind.winners") {
        const rank = await retryWithBackoff(() =>
          gc.methods.getFinalRanking(gID, accts[0]).call()
        );
        setPlayerRank(rank);
      }
    } catch (err) {
      addToast("Failed to load round results: " + err.message, { type: "error" });
    }
  }, [updateRound, addToast]);

  // Show a specific hub
  const showHub = useCallback(async (hubAlias, gc, gID, accts) => {
    if (hubAlias === currentHub) return;

    if (hubAlias !== "hjivemind.winners" && hubAlias !== "hjivemind.lobby") {
      await loadQuestions(gc, hubAlias, gID);
    }
    if (hubAlias !== "hjivemind.lobby" && hubAlias !== "hjivemind.round1") {
      await updatePlayerScoreForHub(gc, hubAlias, gID, accts);
    }

    setCurrentHub(hubAlias);

    // Play SFX
    const roundNum = hubToRoundNumber(hubAlias);
    if (roundNum > 0 && sfxRef.current[`round${roundNum}`]) {
      sfxRef.current[`round${roundNum}`].play().catch(() => {});
    } else if (hubAlias === "hjivemind.winners" && sfxRef.current.gameFinish) {
      sfxRef.current.gameFinish.play().catch(() => {});
    }

    // Unlock input for the new round
    if (roundNum > 0) {
      updateRound(roundNum, { inputLocked: false });
    }
  }, [currentHub, loadQuestions, updatePlayerScoreForHub, updateRound]);

  // Event handlers
  const roundStarted = useCallback((hubAlias, gID, groupID, startTime, gc, accts, curHub, curGID) => {
    if (gID == curGID && hubIsNew(curHub, hubAlias)) {
      showHub(hubAlias, gc, curGID, accts);
    }
  }, [showHub]);

  const revealStarted = useCallback((hubAlias, gID, groupID, startTime, gc, accts, curHub, curGID) => {
    if (gID != curGID) return;
    const roundNum = hubToRoundNumber(hubAlias);
    if (roundNum > 0) {
      updateRound(roundNum, { button: "Reveal Answers", inputLocked: false });
    }
    if (curHub !== hubAlias && curHub === "hjivemind.lobby") {
      showHub(hubAlias, gc, curGID, accts);
    }
  }, [showHub, updateRound]);

  const roundEnded = useCallback((hubAlias, gID, groupID, startTime, curGID) => {
    if (gID == curGID) {
      console.log(`Round End: ${hubAlias}, ${startTime}, ${gID}, ${groupID}`);
    }
  }, []);

  const enterWinners = useCallback((gID, groupID, startTime, gc, accts) => {
    showHub("hjivemind.winners", gc, gID, accts);
  }, [showHub]);

  // Set game ID and subscribe to events
  const setGameID = useCallback(async (id, gc, p, accts) => {
    setGameIDState(id);
    try {
      const currentRound = await gc.methods.getLatestRound(id).call();
      if (currentRound) {
        await showHub(currentRound, gc, id, accts);
      }
    } catch (err) {
      console.log("Error loading railcar:", err.message);
    }

    p.eth.clearSubscriptions();
    const options = { filter: { gameID: [id] }, fromBlock: 0 };

    gc.events.RoundStart(options).on("data", (event) => {
      const rv = event.returnValues;
      // Use refs/latest state via functional updates
      setCurrentHub((curHub) => {
        setGameIDState((curGID) => {
          roundStarted(rv.hubAlias, rv.gameID, rv.groupID, rv.startTime, gc, accts, curHub, curGID);
          return curGID;
        });
        return curHub;
      });
    });

    gc.events.RevealStart(options).on("data", (event) => {
      const rv = event.returnValues;
      setCurrentHub((curHub) => {
        setGameIDState((curGID) => {
          revealStarted(rv.hubAlias, rv.gameID, rv.groupID, rv.startTime, gc, accts, curHub, curGID);
          return curGID;
        });
        return curHub;
      });
    });

    gc.events.RoundEnd(options).on("data", (event) => {
      const rv = event.returnValues;
      setGameIDState((curGID) => {
        roundEnded(rv.hubAlias, rv.gameID, rv.groupID, rv.startTime, curGID);
        return curGID;
      });
    });

    gc.events.EnterWinners(options).on("data", (event) => {
      const rv = event.returnValues;
      enterWinners(rv.gameID, rv.groupID, rv.startTime, gc, accts);
    });
  }, [showHub, roundStarted, revealStarted, roundEnded, enterWinners]);

  // Submit choices
  const submitChoices = useCallback(async (hashedChoices, gc, gID, accts, curHub) => {
    try {
      const tx = await gc.methods
        .submitAnswers(hashedChoices, gID, curHub)
        .send({ from: accts[0] });
      addToast(`Answers submitted. Gas: ${tx.gasUsed}`, { type: "success" });
    } catch (err) {
      addToast("Error submitting: " + err.message, { type: "error" });
      return;
    }
    const roundNum = hubToRoundNumber(curHub);
    if (roundNum > 0) {
      updateRound(roundNum, { button: "Waiting for all players to answer", inputLocked: true });
    }
  }, [updateRound, addToast]);

  // Reveal choices
  const revealChoices = useCallback(async (playerChoice, crowdChoice, gc, gID, accts, curHub, phrase) => {
    try {
      const tx = await gc.methods
        .revealAnswers(playerChoice, crowdChoice, phrase, gID, curHub)
        .send({ from: accts[0] });
      addToast(`Answers revealed. Gas: ${tx.gasUsed}`, { type: "success" });
      const roundNum = hubToRoundNumber(curHub);
      if (roundNum > 0) {
        updateRound(roundNum, { button: "Waiting for all players to reveal" });
      }
    } catch (err) {
      addToast("Error revealing: " + err.message, { type: "error" });
    }
  }, [updateRound, addToast]);

  // Claim prize
  const claimPrize = useCallback(async (gc, gID, accts, p, score) => {
    try {
      const payoutAmount = await gc.methods.checkPayout(accts[0]).call();
      if (Number(payoutAmount) > 0) {
        await gc.methods.claimPrize(gID, score).send({ from: accts[0] });
        addToast("Prize claimed!", { type: "success" });
      } else {
        addToast("No payout available for this game.", { type: "warning" });
      }
    } catch (err) {
      addToast("Error claiming prize: " + err.message, { type: "error" });
    }
  }, [addToast]);

  // Reset game
  const resetGame = useCallback(() => {
    setSecretPhrase("");
    setCurrentHub("hjivemind.lobby");
    setGameIDState("(Not in game)");
    setPlayersInGame("(Not in game)");
    setPlayerScore("0");
    setPlayerRank("?");
    setRounds(makeInitialRounds());
    setLobbyButton("Join Game");
  }, []);

  // Player/crowd choice setters
  const setPlayerChoice = useCallback((choice, curHub) => {
    const roundNum = hubToRoundNumber(curHub);
    if (roundNum > 0) updateRound(roundNum, { playerChoice: choice });
  }, [updateRound]);

  const setCrowdChoice = useCallback((choice, curHub) => {
    const roundNum = hubToRoundNumber(curHub);
    if (roundNum > 0) updateRound(roundNum, { crowdChoice: choice });
  }, [updateRound]);

  // Derived state
  const roundIndex = hubToRoundNumber(currentHub) || (currentHub === "hjivemind.winners" ? 5 : 0);
  const showLobby = currentHub === "hjivemind.lobby";
  const showWinners = currentHub === "hjivemind.winners";
  const showSecretPhrase = !showLobby && !showWinners;
  const activeRound = hubToRoundNumber(currentHub);

  // Title
  let title = "Lobby";
  if (activeRound > 0) title = `Round ${activeRound}`;
  else if (showWinners) title = "Game Results";

  // Which previous round's score to show
  let scoreRoundNum = null;
  if (activeRound >= 2) scoreRoundNum = activeRound - 1;
  else if (showWinners) scoreRoundNum = 4;

  return {
    provider, setProvider,
    accounts, setAccounts,
    gameController,
    connectedWallet, setConnectedWallet,
    secretPhrase, setSecretPhrase,
    currentHub, setCurrentHub,
    gameID, setGameID,
    playersInGame, setPlayersInGame,
    playerScore, playerRank,
    rounds, updateRound,
    lobbyButton, setLobbyButton,
    showHub,
    submitChoices, revealChoices,
    chainId, setChainId,
    claimPrize, resetGame,
    setPlayerChoice, setCrowdChoice,
    // Derived
    roundIndex, showLobby, showWinners, showSecretPhrase,
    activeRound, title, scoreRoundNum
  };
}
