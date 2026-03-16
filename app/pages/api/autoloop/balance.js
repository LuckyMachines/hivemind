// GET /api/autoloop/balance?chainId=0xaa36a7
// Returns the keeper's AutoLoop balance and registration status
const { ethers } = require("ethers");
const { getChainConfig, getAutoLoopConfig } = require("../../../lib/chains");

const AutoLoopABI = [
  "function balance(address) view returns (uint256)",
];

const RegistryABI = [
  "function isRegisteredAutoLoop(address) view returns (bool)",
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const chainId = req.query.chainId || process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7";
  const chain = getChainConfig(chainId);
  const al = getAutoLoopConfig(chainId);

  if (!chain || !al || !al.keeper) {
    return res.status(400).json({ error: "AutoLoop not configured for this chain" });
  }

  try {
    const rpcUrl = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || chain.rpcUrl;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const autoLoop = new ethers.Contract(al.autoLoop, AutoLoopABI, provider);
    const registry = new ethers.Contract(al.registry, RegistryABI, provider);

    const [balanceWei, isRegistered] = await Promise.all([
      autoLoop.balance(al.keeper),
      registry.isRegisteredAutoLoop(al.keeper),
    ]);

    res.json({
      keeper: al.keeper,
      registrar: al.registrar,
      balance: ethers.formatEther(balanceWei),
      balanceWei: balanceWei.toString(),
      isRegistered,
      chainId,
      chainName: chain.name,
    });
  } catch (err) {
    console.error("AutoLoop balance error:", err.message);
    res.status(500).json({ error: "Failed to fetch AutoLoop balance" });
  }
}
