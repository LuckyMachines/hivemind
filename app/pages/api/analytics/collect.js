// Analytics collection endpoint — called by client-side _app.js on page views
// No authentication needed; lightweight fire-and-forget from the browser
const { recordPageView } = require("../../../lib/analytics");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { path, ua, referrer } = req.body;
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    await recordPageView({ ip, userAgent: ua || req.headers["user-agent"] || "", path, referrer });
    return res.status(204).end();
  } catch (e) {
    console.error("Analytics collect error:", e.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
