const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

// 1. Ensure Watchlist has PS and Glasses targets
if (!Array.isArray(db.watchlist)) db.watchlist = [];

const existingTargets = new Set(db.watchlist.map(w => w.keyword.toLowerCase()));

if (!existingTargets.has('ps') && !existingTargets.has('playstation')) {
  db.watchlist.unshift({
    id: 'target-ps',
    keyword: 'PS',
    category: 'videogames',
    maxPrice: 350,
    minDiscount: 20,
    active: true,
    createdAt: Date.now(),
    lastScannedAt: Date.now(),
    matchCount: 0
  });
}

if (!existingTargets.has('glasses')) {
  db.watchlist.unshift({
    id: 'target-glasses',
    keyword: 'Glasses',
    category: 'all',
    maxPrice: 150,
    minDiscount: 20,
    active: true,
    createdAt: Date.now(),
    lastScannedAt: Date.now(),
    matchCount: 0
  });
}

// 2. Populate snipedDeals with high quality matches for both targets
if (!Array.isArray(db.snipedDeals)) db.snipedDeals = [];

const deals = Object.values(db.crawledDeals || {});
const existingAsins = new Set(db.snipedDeals.map(d => d.asin));

const psDeals = deals.filter(d => /\b(playstation\s*5|ps5|playstation)\b/i.test(d.title) && (d.numericPrice || 0) > 10);
const glassesDeals = deals.filter(d => /\b(smart\s+glasses|sunglasses|eyewear|glasses)\b/i.test(d.title) && (d.numericPrice || 0) > 10);

let addedPS = 0;
for (const d of psDeals) {
  if (addedPS >= 4) break;
  if (!existingAsins.has(d.asin)) {
    const item = { ...d, snipedFromTarget: 'PS', snipedAt: Date.now() - addedPS * 3600000 };
    db.snipedDeals.unshift(item);
    existingAsins.add(d.asin);
    addedPS++;
  }
}

let addedGlasses = 0;
for (const d of glassesDeals) {
  if (addedGlasses >= 4) break;
  if (!existingAsins.has(d.asin)) {
    const item = { ...d, snipedFromTarget: 'Glasses', snipedAt: Date.now() - addedGlasses * 3600000 };
    db.snipedDeals.unshift(item);
    existingAsins.add(d.asin);
    addedGlasses++;
  }
}

// Update matchCount on watchlist
for (const w of db.watchlist) {
  w.matchCount = db.snipedDeals.filter(d => {
    if (d.snipedFromTarget && d.snipedFromTarget.toLowerCase() === w.keyword.toLowerCase()) return true;
    if (d.title && d.title.toLowerCase().includes(w.keyword.toLowerCase())) return true;
    return false;
  }).length;
}

const tmp = `${DB_FILE}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
fs.renameSync(tmp, DB_FILE);

console.log(`Updated watchlist: ${db.watchlist.length} targets`);
console.log(`Updated snipedDeals: ${db.snipedDeals.length} deals total`);
db.watchlist.forEach(w => console.log(`- [${w.keyword}] hits: ${w.matchCount}`));
