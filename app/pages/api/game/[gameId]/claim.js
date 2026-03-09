// POST /api/game/[gameId]/claim - Claim winnings (x402-gated: $0.001)
const { claimWinningsFor } = require("../../../../lib/relayer");
const { getContracts } = require("../../../../lib/contracts");
const { ethers } = require("ethers");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.query;
  const { walletAddress } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Valid walletAddress required" });
  }

  try {
    const contracts = getContracts();
    const gameID = BigInt(gameId);

    // Get player's score to pass to claimWinnings
    const finalScore = await contracts.scoreKeeper.playerScore(gameID, walletAddress);
    if (finalScore === 0n) {
      return res.status(400).json({ error: "Player has no score for this game" });
    }

    // Check if already paid
    const alreadyPaid = await contracts.winners.playerPaid(gameID, walletAddress);
    if (alreadyPaid) {
      return res.status(409).json({ error: "Player already claimed winnings for this game" });
    }

    // Check payout amount
    const payoutAmount = await contracts.winners.getPayoutAmount(gameID, finalScore);
    if (payoutAmount === 0n) {
      return res.status(400).json({ error: "No payout available for this score" });
    }

    const result = await claimWinningsFor(gameID, finalScore, walletAddress);

    res.status(200).json({
      success: true,
      txHash: result.txHash,
      gameID: Number(gameID),
      player: walletAddress,
      payoutAmount: payoutAmount.toString(),
    });
  } catch (err) {
    console.error("Error claiming winnings:", err);

    if (err.message.includes("already paid")) {
      return res.status(409).json({ error: "Player already claimed winnings" });
    }

    res.status(500).json({ error: "Failed to claim winnings: " + err.message });
  }
}
