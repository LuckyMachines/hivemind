// Combined proxy: analytics tracking + x402 dynamic payment gating
// Uses proxy.js (Next.js 16 Node.js runtime) instead of middleware.js (Edge)
//
// Pricing scales with ETH/USD:
//   price = basePrice × max(1, ethPrice / anchorPrice)
// Prices never drop below the base. Above the anchor, they scale linearly.
import { NextResponse } from "next/server";
import { paymentMiddleware } from "x402-next";

const payTo = process.env.X402_PAY_TO_ADDRESS;
const facilitator =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
const network = process.env.X402_NETWORK || "base-sepolia";

// ── Pricing config ──
const ANCHOR_PRICE = parseFloat(process.env.X402_ANCHOR_ETH_USD || "2000");
const REFRESH_INTERVAL_MS = parseInt(process.env.X402_PRICE_REFRESH_MS || "600000"); // 10 min

// Base prices (USD) — floor when ETH ≤ anchor
const TIERS = {
  operational: {
    base: parseFloat(process.env.X402_TIER_OPERATIONAL || "0.05"),
    routes: ["/api/game/join", "/api/game/:id/submit", "/api/game/:id/reveal"],
  },
  analysis: {
    base: parseFloat(process.env.X402_TIER_ANALYSIS || "0.01"),
    routes: [
      "/api/game/active",
      "/api/game/:id/stats",
      "/api/game/:id/leaderboard",
      "/api/game/:id/question",
      "/api/game/:id/status",
      "/api/game/:id/claim",
    ],
  },
};

// Route descriptions (static)
const DESCRIPTIONS = {
  "/api/game/active": "List active games",
  "/api/game/:id/stats": "Game statistics",
  "/api/game/:id/leaderboard": "Game leaderboard",
  "/api/game/:id/question": "Current question data",
  "/api/game/:id/status": "Game phase status",
  "/api/game/join": "Join game with USDC",
  "/api/game/:id/submit": "Submit answers",
  "/api/game/:id/reveal": "Reveal answers",
  "/api/game/:id/claim": "Claim winnings",
};

// ── Dynamic pricing state ──
let currentEthPrice = ANCHOR_PRICE;
let currentMultiplier = 1;
let tierPrices = { operational: TIERS.operational.base, analysis: TIERS.analysis.base };
let lastPriceRefresh = null;
let x402Handler = null;

function computeMultiplier(ethPrice) {
  return Math.max(1, ethPrice / ANCHOR_PRICE);
}

function buildRoutes(multiplier) {
  const routes = {};
  for (const [tierName, tier] of Object.entries(TIERS)) {
    const price = (tier.base * multiplier).toFixed(2);
    for (const route of tier.routes) {
      routes[route] = {
        price: `$${price}`,
        network,
        description: DESCRIPTIONS[route] || tierName,
      };
    }
  }
  return routes;
}

function rebuildHandler() {
  const routes = buildRoutes(currentMultiplier);
  if (process.env.X402_ENABLED === "true" && payTo) {
    x402Handler = paymentMiddleware(payTo, routes, facilitator);
  }

  // Update tier prices for health endpoint
  tierPrices = {
    operational: parseFloat((TIERS.operational.base * currentMultiplier).toFixed(2)),
    analysis: parseFloat((TIERS.analysis.base * currentMultiplier).toFixed(2)),
  };
}

async function fetchEthPrice() {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
    if (!res.ok) throw new Error(`Coinbase API ${res.status}`);
    const data = await res.json();
    const price = parseFloat(data.data.amount);
    if (isNaN(price) || price <= 0) throw new Error("Invalid price");
    return price;
  } catch (e) {
    console.error("ETH price fetch failed:", e.message);
    return null;
  }
}

async function refreshPricing() {
  const price = await fetchEthPrice();
  if (price !== null) {
    currentEthPrice = price;
    currentMultiplier = computeMultiplier(price);
    rebuildHandler();
    lastPriceRefresh = new Date().toISOString();
    console.log(
      `[x402] ETH=$${currentEthPrice} multiplier=${currentMultiplier.toFixed(2)} ` +
      `operational=$${tierPrices.operational} analysis=$${tierPrices.analysis}`
    );
  }
}

// ── Initialize on module load ──
rebuildHandler(); // start with anchor-based prices
refreshPricing(); // async: fetch live price, rebuild
setInterval(refreshPricing, REFRESH_INTERVAL_MS);

// ── Proxy handler ──
export default async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Health / pricing transparency endpoint
  if (pathname === "/api/x402/pricing") {
    return NextResponse.json({
      ethPrice: currentEthPrice,
      anchorPrice: ANCHOR_PRICE,
      multiplier: parseFloat(currentMultiplier.toFixed(4)),
      tiers: {
        operational: {
          base: TIERS.operational.base,
          current: tierPrices.operational,
          routes: TIERS.operational.routes,
        },
        analysis: {
          base: TIERS.analysis.base,
          current: tierPrices.analysis,
          routes: TIERS.analysis.routes,
        },
      },
      refreshIntervalMs: REFRESH_INTERVAL_MS,
      lastRefresh: lastPriceRefresh,
      network,
    });
  }

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
