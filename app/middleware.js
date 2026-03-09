// x402 payment middleware for Next.js
// TODO: Enable when upgrading to Next.js 15+ (x402-next requires Next >=15.5.9)
// import { paymentMiddleware } from "x402-next";
//
// Route pricing config (for future use):
// "/api/game/active":        $0.001 - List active games
// "/api/game/:id/stats":     $0.001 - Game statistics
// "/api/game/:id/leaderboard": $0.005 - Game leaderboard
// "/api/game/:id/question":  $0.01  - Current question data
// "/api/game/:id/status":    $0.001 - Game phase status
// "/api/game/join":           $0.05  - Join game with USDC
// "/api/game/:id/submit":    $0.01  - Submit answers
// "/api/game/:id/reveal":    $0.01  - Reveal answers
// "/api/game/:id/claim":     $0.001 - Claim winnings

import { NextResponse } from "next/server";

export default function middleware(req) {
  return NextResponse.next();
}

export const config = {
  matcher: "/api/game/:path*",
};
