// Analytics stats endpoint — used by the cron digest service
// Protected by ANALYTICS_SECRET env var
// Query params: ?date=YYYY-MM-DD&site=game-sepolia|game-mainnet|all
const { getStats, cleanup, SITE } = require("../../../lib/analytics");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = req.headers["x-analytics-secret"] || req.query.secret;
  if (!process.env.ANALYTICS_SECRET || secret !== process.env.ANALYTICS_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const date =
      req.query.date ||
      new Date(Date.now() - 86400000).toISOString().split("T")[0];
    // Default to this service's site tag, pass null for all sites
    const site = req.query.site === "all" ? null : (req.query.site || SITE);

    const stats = await getStats(date, site);
    stats.availableSites = ["game-sepolia", "game-mainnet", "marketing", "all"];

    // Run cleanup on stats requests
    cleanup();

    return res.status(200).json(stats);
  } catch (e) {
    console.error("Analytics stats error:", e.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
