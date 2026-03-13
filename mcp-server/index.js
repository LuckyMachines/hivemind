#!/usr/bin/env node
// HJIVEMIND MCP Server
// Free read tools (direct chain queries) + x402-gated write tools (paid via USDC)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ethers } from "ethers";

// ── Config ──
const API_BASE = process.env.HJIVEMIND_API_URL || "https://game.hjivemind.com";
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

// ── Contract addresses (Sepolia) ──
const ADDRESSES = {
  lobby: "0x735Af89C1bB8908461575626F2927016d1f5f772",
  gameController: "0xE250FE77adb0181926b8367f2e3cEf92ffe3141f",
  scoreKeeper: "0xA3F5A9B26Af99a3503F50A4039C2494c5692e4e3",
  winners: "0xb5eC1508065aE915705194b3895854BB89083e86",
  round1: "0x4B013455400a2E3Cf36Db767Fe14D1040759EF12",
  round2: "0x67bc655564EfBb0a292283a562c9232348eF7F37",
  round3: "0xc188d7a8bC093936ba51c71d35805eb0B0532ACF",
  round4: "0x7876F19c8786835B36b1C6fFC2ebdD3861e687d0",
};

const ROUND_HUBS = {
  "hjivemind.round1": ADDRESSES.round1,
  "hjivemind.round2": ADDRESSES.round2,
  "hjivemind.round3": ADDRESSES.round3,
  "hjivemind.round4": ADDRESSES.round4,
};

// ── ABIs (minimal) ──
const LobbyABI = [
  "function currentGame() view returns (uint256)",
  "function playerCount(uint256 gameID) view returns (uint256)",
  "function canStart() view returns (bool)",
  "function playerLimit() view returns (uint256)",
  "function timeLimitToJoin() view returns (uint256)",
  "function railcarID(uint256 gameID) view returns (uint256)",
];
const GameControllerABI = [
  "function getQuestion(string hubAlias, uint256 gameID) view returns (string q, string[4] choices)",
  "function getIsMinorityRound(string hubAlias, uint256 gameID) view returns (bool)",
  "function getScore(uint256 gameID, address playerAddress) view returns (uint256)",
  "function getPlayerCount(uint256 gameID) view returns (uint256)",
  "function getIsInActiveGame(address playerAddress) view returns (bool)",
  "function getCurrentGame(address playerAddress) view returns (uint256)",
  "function getResponseScores(string hubAlias, uint256 gameID) view returns (uint256[4])",
  "function getWinningIndex(string hubAlias, uint256 gameID) view returns (uint256[])",
  "function getFinalRanking(uint256 gameID, address playerAddress) view returns (uint256)",
  "function getRailcarMembers(uint256 railcarID) view returns (address[])",
  "function checkPayout(address playerAddress) view returns (uint256)",
];
const ScoreKeeperABI = [
  "function playerScore(uint256 gameID, address playerAddress) view returns (uint256)",
  "function prizePool(uint256 gameID) view returns (uint256)",
  "function latestRound(uint256 gameID) view returns (string)",
];
const WinnersABI = [
  "function getFinalRank(uint256 gameID, address playerAddress) view returns (uint256)",
  "function getPayoutAmount(uint256 gameID, uint256 finalScore) view returns (uint256)",
  "function gameHasWinnings(uint256 gameID) view returns (bool)",
  "function playerPaid(uint256 gameID, address playerAddress) view returns (bool)",
];
const GameRoundABI = [
  "function phase(uint256 gameID) view returns (uint8)",
  "function roundStartTime(uint256 gameID) view returns (uint256)",
  "function revealStartTime(uint256 gameID) view returns (uint256)",
  "function roundTimeLimit() view returns (uint256)",
  "function totalResponses(uint256 gameID) view returns (uint256)",
  "function totalReveals(uint256 gameID) view returns (uint256)",
];

// ── Provider + contracts ──
const provider = new ethers.JsonRpcProvider(RPC_URL);
const lobby = new ethers.Contract(ADDRESSES.lobby, LobbyABI, provider);
const gc = new ethers.Contract(ADDRESSES.gameController, GameControllerABI, provider);
const sk = new ethers.Contract(ADDRESSES.scoreKeeper, ScoreKeeperABI, provider);
const winners = new ethers.Contract(ADDRESSES.winners, WinnersABI, provider);

function getRoundContract(hubAlias) {
  const addr = ROUND_HUBS[hubAlias];
  if (!addr) return null;
  return new ethers.Contract(addr, GameRoundABI, provider);
}

const PHASE_NAMES = ["Pregame", "Question", "Reveal", "Completed"];

// ── x402 API helper ──
async function x402Call(path, method, body, paymentHeader) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (paymentHeader) {
    opts.headers["X-PAYMENT"] = paymentHeader;
  }
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 402) {
    const requirements = res.headers.get("X-PAYMENT-REQUIREMENTS");
    let accepts;
    try {
      const data = await res.json();
      accepts = data.accepts;
    } catch {}
    return {
      paymentRequired: true,
      status: 402,
      message: "x402 payment required. Sign a USDC transfer on Base Sepolia and retry with the X-PAYMENT header.",
      requirements: requirements || undefined,
      accepts,
    };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  return await res.json();
}

// ── MCP Server ──
const server = new McpServer({
  name: "hjivemind",
  version: "1.0.0",
});

// ════════════════════════════════════════════════════════
// FREE READ TOOLS — direct chain queries, zero cost
// ════════════════════════════════════════════════════════

server.tool(
  "get_active_games",
  "List active games with player count, prize pool, and current round. Free — reads directly from Sepolia.",
  {},
  async () => {
    const currentGameID = await lobby.currentGame();
    const id = Number(currentGameID);

    if (id === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ games: [], message: "No active games. Join to create game #1." }, null, 2) }] };
    }

    const [playerCount, prizePool, latestRound, canStart, playerLimit] = await Promise.all([
      lobby.playerCount(currentGameID),
      sk.prizePool(currentGameID),
      sk.latestRound(currentGameID),
      lobby.canStart(),
      lobby.playerLimit(),
    ]);

    const game = {
      gameID: id,
      playerCount: Number(playerCount),
      playerLimit: Number(playerLimit),
      prizePool: ethers.formatEther(prizePool) + " ETH",
      currentRound: latestRound || "lobby",
      canStart,
    };

    return { content: [{ type: "text", text: JSON.stringify({ games: [game] }, null, 2) }] };
  }
);

server.tool(
  "get_game_status",
  "Get detailed game status: phase, round, time remaining, response counts. Free.",
  { gameID: z.number().int().positive().describe("The game ID to check") },
  async ({ gameID }) => {
    const gid = BigInt(gameID);
    const [latestRound, playerCount, prizePool] = await Promise.all([
      sk.latestRound(gid),
      lobby.playerCount(gid),
      sk.prizePool(gid),
    ]);

    let phase = "lobby";
    let timeRemaining = null;
    let totalResponses = 0;
    let totalReveals = 0;

    if (latestRound && ROUND_HUBS[latestRound]) {
      const rc = getRoundContract(latestRound);
      const [phaseNum, roundStartTime, revealStartTime, roundTimeLimit, responses, reveals] =
        await Promise.all([
          rc.phase(gid), rc.roundStartTime(gid), rc.revealStartTime(gid),
          rc.roundTimeLimit(), rc.totalResponses(gid), rc.totalReveals(gid),
        ]);

      phase = PHASE_NAMES[Number(phaseNum)] || "Unknown";
      totalResponses = Number(responses);
      totalReveals = Number(reveals);

      const now = BigInt(Math.floor(Date.now() / 1000));
      if (phaseNum === 1n) {
        const deadline = roundStartTime + roundTimeLimit;
        timeRemaining = deadline > now ? Number(deadline - now) : 0;
      } else if (phaseNum === 2n) {
        const deadline = revealStartTime + roundTimeLimit;
        timeRemaining = deadline > now ? Number(deadline - now) : 0;
      }
    } else if (latestRound === "hjivemind.winners") {
      phase = "winners";
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          gameID, currentRound: latestRound || "lobby", phase, timeRemaining,
          playerCount: Number(playerCount), prizePool: ethers.formatEther(prizePool) + " ETH",
          totalResponses, totalReveals,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_question",
  "Get the current question and choices for a game. Free.",
  { gameID: z.number().int().positive().describe("The game ID") },
  async ({ gameID }) => {
    const gid = BigInt(gameID);
    const latestRound = await sk.latestRound(gid);

    if (!latestRound || !ROUND_HUBS[latestRound]) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Game is not in a question round", currentRound: latestRound || "lobby" }) }] };
    }

    const [{ q: question, choices }, isMinority] = await Promise.all([
      gc.getQuestion(latestRound, gid),
      gc.getIsMinorityRound(latestRound, gid),
    ]);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          gameID, round: latestRound, question,
          choices: Array.from(choices),
          isMinorityRound: isMinority,
          hint: isMinority
            ? "MINORITY ROUND: Pick the LEAST popular answer to score points."
            : "MAJORITY ROUND: Pick the MOST popular answer to score points.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_player_status",
  "Check a player's game status: active game, score, rank. Free.",
  { walletAddress: z.string().describe("Player's Ethereum wallet address") },
  async ({ walletAddress }) => {
    if (!ethers.isAddress(walletAddress)) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Invalid wallet address" }) }] };
    }

    const inGame = await gc.getIsInActiveGame(walletAddress);
    if (!inGame) {
      return { content: [{ type: "text", text: JSON.stringify({ walletAddress, inActiveGame: false, message: "Player is not in an active game." }) }] };
    }

    const currentGame = await gc.getCurrentGame(walletAddress);
    const gid = BigInt(currentGame);
    const [score, latestRound] = await Promise.all([
      sk.playerScore(gid, walletAddress),
      sk.latestRound(gid),
    ]);

    let rank = 0;
    if (latestRound === "hjivemind.winners" || latestRound === "") {
      try { rank = Number(await gc.getFinalRanking(gid, walletAddress)); } catch {}
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          walletAddress, inActiveGame: true, gameID: Number(currentGame),
          score: Number(score), rank: rank || "in progress",
          currentRound: latestRound || "lobby",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_leaderboard",
  "Get the leaderboard for a completed game. Free.",
  { gameID: z.number().int().positive().describe("The game ID") },
  async ({ gameID }) => {
    const gid = BigInt(gameID);

    let hasWinnings;
    try {
      hasWinnings = await winners.gameHasWinnings(gid);
    } catch {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Game not found or not complete" }) }] };
    }

    const railcarID = await lobby.railcarID(gid);
    let members;
    try {
      members = await gc.getRailcarMembers(railcarID);
    } catch {
      return { content: [{ type: "text", text: JSON.stringify({ error: "No players found for this game" }) }] };
    }

    const leaderboard = await Promise.all(
      members.map(async (addr) => {
        const [score, rank, paid] = await Promise.all([
          sk.playerScore(gid, addr),
          winners.getFinalRank(gid, addr).catch(() => 0n),
          winners.playerPaid(gid, addr).catch(() => false),
        ]);
        return { address: addr, score: Number(score), rank: Number(rank), paid };
      })
    );
    leaderboard.sort((a, b) => a.rank - b.rank);

    const prizePool = await sk.prizePool(gid);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          gameID, prizePool: ethers.formatEther(prizePool) + " ETH",
          hasWinnings, leaderboard,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_round_results",
  "Get results for a specific round: response distribution, winning answer. Free.",
  {
    gameID: z.number().int().positive().describe("The game ID"),
    round: z.number().int().min(1).max(4).describe("Round number (1-4)"),
  },
  async ({ gameID, round }) => {
    const gid = BigInt(gameID);
    const hubAlias = `hjivemind.round${round}`;

    try {
      const [responseScores, winningIndex, isMinority] = await Promise.all([
        gc.getResponseScores(hubAlias, gid),
        gc.getWinningIndex(hubAlias, gid),
        gc.getIsMinorityRound(hubAlias, gid),
      ]);

      const scores = Array.from(responseScores).map(Number);
      const total = scores.reduce((a, b) => a + b, 0);

      let question, choices;
      try {
        const q = await gc.getQuestion(hubAlias, gid);
        question = q.q;
        choices = Array.from(q.choices);
      } catch {}

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            gameID, round, hubAlias, isMinorityRound: isMinority,
            question, choices,
            responseScores: scores,
            responsePercentages: scores.map((s) => total > 0 ? Math.round((s / total) * 100) + "%" : "0%"),
            winningChoiceIndices: Array.from(winningIndex).map(Number),
            totalResponses: total,
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Round data not available", round, message: e.message }) }] };
    }
  }
);

server.tool(
  "get_pricing",
  "Get current x402 pricing. Prices scale dynamically with ETH/USD. Free.",
  {},
  async () => {
    try {
      const res = await fetch(`${API_BASE}/api/x402/pricing`);
      if (!res.ok) throw new Error(`${res.status}`);
      const pricing = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(pricing, null, 2) }] };
    } catch (e) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Could not fetch pricing",
            message: e.message,
            hint: "Pricing endpoint may not be deployed yet. Default prices: operational=$0.05, analysis=$0.01",
          }, null, 2),
        }],
      };
    }
  }
);

// ════════════════════════════════════════════════════════
// x402-GATED WRITE TOOLS — paid via USDC on Base Sepolia
// ════════════════════════════════════════════════════════

server.tool(
  "join_game",
  "Join the current game. Paid via x402 USDC on Base Sepolia (operational tier, dynamically priced). The relayer pays the ETH entry fee on Sepolia on your behalf. Call get_pricing to see current rates.",
  {
    walletAddress: z.string().describe("Your Ethereum wallet address"),
    paymentHeader: z.string().optional().describe("x402 payment proof (X-PAYMENT header value). Omit to get payment requirements."),
  },
  async ({ walletAddress, paymentHeader }) => {
    if (!ethers.isAddress(walletAddress)) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Invalid wallet address" }) }] };
    }

    const result = await x402Call("/api/game/join", "POST", { walletAddress }, paymentHeader);

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "submit_answers",
  "Submit hashed answers for the current round. Paid via x402 USDC (operational tier). You must hash your answers: keccak256(abi.encode(questionAnswer, crowdAnswer, secretPhrase)).",
  {
    gameID: z.number().int().positive().describe("The game ID"),
    walletAddress: z.string().describe("Your Ethereum wallet address"),
    hashedAnswer: z.string().describe("keccak256 hash of abi.encode(questionAnswer, crowdAnswer, secretPhrase) — 66-char hex string starting with 0x"),
    paymentHeader: z.string().optional().describe("x402 payment proof. Omit to get payment requirements."),
  },
  async ({ gameID, walletAddress, hashedAnswer, paymentHeader }) => {
    if (!ethers.isAddress(walletAddress)) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Invalid wallet address" }) }] };
    }

    const result = await x402Call(
      `/api/game/${gameID}/submit`, "POST",
      { walletAddress, hashedAnswer },
      paymentHeader
    );

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "reveal_answers",
  "Reveal your answers for the current round. Paid via x402 USDC (operational tier). Must match the hash you submitted.",
  {
    gameID: z.number().int().positive().describe("The game ID"),
    walletAddress: z.string().describe("Your Ethereum wallet address"),
    questionAnswer: z.string().describe("Your answer to the question (must match what you submitted)"),
    crowdAnswer: z.string().describe("Your crowd prediction (must match what you submitted)"),
    secretPhrase: z.string().describe("Your secret phrase (must match what you submitted)"),
    paymentHeader: z.string().optional().describe("x402 payment proof. Omit to get payment requirements."),
  },
  async ({ gameID, walletAddress, questionAnswer, crowdAnswer, secretPhrase, paymentHeader }) => {
    if (!ethers.isAddress(walletAddress)) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Invalid wallet address" }) }] };
    }

    const result = await x402Call(
      `/api/game/${gameID}/reveal`, "POST",
      { walletAddress, questionAnswer, crowdAnswer, secretPhrase },
      paymentHeader
    );

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "claim_prize",
  "Claim your winnings after a game ends. Paid via x402 USDC (analysis tier). Only works if you ranked in the top 4.",
  {
    gameID: z.number().int().positive().describe("The game ID"),
    walletAddress: z.string().describe("Your Ethereum wallet address"),
    paymentHeader: z.string().optional().describe("x402 payment proof. Omit to get payment requirements."),
  },
  async ({ gameID, walletAddress, paymentHeader }) => {
    if (!ethers.isAddress(walletAddress)) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Invalid wallet address" }) }] };
    }

    const result = await x402Call(
      `/api/game/${gameID}/claim`, "POST",
      { walletAddress },
      paymentHeader
    );

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Utility tool for hashing answers ──
server.tool(
  "hash_answers",
  "Hash your answers for submission. Use this before submit_answers. Free — computed locally.",
  {
    questionAnswer: z.string().describe("Your answer to the question"),
    crowdAnswer: z.string().describe("Your crowd prediction"),
    secretPhrase: z.string().describe("Your secret phrase"),
  },
  async ({ questionAnswer, crowdAnswer, secretPhrase }) => {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["string", "string", "string"],
      [questionAnswer, crowdAnswer, secretPhrase]
    );
    const hashed = ethers.keccak256(encoded);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          hashedAnswer: hashed,
          inputs: { questionAnswer, crowdAnswer, secretPhrase },
          hint: "Use this hashedAnswer with the submit_answers tool.",
        }, null, 2),
      }],
    };
  }
);

// ── Start ──
const transport = new StdioServerTransport();
await server.connect(transport);
