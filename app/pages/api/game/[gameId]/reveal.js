// POST /api/game/[gameId]/reveal - Reveal answers (x402-gated: $0.01)
const { revealAnswersFor } = require("../../../../lib/relayer");
const { ethers } = require("ethers");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;
  const { walletAddress, questionAnswer, crowdAnswer, secretPhrase } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Valid walletAddress required" });
  }

  if (!questionAnswer || !crowdAnswer || !secretPhrase) {
    return res.status(400).json({
      error: "questionAnswer, crowdAnswer, and secretPhrase are all required",
    });
  }

  try {
    const result = await revealAnswersFor(
      BigInt(gameId),
      questionAnswer,
      crowdAnswer,
      secretPhrase,
      walletAddress
    );

    res.status(200).json({
      success: true,
      txHash: result.txHash,
      round: result.round,
      gameID: Number(gameId),
      player: walletAddress,
    });
  } catch (err) {
    console.error("Error revealing answers:", err);

    if (err.message.includes("not in reveal phase")) {
      return res.status(400).json({ error: "Game is not in reveal phase" });
    }
    if (err.message.includes("already revealed")) {
      return res.status(409).json({ error: "Player already revealed answers" });
    }
    if (err.message.includes("don't match")) {
      return res.status(400).json({ error: "Revealed answers don't match submitted hash" });
    }

    res.status(500).json({ error: "Failed to reveal answers: " + err.message });
  }
}
