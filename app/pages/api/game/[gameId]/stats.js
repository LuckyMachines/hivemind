// GET /api/game/[gameId]/stats - Game statistics (x402-gated: $0.001)
const { getContracts } = require("../../../../lib/contracts");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;

  try {
    const contracts = getContracts();
    const gameID = BigInt(gameId);

    const [playerCount, prizePool, latestRound] = await Promise.all([
      contracts.lobby.playerCount(gameID),
      contracts.scoreKeeper.prizePool(gameID),
      contracts.scoreKeeper.latestRound(gameID),
    ]);

    // Get scores for all players if we can get the railcar members
    let players = [];
    try {
      const railcarID = await contracts.lobby.railcarID(gameID);
      const members = await contracts.gameController.getRailcarMembers(railcarID);
      const scores = await Promise.all(
        members.map(async (addr) => {
          const score = await contracts.scoreKeeper.playerScore(gameID, addr);
          return { address: addr, score: Number(score) };
        })
      );
      players = scores;
    } catch {
      // Railcar may not exist yet
    }

    res.status(200).json({
      gameID: Number(gameID),
      playerCount: Number(playerCount),
      prizePool: prizePool.toString(),
      currentRound: latestRound || "lobby",
      players,
    });
  } catch (err) {
    console.error("Error fetching game stats:", err);
    res.status(500).json({ error: "Failed to fetch game stats" });
  }
}
