// Analytics collection endpoint — called by middleware
// No authentication needed; only accepts internal POST requests
const { recordPageView } = require("../../../lib/analytics");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ip, ua, referrer, path } = req.body;
    recordPageView({ ip, userAgent: ua, path, referrer });
    return res.status(204).end();
  } catch (e) {
    console.error("Analytics collect error:", e.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
