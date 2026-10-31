const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
const now = Date.now();

const JUNK_TRASH_REGEX = /\b(mug\b|mugs\b|cup\b|cups\b|ceramic\s*cup|water\s*bottle|tumbler|sheet\s*roll|brass\s*thin|copper\s*sheet|metal\s*strip|ear\s*plugs|sleep\s*earplugs|breath\s*spray|propolis|bracelet|necklace|pendant|keychain|lanyard|silicone\s*cover|cable\s*ties|adapter\s*ring|filter\s*ring|dust\s*cover|sticker\s*pack|decal|costume|cosplay|mannequin|shorts|hot\s*pants|mini\s*short|bermuda|chafing|booty|leggings|panties|thong|underwear|bra\b|bikini|swimwear|lingerie|boxer\s*briefs)\b/i;
const ACCESSORY_REPLACEMENT_REGEX = /\b(case\s*for|cover\s*for|sleeve\s*for|screen\s*protector|tempered\s*glass|replacement\s*(ear\s*pads|cushion|cables|cord|port|board|battery|remote|strap|band)|wall\s*mount\s*bracket|mounting\s*bracket|speaker\s*mount|remote\s*control\s*cover|(watch|sport)\s*(band|strap)|(phone|tablet|frame)\s*cover|protective\s*case|folio\s*case|skin\s*decal|stylus\s*pen\s*tips)\b/i;

const TOP_DESIRABLE_BRANDS = [
  'sony', 'bose', 'sennheiser', 'samsung', 'nintendo', 'playstation', 'xbox',
  'asus', 'lenovo', 'dell', 'hp', 'lg', 'anker', 'jbl', 'sonos', 'logitech',
  'garmin', 'gopro', 'dji', 'sandisk', 'crucial', 'corsair', 'steelseries', 'razer',
  'dyson', 'philips', 'breville', 'delonghi', 'nespresso', 'ninja', 'kitchenaid',
  'irobot', 'roborock', 'oral-b', 'braun', 'makita', 'bosch', 'dewalt', 'milwaukee',
  'karcher', 'lego', 'beats', 'jabra', 'belkin', 'ugreen', 'tp-link', 'netgear',
  'msi', 'amd', 'intel', 'nvidia', 'seagate', 'marshall', 'fitbit', 'soundcore',
  'panasonic', 'canon', 'nikon', 'fujifilm', 'kindle', 'blink', 'ecobee', 'instant pot',
  'shure', 'audio-technica', 'rode', 'yamaha', 'keychron', 'hyperx', 'kingston',
  'tefal', 'stanley', 'ryobi'
];

function detectBrand(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  if (/\bapple\s+(iphone|ipad|macbook|watch|airpods|pencil|magic|tv|vision|silicon|m1|m2|m3|m4|earpods|lightning)\b/i.test(t) ||
      /\b(macbook|iphone|ipad|airpods)\b/i.test(t)) {
    return 'Apple';
  }
  if (/\bgoogle\s+(pixel|nest|chromecast|tensor)\b/i.test(t) || /\bpixel\s+(7|8|9|10|fold|pro|watch|buds)\b/i.test(t)) {
    return 'Google';
  }
  if (/\bring\s+(video|doorbell|floodlight|spotlight|chime|camera|stick|alarm)\b/i.test(t)) {
    return 'Ring';
  }
  for (const b of TOP_DESIRABLE_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(t)) {
      if (b === 'ninja' && /turtle|mutant|cosplay|costume/i.test(t)) continue;
      if (ACCESSORY_REPLACEMENT_REGEX.test(t)) return null;
      return b.charAt(0).toUpperCase() + b.slice(1);
    }
  }
  return null;
}

function getPriceErrorInfo(item) {
  if (!item) return { isPriceError: false };
  const np = item.numericPrice || parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;
  if (np < 8.0) return { isPriceError: false };

  const title = String(item.title || '');
  if (JUNK_TRASH_REGEX.test(title)) return { isPriceError: false };
  if (ACCESSORY_REPLACEMENT_REGEX.test(title)) return { isPriceError: false };

  const disc = parseInt(item.discountPercent, 10) || 0;
  const origPrice = parseFloat(String(item.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
  const savings = origPrice > np ? (origPrice - np) : 0;
  const isWh = item.store === 'Amazon Warehouse';
  const brand = item.brand || detectBrand(title);
  const rev = parseInt(item.reviews, 10) || 0;

  // Dropshipper fake MSRP inflation rejection
  if (!brand && disc >= 85 && savings >= 200 && rev < 20) return { isPriceError: false };
  if (!brand && origPrice >= 800 && rev === 0 && !isWh) return { isPriceError: false };

  // Tier 1: Epic Glitch (70%+ off with verified savings)
  if (disc >= 70 && savings >= 15) {
    return { isPriceError: true, tier: 'epic_glitch', badge: `🔥 ${disc}% GLITCH` };
  }

  // Tier 2: High Dollar Glitch (50%+ off AND $50+ savings)
  if (disc >= 50 && savings >= 50) {
    return { isPriceError: true, tier: 'dollar_glitch', badge: `⚡ $${Math.round(savings)} DROP (${disc}% OFF)` };
  }

  // Tier 3: Warehouse Deep Steal (50%+ off AND $25+ savings)
  if (isWh && disc >= 50 && savings >= 25) {
    return { isPriceError: true, tier: 'warehouse_steal', badge: `📦 ${disc}% WH STEAL` };
  }

  // Tier 4: Premier Brand Clearance (40%+ off AND $50+ savings)
  if (brand && disc >= 40 && savings >= 50) {
    return { isPriceError: true, tier: 'brand_glitch', badge: `⭐ ${disc}% ${brand.toUpperCase()}` };
  }

  // Tier 5: Flash Crash Price Drop (35%+ drop from previousPrice)
  if (item.previousPrice && disc >= 35 && savings >= 25) {
    const prev = parseFloat(String(item.previousPrice).replace(/[^0-9.]/g, '')) || 0;
    if (prev > np && ((prev - np) / prev) >= 0.35) {
      return { isPriceError: true, tier: 'flash_drop', badge: `📉 FLASH DROP` };
    }
  }

  return { isPriceError: false };
}

// 1. Prune deals older than 14 days
let prunedCount = 0;
for (const asin in db.crawledDeals) {
  const d = db.crawledDeals[asin];
  const dealTs = Math.max(d.lastSeenAt || 0, d.firstSeenAt || 0, d.priceDropAt || 0) || 0;
  if (dealTs > 0 && (now - dealTs) > FOURTEEN_DAYS) {
    delete db.crawledDeals[asin];
    prunedCount++;
  }
}

// 2. Re-tag all remaining deals with accurate price error status & badges
let priceErrorCount = 0;
const tierCounts = { epic_glitch: 0, dollar_glitch: 0, warehouse_steal: 0, brand_glitch: 0, flash_drop: 0 };

for (const asin in db.crawledDeals) {
  const d = db.crawledDeals[asin];
  const detected = detectBrand(d.title);
  if (detected) {
    d.brand = detected;
    d.isBrandDeal = true;
  }
  const info = getPriceErrorInfo(d);
  if (info.isPriceError) {
    d.isPriceError = true;
    d.priceErrorType = info.tier;
    d.glitchBadge = info.badge;
    priceErrorCount++;
    tierCounts[info.tier]++;
  } else {
    d.isPriceError = false;
    delete d.priceErrorType;
    delete d.glitchBadge;
  }
}

console.log(`Pruned ${prunedCount} deals older than 14 days.`);
console.log(`Remaining deals in DB: ${Object.keys(db.crawledDeals).length}`);
console.log(`Verified Price Error deals: ${priceErrorCount}`);
console.log('Tier breakdown:', tierCounts);

// Save back to database.json
const tmpFile = `${DB_FILE}.tmp`;
fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
fs.renameSync(tmpFile, DB_FILE);
console.log('Successfully saved updated database.json!');
