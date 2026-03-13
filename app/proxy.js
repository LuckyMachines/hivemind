// Combined proxy: analytics tracking + x402 payment gating
// Uses proxy.js (Next.js 16 Node.js runtime) instead of middleware.js (Edge)
import { NextResponse } from "next/server";
import { paymentMiddleware } from "x402-next";

const payTo = process.env.X402_PAY_TO_ADDRESS;
const facilitator =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
const network = process.env.X402_NETWORK || "base-sepolia";

const routes = {
  "/api/game/active": {
    price: "$0.01",
    network,
    description: "List active games",
  },
  "/api/game/:id/stats": {
    price: "$0.01",
    network,
    description: "Game statistics",
  },
  "/api/game/:id/leaderboard": {
    price: "$0.02",
    network,
    description: "Game leaderboard",
  },
  "/api/game/:id/question": {
    price: "$0.05",
    network,
    description: "Current question data",
  },
  "/api/game/:id/status": {
    price: "$0.01",
    network,
    description: "Game phase status",
  },
  "/api/game/join": {
    price: "$0.10",
    network,
    description: "Join game with USDC",
  },
  "/api/game/:id/submit": {
    price: "$0.05",
    network,
    description: "Submit answers",
  },
  "/api/game/:id/reveal": {
    price: "$0.05",
    network,
    description: "Reveal answers",
  },
  "/api/game/:id/claim": {
    price: "$0.01",
    network,
    description: "Claim winnings",
  },
};

const x402Handler =
  process.env.X402_ENABLED === "true" && payTo
    ? paymentMiddleware(payTo, routes, facilitator)
    : null;

export default async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // x402 payment gating for game API routes
  if (pathname.startsWith("/api/game/") && x402Handler) {
    return x402Handler(request);
  }

  // Analytics is handled client-side in _app.js (POST to /api/analytics/collect)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
