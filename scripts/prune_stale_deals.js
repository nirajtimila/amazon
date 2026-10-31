#!/usr/bin/env node
/**
 * Standalone Database Retention Pruner for Amazon Warehouse Hunter
 * Automatically removes deals older than 14 days (or custom --days N).
 * Usage:
 *   node scripts/prune_stale_deals.js
 *   node scripts/prune_stale_deals.js --days 14
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'database.json');

// Parse --days argument (default: 14)
let maxAgeDays = 14;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--days' && args[i + 1]) {
    maxAgeDays = parseFloat(args[i + 1]) || 14;
    i++;
  }
}

if (!fs.existsSync(DB_FILE)) {
  console.error(`[PRUNE] Error: Database file not found at ${DB_FILE}`);
  process.exit(1);
}

console.log(`[PRUNE] 🧹 Starting database retention pruning (Threshold: ${maxAgeDays} days)...`);

try {
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const db = JSON.parse(raw);
  if (!db.crawledDeals) {
    console.log('[PRUNE] No crawledDeals table found in database.');
    process.exit(0);
  }

  const initialCount = Object.keys(db.crawledDeals).length;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let prunedCount = 0;

  for (const asin in db.crawledDeals) {
    const deal = db.crawledDeals[asin];
    if (!deal) continue;
    const dealTs = Math.max(deal.lastSeenAt || 0, deal.firstSeenAt || 0, deal.priceDropAt || 0) || 0;
    if (dealTs > 0 && (now - dealTs) > maxAgeMs) {
      delete db.crawledDeals[asin];
      prunedCount++;
    }
  }

  // Also prune snipedDeals that are older than maxAgeDays
  let prunedSniped = 0;
  if (Array.isArray(db.snipedDeals)) {
    const origSnipedLen = db.snipedDeals.length;
    db.snipedDeals = db.snipedDeals.filter(d => {
      const ts = Math.max(d.snipedAt || 0, d.lastSeenAt || 0, d.firstSeenAt || 0) || 0;
      return ts === 0 || (now - ts) <= maxAgeMs;
    });
    prunedSniped = origSnipedLen - db.snipedDeals.length;
  }

  const remainingCount = Object.keys(db.crawledDeals).length;

  if (prunedCount > 0 || prunedSniped > 0) {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
    console.log(`[PRUNE] ✅ Successfully purged ${prunedCount} stale deal(s) and ${prunedSniped} old sniped alert(s).`);
    console.log(`[PRUNE] 📊 Database size reduced from ${initialCount} to ${remainingCount} active deals.`);
  } else {
    console.log(`[PRUNE] ✅ All ${initialCount} deals are fresh and active (<${maxAgeDays} days old). Zero stale deals to prune.`);
  }

  process.exit(0);
} catch (err) {
  console.error('[PRUNE] Fatal error during retention pruning:', err.message);
  process.exit(1);
}
