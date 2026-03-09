#!/usr/bin/env node
/**
 * Hivemind AI Agent Player
 *
 * Demonstrates a bot that plays Hivemind autonomously via the x402-gated REST API.
 * The bot pays USDC micropayments on Base Sepolia for each API call.
 *
 * Usage:
 *   node examples/agent-player.js
 *
 * Environment:
 *   HIVEMIND_API_URL  - Base URL (default: http://localhost:3000)
 *   AGENT_WALLET      - Agent's Ethereum wallet address
 *   AGENT_SECRET       - Secret phrase for answer hashing
 *
 * Prerequisites:
 *   - Hivemind app running (npm run dev in app/)
 *   - x402 facilitator accessible
 *   - Agent wallet has Base Sepolia USDC for x402 payments
 *   - Relayer wallet funded with Sepolia ETH for gas
 */

const { ethers } = require("ethers");

const API_URL = process.env.HIVEMIND_API_URL || "http://localhost:3000";
const AGENT_WALLET = process.env.AGENT_WALLET;
const AGENT_SECRET = process.env.AGENT_SECRET || "agent-secret-phrase-" + Date.now();

// Polling intervals
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_WAIT_TIME = 960000; // 16 minutes (slightly longer than round time limit)

async function apiCall(path, options = {}) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 402) {
    // In production, handle x402 payment flow here:
    // 1. Parse payment requirements from response
    // 2. Sign USDC payment on Base Sepolia
    // 3. Retry with X-PAYMENT header
    console.log(`  [x402] Payment required for ${path}`);
    const details = await response.json();
    console.log(`  [x402] Price: ${details.price || "unknown"}`);
    throw new Error("x402 payment required - implement payment signing for production use");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`API error ${response.status}: ${error.error || response.statusText}`);
  }

  return response.json();
}

async function pollUntil(fn, description, interval = POLL_INTERVAL, timeout = MAX_WAIT_TIME) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      console.log(`  Polling ${description}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for: ${description}`);
}

function pickAnswer(choices, isMinority) {
  // Simple strategy:
  // - Majority rounds: pick the first non-empty choice (most likely to be popular)
  // - Minority rounds: pick the last non-empty choice (least likely to be popular)
  const validChoices = choices.filter((c) => c !== "");
  if (validChoices.length === 0) return choices[0];

  if (isMinority) {
    return validChoices[validChoices.length - 1];
  }
  return validChoices[0];
}

function hashAnswers(questionAnswer, crowdAnswer, secretPhrase) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(
    ["string", "string", "string"],
    [questionAnswer, crowdAnswer, secretPhrase]
  );
  return ethers.keccak256(encoded);
}

async function playRound(gameId) {
  console.log(`\n--- Waiting for Question phase ---`);

  // Poll until we're in Question phase
  const questionData = await pollUntil(async () => {
    const status = await apiCall(`/api/game/${gameId}/status`);
    if (status.phase === "Question") {
      return await apiCall(`/api/game/${gameId}/question`);
    }
    if (status.phase === "winners") {
      return { done: true };
    }
    console.log(`  Phase: ${status.phase} (${status.currentRound})`);
    return null;
  }, "question phase");

  if (questionData.done) return false;

  console.log(`Round: ${questionData.round}`);
  console.log(`Question: ${questionData.question}`);
  console.log(`Choices: ${questionData.choices.join(", ")}`);
  console.log(`Minority round: ${questionData.isMinorityRound}`);

  // Pick answers
  const myAnswer = pickAnswer(questionData.choices, questionData.isMinorityRound);
  const crowdGuess = pickAnswer(questionData.choices, !questionData.isMinorityRound);
  console.log(`My answer: ${myAnswer}`);
  console.log(`Crowd guess: ${crowdGuess}`);

  // Hash and submit
  const hashedAnswer = hashAnswers(myAnswer, crowdGuess, AGENT_SECRET);
  console.log(`Submitting hashed answer...`);

  const submitResult = await apiCall(`/api/game/${gameId}/submit`, {
    method: "POST",
    body: JSON.stringify({
      walletAddress: AGENT_WALLET,
      hashedAnswer,
    }),
  });
  console.log(`Submitted: tx ${submitResult.txHash}`);

  // Wait for Reveal phase
  console.log(`Waiting for Reveal phase...`);
  await pollUntil(async () => {
    const status = await apiCall(`/api/game/${gameId}/status`);
    return status.phase === "Reveal" ? true : null;
  }, "reveal phase");

  // Reveal answers
  console.log(`Revealing answers...`);
  const revealResult = await apiCall(`/api/game/${gameId}/reveal`, {
    method: "POST",
    body: JSON.stringify({
      walletAddress: AGENT_WALLET,
      questionAnswer: myAnswer,
      crowdAnswer: crowdGuess,
      secretPhrase: AGENT_SECRET,
    }),
  });
  console.log(`Revealed: tx ${revealResult.txHash}`);

  return true;
}

async function main() {
  if (!AGENT_WALLET) {
    console.error("Error: Set AGENT_WALLET environment variable");
    process.exit(1);
  }

  console.log("=== Hivemind AI Agent Player ===");
  console.log(`Wallet: ${AGENT_WALLET}`);
  console.log(`API: ${API_URL}`);
  console.log();

  // Step 1: Join a game
  console.log("Step 1: Joining game...");
  const joinResult = await apiCall("/api/game/join", {
    method: "POST",
    body: JSON.stringify({ walletAddress: AGENT_WALLET }),
  });
  console.log(`Joined game ${joinResult.gameID} (tx: ${joinResult.txHash})`);

  const gameId = joinResult.gameID;

  // Step 2: Play 4 rounds
  for (let round = 1; round <= 4; round++) {
    console.log(`\n=== Round ${round} ===`);
    const continuePlaying = await playRound(gameId);
    if (!continuePlaying) {
      console.log("Game ended early");
      break;
    }
  }

  // Step 3: Wait for winners phase and check results
  console.log("\n=== Checking Results ===");
  await pollUntil(async () => {
    const status = await apiCall(`/api/game/${gameId}/status`);
    return status.phase === "winners" ? true : null;
  }, "winners phase");

  const leaderboard = await apiCall(`/api/game/${gameId}/leaderboard`);
  console.log("\nFinal Leaderboard:");
  for (const entry of leaderboard.leaderboard) {
    const marker = entry.address.toLowerCase() === AGENT_WALLET.toLowerCase() ? " <-- ME" : "";
    console.log(`  #${entry.rank} ${entry.address} - Score: ${entry.score}${marker}`);
  }

  // Step 4: Claim winnings if applicable
  const myEntry = leaderboard.leaderboard.find(
    (e) => e.address.toLowerCase() === AGENT_WALLET.toLowerCase()
  );

  if (myEntry && myEntry.rank <= 4 && !myEntry.paid) {
    console.log("\nClaiming winnings...");
    try {
      const claimResult = await apiCall(`/api/game/${gameId}/claim`, {
        method: "POST",
        body: JSON.stringify({ walletAddress: AGENT_WALLET }),
      });
      console.log(`Winnings claimed! Amount: ${claimResult.payoutAmount} wei (tx: ${claimResult.txHash})`);
    } catch (err) {
      console.log(`Could not claim: ${err.message}`);
    }
  } else {
    console.log("\nNo winnings to claim.");
  }

  console.log("\n=== Game Complete ===");
}

main().catch((err) => {
  console.error("Agent error:", err);
  process.exit(1);
});
