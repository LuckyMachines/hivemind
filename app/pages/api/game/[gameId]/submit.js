// POST /api/game/[gameId]/submit - Submit hashed answers (x402-gated: $0.01)
const { submitAnswersFor } = require("../../../../lib/relayer");
const { ethers } = require("ethers");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;
  const { walletAddress, hashedAnswer } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Valid walletAddress required" });
  }

  if (!hashedAnswer || !hashedAnswer.startsWith("0x") || hashedAnswer.length !== 66) {
    return res.status(400).json({
      error: "Valid hashedAnswer required (bytes32 hex string)",
      hint: "Hash your answers: keccak256(abi.encode(questionAnswer, crowdAnswer, secretPhrase))",
    });
  }

  try {
    const result = await submitAnswersFor(BigInt(gameId), hashedAnswer, walletAddress);

    res.status(200).json({
      success: true,
      txHash: result.txHash,
      round: result.round,
      gameID: Number(gameId),
      player: walletAddress,
    });
  } catch (err) {
    console.error("Error submitting answers:", err);

    if (err.message.includes("not in this hub")) {
      return res.status(403).json({ error: "Player is not in the current round" });
    }
    if (err.message.includes("not in question phase")) {
      return res.status(400).json({ error: "Game is not in question phase" });
    }

    res.status(500).json({ error: "Failed to submit answers: " + err.message });
  }
}
