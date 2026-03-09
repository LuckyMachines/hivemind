// GET /api/game/[gameId]/leaderboard - Final rankings (x402-gated: $0.005)
const { getContracts } = require("../../../../lib/contracts");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;

  try {
    const contracts = getContracts();
    const gameID = BigInt(gameId);

    const hasWinnings = await contracts.winners.gameHasWinnings(gameID);

    // Get all players and their scores/ranks
    const railcarID = await contracts.lobby.railcarID(gameID);
    let members;
    try {
      members = await contracts.gameController.getRailcarMembers(railcarID);
    } catch {
      return res.status(404).json({ error: "Game not found or no players" });
    }

    const leaderboard = await Promise.all(
      members.map(async (addr) => {
        const [score, rank, paid] = await Promise.all([
          contracts.scoreKeeper.playerScore(gameID, addr),
          contracts.winners.getFinalRank(gameID, addr).catch(() => BigInt(0)),
          contracts.winners.playerPaid(gameID, addr).catch(() => false),
        ]);
        return {
          address: addr,
          score: Number(score),
          rank: Number(rank),
          paid,
        };
      })
    );

    leaderboard.sort((a, b) => a.rank - b.rank);

    const prizePool = await contracts.scoreKeeper.prizePool(gameID);

    res.status(200).json({
      gameID: Number(gameID),
      prizePool: prizePool.toString(),
      hasWinnings,
      leaderboard,
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}
