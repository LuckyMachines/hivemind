// x402 payment middleware for Next.js
// Gated by X402_ENABLED env var — passes through if not configured
import { NextResponse } from "next/server";
import { paymentMiddleware } from "x402-next";

const x402Handler =
  process.env.X402_ENABLED === "true" && process.env.X402_PAY_TO_ADDRESS
    ? paymentMiddleware({
        payTo: process.env.X402_PAY_TO_ADDRESS,
        facilitatorUrl:
          process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator",
        network: process.env.X402_NETWORK || "base-sepolia",
        routes: {
          "/api/game/active": {
            price: "$0.001",
            description: "List active games",
          },
          "/api/game/:id/stats": {
            price: "$0.001",
            description: "Game statistics",
          },
          "/api/game/:id/leaderboard": {
            price: "$0.005",
            description: "Game leaderboard",
          },
          "/api/game/:id/question": {
            price: "$0.01",
            description: "Current question data",
          },
          "/api/game/:id/status": {
            price: "$0.001",
            description: "Game phase status",
          },
          "/api/game/join": {
            price: "$0.05",
            description: "Join game with USDC",
          },
          "/api/game/:id/submit": {
            price: "$0.01",
            description: "Submit answers",
          },
          "/api/game/:id/reveal": {
            price: "$0.01",
            description: "Reveal answers",
          },
          "/api/game/:id/claim": {
            price: "$0.001",
            description: "Claim winnings",
          },
        },
      })
    : null;

export default function middleware(request) {
  if (x402Handler) return x402Handler(request);
  return NextResponse.next();
}

export const config = {
  matcher: "/api/game/:path*",
};
