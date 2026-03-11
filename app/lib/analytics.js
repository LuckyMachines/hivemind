// GDPR-compliant local-first analytics
// No cookies, no PII, anonymized IPs, no third-party services
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.ANALYTICS_DATA_DIR || path.join(process.cwd(), ".analytics");
const SITE = process.env.ANALYTICS_SITE || "game";

// Ensure data directory exists
function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Analytics: failed to create data dir", e.message);
  }
}

// Anonymize IP — zero last octet (IPv4) or last 80 bits (IPv6)
function anonymizeIP(ip) {
  if (!ip || ip === "unknown") return "0.0.0.0";
  // IPv4
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    parts[3] = "0";
    return parts.join(".");
  }
  // IPv6
  if (ip.includes(":")) {
    const parts = ip.split(":");
    // Zero the last 5 groups (80 bits)
    for (let i = Math.max(3, parts.length - 5); i < parts.length; i++) {
      parts[i] = "0";
    }
    return parts.join(":");
  }
  return "0.0.0.0";
}

// Hash visitor for unique counting (not reversible)
function hashVisitor(anonIP, userAgent, date) {
  return crypto
    .createHash("sha256")
    .update(`${anonIP}|${userAgent}|${date}`)
    .digest("hex")
    .slice(0, 16);
}

// Parse user agent to browser + OS (simple, no dependency needed)
function parseUA(ua) {
  if (!ua) return { browser: "Unknown", os: "Unknown" };

  let browser = "Other";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("bot") || ua.includes("Bot") || ua.includes("crawl")) browser = "Bot";

  let os = "Other";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

// Record a page view
function recordPageView({ ip, userAgent, path: pagePath, referrer }) {
  ensureDir();
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const hour = now.getUTCHours();
  const anonIP = anonymizeIP(ip);
  const visitorHash = hashVisitor(anonIP, userAgent, date);
  const { browser, os } = parseUA(userAgent);

  // Clean referrer — strip query params, only keep domain
  let ref = "";
  if (referrer) {
    try {
      const u = new URL(referrer);
      ref = u.hostname;
    } catch (e) {
      ref = referrer.slice(0, 100);
    }
  }

  const entry = {
    t: now.toISOString(),
    h: hour,
    p: pagePath,
    v: visitorHash,
    r: ref,
    b: browser,
    o: os,
    s: SITE,
  };

  const file = path.join(DATA_DIR, `${date}.jsonl`);
  try {
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error("Analytics: failed to write", e.message);
  }
}

// Read a day's data
function readDay(date) {
  const file = path.join(DATA_DIR, `${date}.jsonl`);
  try {
    if (!fs.existsSync(file)) return [];
    const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
    return lines.map((l) => JSON.parse(l));
  } catch (e) {
    console.error("Analytics: failed to read", e.message);
    return [];
  }
}

// Get stats for a specific date
function getStats(date, site) {
  const entries = readDay(date).filter((e) => !site || e.s === site);
  if (entries.length === 0) {
    return {
      date,
      site: site || "all",
      pageViews: 0,
      uniqueVisitors: 0,
      topPages: [],
      topReferrers: [],
      browsers: {},
      os: {},
      hourly: new Array(24).fill(0),
    };
  }

  const visitors = new Set();
  const pages = {};
  const referrers = {};
  const browsers = {};
  const osMap = {};
  const hourly = new Array(24).fill(0);

  for (const e of entries) {
    visitors.add(e.v);
    pages[e.p] = (pages[e.p] || 0) + 1;
    if (e.r) referrers[e.r] = (referrers[e.r] || 0) + 1;
    browsers[e.b] = (browsers[e.b] || 0) + 1;
    osMap[e.o] = (osMap[e.o] || 0) + 1;
    hourly[e.h] = (hourly[e.h] || 0) + 1;
  }

  const sortObj = (obj, limit = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));

  return {
    date,
    site: site || "all",
    pageViews: entries.length,
    uniqueVisitors: visitors.size,
    topPages: sortObj(pages),
    topReferrers: sortObj(referrers),
    browsers: sortObj(browsers),
    os: sortObj(osMap),
    hourly,
  };
}

// Clean up old data files (keep last 30 days)
function cleanup() {
  ensureDir();
  try {
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".jsonl"));
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    for (const f of files) {
      const fileDate = f.replace(".jsonl", "");
      if (fileDate < cutoff) {
        fs.unlinkSync(path.join(DATA_DIR, f));
      }
    }
  } catch (e) {
    console.error("Analytics: cleanup failed", e.message);
  }
}

module.exports = {
  recordPageView,
  getStats,
  readDay,
  cleanup,
  anonymizeIP,
  hashVisitor,
  parseUA,
  SITE,
};
