// GET /api/game/active - List active games (x402-gated: $0.001)
const { getContracts } = require("../../../lib/contracts");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const contracts = getContracts();
    const currentGameID = await contracts.lobby.currentGame();
    const canStart = await contracts.lobby.canStart();
    const entryFee = await contracts.lobby.entryFee();
    const playerLimit = await contracts.lobby.playerLimit();

    const games = [];
    const id = Number(currentGameID);

    if (id > 0) {
      const playerCount = await contracts.lobby.playerCount(currentGameID);
      const prizePool = await contracts.scoreKeeper.prizePool(currentGameID);
      const latestRound = await contracts.scoreKeeper.latestRound(currentGameID);
      const inActiveGame = Number(playerCount) > 0;

      if (inActiveGame) {
        games.push({
          gameID: id,
          playerCount: Number(playerCount),
          prizePool: prizePool.toString(),
          currentRound: latestRound || "lobby",
          canStart,
          entryFee: entryFee.toString(),
          playerLimit: Number(playerLimit),
        });
      }
    }

    res.status(200).json({
      games,
      currentGameID: id,
      entryFee: entryFee.toString(),
      playerLimit: Number(playerLimit),
    });
  } catch (err) {
    console.error("Error fetching active games:", err);
    res.status(500).json({ error: "Failed to fetch active games" });
  }
}
