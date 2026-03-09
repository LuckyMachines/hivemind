// GET /api/game/[gameId]/status - Game phase and time remaining (x402-gated: $0.001)
const { getContracts, getRoundContract, ROUND_HUBS } = require("../../../../lib/contracts");

const PHASE_NAMES = ["Pregame", "Question", "Reveal", "Completed"];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;

  try {
    const contracts = getContracts();
    const gameID = BigInt(gameId);

    const latestRound = await contracts.scoreKeeper.latestRound(gameID);
    const playerCount = await contracts.lobby.playerCount(gameID);
    const prizePool = await contracts.scoreKeeper.prizePool(gameID);

    let phase = "lobby";
    let timeRemaining = null;
    let totalResponses = 0;
    let totalReveals = 0;

    if (latestRound && ROUND_HUBS[latestRound]) {
      const roundContract = getRoundContract(latestRound);
      const [phaseNum, roundStartTime, revealStartTime, roundTimeLimit, responses, reveals] =
        await Promise.all([
          roundContract.phase(gameID),
          roundContract.roundStartTime(gameID),
          roundContract.revealStartTime(gameID),
          roundContract.roundTimeLimit(),
          roundContract.totalResponses(gameID),
          roundContract.totalReveals(gameID),
        ]);

      phase = PHASE_NAMES[Number(phaseNum)] || "Unknown";
      totalResponses = Number(responses);
      totalReveals = Number(reveals);

      const now = BigInt(Math.floor(Date.now() / 1000));
      if (phaseNum === 1n) {
        // Question phase
        const deadline = roundStartTime + roundTimeLimit;
        timeRemaining = deadline > now ? Number(deadline - now) : 0;
      } else if (phaseNum === 2n) {
        // Reveal phase
        const deadline = revealStartTime + roundTimeLimit;
        timeRemaining = deadline > now ? Number(deadline - now) : 0;
      }
    } else if (latestRound === "hjivemind.winners" || latestRound === "") {
      phase = latestRound === "hjivemind.winners" ? "winners" : "lobby";
    }

    res.status(200).json({
      gameID: Number(gameID),
      currentRound: latestRound || "lobby",
      phase,
      timeRemaining,
      playerCount: Number(playerCount),
      prizePool: prizePool.toString(),
      totalResponses,
      totalReveals,
    });
  } catch (err) {
    console.error("Error fetching game status:", err);
    res.status(500).json({ error: "Failed to fetch game status" });
  }
}
