// GET /api/game/[gameId]/question - Current question + choices (x402-gated: $0.01)
const { getContracts } = require("../../../../lib/contracts");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;

  try {
    const contracts = getContracts();
    const gameID = BigInt(gameId);

    const latestRound = await contracts.scoreKeeper.latestRound(gameID);
    if (!latestRound || latestRound === "hjivemind.lobby" || latestRound === "hjivemind.winners") {
      return res.status(400).json({
        error: "Game is not in a question round",
        currentPhase: latestRound || "unknown",
      });
    }

    const { q: question, choices } = await contracts.gameController.getQuestion(latestRound, gameID);

    if (!question) {
      return res.status(400).json({ error: "Question not yet available" });
    }

    const isMinority = await contracts.gameController.getIsMinorityRound(latestRound, gameID);

    res.status(200).json({
      gameID: Number(gameID),
      round: latestRound,
      question,
      choices: Array.from(choices),
      isMinorityRound: isMinority,
    });
  } catch (err) {
    console.error("Error fetching question:", err);
    res.status(500).json({ error: "Failed to fetch question" });
  }
}
