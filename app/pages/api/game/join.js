// POST /api/game/join - Join game via x402 USDC payment (x402-gated: $0.05)
// Flow: Player pays USDC on Base Sepolia via x402 → relayer calls joinGameFor() with ETH on Sepolia
const { joinGameFor } = require("../../../lib/relayer");
const { ethers } = require("ethers");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { walletAddress } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Valid walletAddress required" });
  }

  try {
    const result = await joinGameFor(walletAddress);

    res.status(200).json({
      success: true,
      gameID: result.gameID,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      player: walletAddress,
    });
  } catch (err) {
    console.error("Error joining game for player:", err);

    if (err.message.includes("player already in game")) {
      return res.status(409).json({ error: "Player already in an active game" });
    }
    if (err.message.includes("RELAYER_PRIVATE_KEY")) {
      return res.status(503).json({ error: "Relayer not configured" });
    }

    res.status(500).json({ error: "Failed to join game: " + err.message });
  }
}
