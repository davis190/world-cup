#!/usr/bin/env node
// One-time script to backfill historical closing odds for all played matches.
// Requires: The Odds API key with historical access (paid tier).
// Usage: ODDS_API_KEY=xxx BUCKET=worldcup-site-... node scripts/backfill-odds.js
//
// The script:
//   1. Downloads the current odds.json from S3 (or starts fresh)
//   2. Fetches closing odds for each matchday that has finished matches
//   3. Merges into odds.json
//   4. Uploads back to S3

const https = require("https");
const { execSync } = require("child_process");

const KEY    = process.env.ODDS_API_KEY;
const BUCKET = process.env.BUCKET;
const SPORT  = process.env.ODDS_SPORT || "soccer_fifa_world_cup";

if (!KEY || !BUCKET) {
  console.error("Set ODDS_API_KEY and BUCKET env vars.");
  process.exit(1);
}

const A = {
  "Czech Republic":"Czechia","Cote d'Ivoire":"Ivory Coast","Côte d'Ivoire":"Ivory Coast",
  "Bosnia and Herzegovina":"Bosnia & Herzegovina","Bosnia-Herzegovina":"Bosnia & Herzegovina",
  "Turkey":"Türkiye","United States":"USA","Congo, DR":"DR Congo","Congo DR":"DR Congo",
  "Democratic Republic of Congo":"DR Congo","Democratic Republic of the Congo":"DR Congo",
};
const norm = n => A[n] || n;

const get = url => new Promise((res, rej) => {
  https.get(url, r => {
    let d = "";
    r.on("data", c => d += c);
    r.on("end", () => {
      console.log("  remaining units:", r.headers["x-requests-remaining"] ?? "unknown");
      try { res(JSON.parse(d)); } catch (e) { rej(new Error("parse error: " + d.slice(0, 200))); }
    });
  }).on("error", rej);
});

// Team name pairs to match events to our data.json match IDs
// [matchId, utcDate, homeTeamFdName, awayTeamFdName]
const MATCH_SCHEDULE = JSON.parse(
  require("child_process").execFileSync("aws", ["s3", "cp", `s3://${BUCKET}/data.json`, "-"]).toString()
).matches.filter(m => m.status === "FINISHED");

(async () => {
  // load existing odds.json or start fresh
  let odds = { matches: {}, fetchedDates: [] };
  try {
    const raw = execSync(`aws s3 cp s3://${BUCKET}/odds.json -`).toString();
    odds = JSON.parse(raw);
    odds.fetchedDates = odds.fetchedDates || [];
  } catch { console.log("No existing odds.json found, starting fresh."); }

  const findM = (ev, ms) => ms.find(m =>
    m.homeTeam?.name &&
    Math.abs(new Date(ev.commence_time) - new Date(m.utcDate)) < 3600e3 &&
    (norm(ev.home_team) === norm(m.homeTeam.name) || norm(ev.away_team) === norm(m.awayTeam.name))
  );

  const extractOdds = (ev, m) => {
    const bk = ev.bookmakers?.find(b => b.key === "pinnacle") || ev.bookmakers?.[0];
    const h2h = bk?.markets?.find(x => x.key === "h2h");
    if (!h2h) return null;
    const o = { bk: bk.title, t: new Date().toISOString(), closing: true };
    for (const x of h2h.outcomes) {
      if (norm(x.name) === norm(m.homeTeam.name)) o.home = x.price;
      else if (norm(x.name) === norm(m.awayTeam.name)) o.away = x.price;
      else o.draw = x.price;
    }
    return (o.home != null && o.away != null) ? o : null;
  };

  // Group finished matches by date
  const byDate = {};
  for (const m of MATCH_SCHEDULE) {
    if (odds.matches[m.id]) continue; // already have odds
    const d = m.utcDate.slice(0, 10);
    (byDate[d] = byDate[d] || []).push(m);
  }

  const dates = Object.keys(byDate).sort();
  if (!dates.length) { console.log("All finished matches already have odds!"); return; }
  console.log(`Fetching historical odds for ${dates.length} matchdays: ${dates.join(", ")}`);

  for (const d of dates) {
    // use kickoff time of first match minus 5 min as the snapshot timestamp
    const firstKickoff = byDate[d].sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0].utcDate;
    const snapTs = new Date(new Date(firstKickoff).getTime() - 5 * 60e3).toISOString();
    const url = `https://api.the-odds-api.com/v4/historical/sports/${SPORT}/odds/?apiKey=${KEY}&date=${snapTs}&regions=us,uk&markets=h2h&oddsFormat=american`;
    console.log(`\n${d} (snapshot: ${snapTs.slice(0,19)})`);
    try {
      const data = await get(url);
      const events = data.data || [];
      let found = 0, unmatched = [];
      for (const ev of events) {
        const m = findM(ev, byDate[d]);
        if (!m) { unmatched.push(`${ev.home_team} v ${ev.away_team}`); continue; }
        const o = extractOdds(ev, m);
        if (o) { odds.matches[m.id] = o; found++; }
      }
      console.log(`  matched ${found}/${byDate[d].length} matches`);
      if (unmatched.length) console.log("  UNMATCHED (add alias?):", unmatched.join(", "));
      odds.fetchedDates.push(d);
    } catch (e) {
      console.error(`  ERROR for ${d}:`, e.message);
    }
  }

  odds.updatedAt = new Date().toISOString();
  const tmpFile = "/tmp/odds-backfill.json";
  require("fs").writeFileSync(tmpFile, JSON.stringify(odds));
  console.log(`\n✓ Writing to ${tmpFile}`);
  execSync(`aws s3 cp ${tmpFile} s3://${BUCKET}/odds.json --content-type application/json --cache-control "public, max-age=60"`);
  console.log(`✓ Uploaded to s3://${BUCKET}/odds.json`);
  console.log(`\nMatches with odds: ${Object.keys(odds.matches).length} / ${MATCH_SCHEDULE.length} finished`);
})().catch(e => { console.error(e); process.exit(1); });
