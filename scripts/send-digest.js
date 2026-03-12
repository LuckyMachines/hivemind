#!/usr/bin/env node
// Daily analytics digest — queries both sites and sends email via Zoho SMTP
// Run as Railway cron: 0 8 * * * (8am UTC daily)
const nodemailer = require("nodemailer");

const GAME_URL = process.env.GAME_STATS_URL || "https://game.hjivemind.com/api/analytics/stats";
const MARKETING_URL = process.env.MARKETING_STATS_URL || "https://hjivemind.com/api/analytics/stats";
const ANALYTICS_SECRET = process.env.ANALYTICS_SECRET;

const RECIPIENTS = (
  process.env.ANALYTICS_RECIPIENTS ||
  "hello@hjivemind.com,hello@luckymachines.io,hello@playablefuture.com"
).split(",").map((e) => e.trim());

const ZOHO_USER = process.env.ZOHO_SMTP_USER;
const ZOHO_PASS = process.env.ZOHO_SMTP_PASS;

async function fetchStats(url, date) {
  try {
    const res = await fetch(`${url}?date=${date}&secret=${ANALYTICS_SECRET}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Failed to fetch stats from ${url}:`, e.message);
    return null;
  }
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function renderSection(title, domain, stats) {
  if (!stats) {
    return `
      <tr><td style="padding:20px 30px;">
        <h2 style="color:#2196f3;margin:0 0 8px;">${title}</h2>
        <p style="color:#aaa;">${domain} — No data available</p>
      </td></tr>`;
  }

  // Ensure arrays (API might return objects or arrays)
  const toArr = (v) => (Array.isArray(v) ? v : []);

  const topPagesRows = toArr(stats.topPages)
    .map(
      (p) =>
        `<tr><td style="padding:4px 0;color:#ccc;">${p.name}</td><td style="padding:4px 0 4px 16px;color:#fff;text-align:right;">${formatNumber(p.count)}</td></tr>`
    )
    .join("");

  const topReferrerRows = toArr(stats.topReferrers)
    .map(
      (r) =>
        `<tr><td style="padding:4px 0;color:#ccc;">${r.name || "(direct)"}</td><td style="padding:4px 0 4px 16px;color:#fff;text-align:right;">${formatNumber(r.count)}</td></tr>`
    )
    .join("");

  const browserRows = toArr(stats.browsers)
    .map(
      (b) =>
        `<tr><td style="padding:2px 0;color:#ccc;">${b.name}</td><td style="padding:2px 0 2px 16px;color:#fff;text-align:right;">${formatNumber(b.count)}</td></tr>`
    )
    .join("");

  const osRows = toArr(stats.os)
    .map(
      (o) =>
        `<tr><td style="padding:2px 0;color:#ccc;">${o.name}</td><td style="padding:2px 0 2px 16px;color:#fff;text-align:right;">${formatNumber(o.count)}</td></tr>`
    )
    .join("");

  // Hourly chart — simple ASCII-like bars
  const maxHourly = Math.max(...stats.hourly, 1);
  const hourlyBars = stats.hourly
    .map((v, h) => {
      const pct = Math.round((v / maxHourly) * 100);
      const label = String(h).padStart(2, "0");
      return `<tr>
        <td style="padding:1px 8px 1px 0;color:#888;font-size:11px;white-space:nowrap;">${label}:00</td>
        <td style="padding:1px 0;width:100%;">
          <div style="background:#2196f3;height:12px;width:${pct}%;border-radius:2px;min-width:${v > 0 ? 2 : 0}px;"></div>
        </td>
        <td style="padding:1px 0 1px 8px;color:#aaa;font-size:11px;text-align:right;">${v}</td>
      </tr>`;
    })
    .join("");

  return `
    <tr><td style="padding:20px 30px;">
      <h2 style="color:#2196f3;margin:0 0 4px;">${title}</h2>
      <p style="color:#888;margin:0 0 16px;font-size:13px;">${domain}</p>

      <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="padding-right:40px;">
            <div style="font-size:32px;color:#fff;font-weight:bold;">${formatNumber(stats.pageViews)}</div>
            <div style="color:#888;font-size:12px;">Page Views</div>
          </td>
          <td>
            <div style="font-size:32px;color:#fff;font-weight:bold;">${formatNumber(stats.uniqueVisitors)}</div>
            <div style="color:#888;font-size:12px;">Unique Visitors</div>
          </td>
        </tr>
      </table>

      ${topPagesRows ? `
      <h3 style="color:#fff;margin:16px 0 8px;font-size:14px;">Top Pages</h3>
      <table cellpadding="0" cellspacing="0" style="width:100%;">${topPagesRows}</table>
      ` : ""}

      ${topReferrerRows ? `
      <h3 style="color:#fff;margin:16px 0 8px;font-size:14px;">Top Referrers</h3>
      <table cellpadding="0" cellspacing="0" style="width:100%;">${topReferrerRows}</table>
      ` : ""}

      <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:16px;">
        <tr valign="top">
          ${browserRows ? `<td style="width:50%;padding-right:16px;">
            <h3 style="color:#fff;margin:0 0 8px;font-size:14px;">Browsers</h3>
            <table cellpadding="0" cellspacing="0" style="width:100%;">${browserRows}</table>
          </td>` : ""}
          ${osRows ? `<td style="width:50%;">
            <h3 style="color:#fff;margin:0 0 8px;font-size:14px;">Operating Systems</h3>
            <table cellpadding="0" cellspacing="0" style="width:100%;">${osRows}</table>
          </td>` : ""}
        </tr>
      </table>

      ${stats.hourly.some((v) => v > 0) ? `
      <h3 style="color:#fff;margin:16px 0 8px;font-size:14px;">Hourly Traffic (UTC)</h3>
      <table cellpadding="0" cellspacing="0" style="width:100%;">${hourlyBars}</table>
      ` : ""}
    </td></tr>`;
}

function buildEmail(date, gameStats, marketingStats) {
  const totalViews =
    (gameStats?.pageViews || 0) + (marketingStats?.pageViews || 0);
  const totalVisitors =
    (gameStats?.uniqueVisitors || 0) + (marketingStats?.uniqueVisitors || 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:12px;border:1px solid #222;">

        <!-- Header -->
        <tr><td style="padding:30px 30px 20px;text-align:center;border-bottom:1px solid #222;">
          <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px;">HJIVEMIND</h1>
          <p style="color:#2196f3;margin:8px 0 0;font-size:14px;">Daily Analytics Digest</p>
          <p style="color:#666;margin:4px 0 0;font-size:13px;">${date}</p>
        </td></tr>

        <!-- Combined Summary -->
        <tr><td style="padding:20px 30px;border-bottom:1px solid #222;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="padding-right:40px;text-align:center;">
                <div style="font-size:40px;color:#2196f3;font-weight:bold;">${formatNumber(totalViews)}</div>
                <div style="color:#888;font-size:12px;">Total Page Views</div>
              </td>
              <td style="text-align:center;">
                <div style="font-size:40px;color:#2196f3;font-weight:bold;">${formatNumber(totalVisitors)}</div>
                <div style="color:#888;font-size:12px;">Total Unique Visitors</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Divider -->
        <tr><td style="border-bottom:1px solid #222;"></td></tr>

        <!-- Game Stats -->
        ${renderSection("Game App", "game.hjivemind.com", gameStats)}

        <tr><td style="border-bottom:1px solid #222;"></td></tr>

        <!-- Marketing Stats -->
        ${renderSection("Marketing Site", "hjivemind.com", marketingStats)}

        <!-- Footer -->
        <tr><td style="padding:20px 30px;border-top:1px solid #222;text-align:center;">
          <p style="color:#444;font-size:11px;margin:0;">
            GDPR-compliant analytics — no cookies, no PII, anonymized IPs<br>
            Sent by HJIVEMIND Analytics &bull; <a href="https://hjivemind.com" style="color:#2196f3;text-decoration:none;">hjivemind.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  if (!ZOHO_USER || !ZOHO_PASS) {
    console.error("Missing ZOHO_SMTP_USER or ZOHO_SMTP_PASS");
    process.exit(1);
  }
  if (!ANALYTICS_SECRET) {
    console.error("Missing ANALYTICS_SECRET");
    process.exit(1);
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  console.log(`Fetching analytics for ${yesterday}...`);

  const [gameStats, marketingStats] = await Promise.all([
    fetchStats(GAME_URL, yesterday),
    fetchStats(MARKETING_URL, yesterday),
  ]);

  console.log(
    `Game: ${gameStats?.pageViews || 0} views, ${gameStats?.uniqueVisitors || 0} visitors`
  );
  console.log(
    `Marketing: ${marketingStats?.pageViews || 0} views, ${marketingStats?.uniqueVisitors || 0} visitors`
  );

  const html = buildEmail(yesterday, gameStats, marketingStats);

  const transport = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: ZOHO_USER,
      pass: ZOHO_PASS,
    },
  });

  await transport.sendMail({
    from: `"HJIVEMIND Analytics" <${ZOHO_USER}>`,
    to: RECIPIENTS.join(", "),
    subject: `HJIVEMIND Analytics — ${yesterday}`,
    html,
  });

  console.log(`Digest sent to ${RECIPIENTS.join(", ")}`);
}

main().catch((e) => {
  console.error("Digest failed:", e);
  process.exit(1);
});
