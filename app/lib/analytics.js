// GDPR-compliant analytics — Postgres-backed
// No cookies, no PII, anonymized IPs, no third-party services
const crypto = require("crypto");
const { Pool } = require("pg");

// Network-aware site tag: game-sepolia or game-mainnet
function getSiteTag() {
  const override = process.env.ANALYTICS_SITE;
  if (override) return override;
  const chainId = process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7";
  if (chainId === "0x1") return "game-mainnet";
  return "game-sepolia";
}

const SITE = getSiteTag();

// Lazy-init connection pool
let pool;
function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("Analytics: DATABASE_URL not set");
      return null;
    }
    pool = new Pool({ connectionString: url, max: 3, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

// Auto-create table on first use
let tableReady = false;
async function ensureTable() {
  if (tableReady) return true;
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        site VARCHAR(20) NOT NULL,
        path TEXT NOT NULL,
        visitor_hash VARCHAR(16) NOT NULL,
        referrer TEXT,
        browser VARCHAR(20),
        os VARCHAR(20),
        hour SMALLINT NOT NULL
      )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views (created_at)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_pv_site ON page_views (site)`);
    tableReady = true;
    return true;
  } catch (e) {
    console.error("Analytics: table init failed", e.message);
    return false;
  }
}

// Anonymize IP — zero last octet (IPv4) or last 80 bits (IPv6)
function anonymizeIP(ip) {
  if (!ip || ip === "unknown") return "0.0.0.0";
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    parts[3] = "0";
    return parts.join(".");
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
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

// Parse user agent to browser + OS
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
async function recordPageView({ ip, userAgent, path: pagePath, referrer }) {
  if (!(await ensureTable())) return;

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const hour = now.getUTCHours();
  const anonIP = anonymizeIP(ip);
  const visitorHash = hashVisitor(anonIP, userAgent, date);
  const { browser, os } = parseUA(userAgent);

  let ref = "";
  if (referrer) {
    try {
      const u = new URL(referrer);
      ref = u.hostname;
    } catch (e) {
      ref = referrer.slice(0, 100);
    }
  }

  try {
    await getPool().query(
      `INSERT INTO page_views (created_at, site, path, visitor_hash, referrer, browser, os, hour)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [now, SITE, pagePath, visitorHash, ref, browser, os, hour]
    );
  } catch (e) {
    console.error("Analytics: insert failed", e.message);
  }
}

// Get stats for a specific date
async function getStats(date, site) {
  if (!(await ensureTable())) {
    return { date, site: site || "all", pageViews: 0, uniqueVisitors: 0, topPages: [], topReferrers: [], browsers: [], os: [], hourly: new Array(24).fill(0) };
  }

  const p = getPool();
  const siteFilter = site ? "AND site = $2" : "";
  const params = site ? [date, site] : [date];

  try {
    const [pvRes, uvRes, pagesRes, refRes, browserRes, osRes, hourlyRes] = await Promise.all([
      p.query(`SELECT COUNT(*) as c FROM page_views WHERE created_at::date = $1 ${siteFilter}`, params),
      p.query(`SELECT COUNT(DISTINCT visitor_hash) as c FROM page_views WHERE created_at::date = $1 ${siteFilter}`, params),
      p.query(`SELECT path as name, COUNT(*) as count FROM page_views WHERE created_at::date = $1 ${siteFilter} GROUP BY path ORDER BY count DESC LIMIT 10`, params),
      p.query(`SELECT referrer as name, COUNT(*) as count FROM page_views WHERE created_at::date = $1 ${siteFilter} AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 10`, params),
      p.query(`SELECT browser as name, COUNT(*) as count FROM page_views WHERE created_at::date = $1 ${siteFilter} GROUP BY browser ORDER BY count DESC LIMIT 10`, params),
      p.query(`SELECT os as name, COUNT(*) as count FROM page_views WHERE created_at::date = $1 ${siteFilter} GROUP BY os ORDER BY count DESC LIMIT 10`, params),
      p.query(`SELECT hour, COUNT(*) as count FROM page_views WHERE created_at::date = $1 ${siteFilter} GROUP BY hour ORDER BY hour`, params),
    ]);

    const hourly = new Array(24).fill(0);
    for (const row of hourlyRes.rows) {
      hourly[row.hour] = parseInt(row.count);
    }

    return {
      date,
      site: site || "all",
      pageViews: parseInt(pvRes.rows[0].c),
      uniqueVisitors: parseInt(uvRes.rows[0].c),
      topPages: pagesRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count) })),
      topReferrers: refRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count) })),
      browsers: browserRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count) })),
      os: osRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count) })),
      hourly,
    };
  } catch (e) {
    console.error("Analytics: stats query failed", e.message);
    return { date, site: site || "all", pageViews: 0, uniqueVisitors: 0, topPages: [], topReferrers: [], browsers: [], os: [], hourly: new Array(24).fill(0) };
  }
}

// Clean up old data (keep last 90 days)
async function cleanup() {
  if (!(await ensureTable())) return;
  try {
    await getPool().query(`DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '90 days'`);
  } catch (e) {
    console.error("Analytics: cleanup failed", e.message);
  }
}

module.exports = {
  recordPageView,
  getStats,
  cleanup,
  anonymizeIP,
  hashVisitor,
  parseUA,
  SITE,
};
