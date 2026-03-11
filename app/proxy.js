// Combined middleware: analytics tracking + x402 payment gating
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
  const pathname = request.nextUrl.pathname;

  // x402 payment gating for game API routes
  if (pathname.startsWith("/api/game/") && x402Handler) {
    return x402Handler(request);
  }

  // Analytics tracking for page routes (not API, not static assets)
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/favicon")
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.ip ||
      "unknown";
    const ua = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    // Fire-and-forget POST to our analytics collect endpoint
    const collectUrl = new URL("/api/analytics/collect", request.url);
    fetch(collectUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, ua, referrer, path: pathname }),
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
