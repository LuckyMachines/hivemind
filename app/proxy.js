// x402 payment middleware for Next.js
// Requires x402-next package and Base Sepolia USDC payments
import { paymentMiddleware } from "x402-next";

export default paymentMiddleware({
  payTo: process.env.X402_PAY_TO_ADDRESS,
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator",
  network: process.env.X402_NETWORK || "base-sepolia",
  routes: {
    // Phase 1: Read-only game data (cheap micropayments)
    "/api/game/active": { price: "$0.001", description: "List active games" },
    "/api/game/:id/stats": { price: "$0.001", description: "Game statistics" },
    "/api/game/:id/leaderboard": { price: "$0.005", description: "Game leaderboard" },
    "/api/game/:id/question": { price: "$0.01", description: "Current question data" },
    "/api/game/:id/status": { price: "$0.001", description: "Game phase status" },
    // Phase 2: Game entry
    "/api/game/join": { price: "$0.05", description: "Join game with USDC" },
    // Phase 3: Programmatic game actions
    "/api/game/:id/submit": { price: "$0.01", description: "Submit answers" },
    "/api/game/:id/reveal": { price: "$0.01", description: "Reveal answers" },
    "/api/game/:id/claim": { price: "$0.001", description: "Claim winnings" },
  },
});

export const config = {
  matcher: "/api/game/:path*",
};
