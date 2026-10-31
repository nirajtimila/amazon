const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const deals = Object.values(db.crawledDeals || {});

const JUNK_TRASH_REGEX = /(case\s+for|cover\s+for|screen\s+protector|replacement\s+filter|tempered\s+glass|silicone\s+sleeve|cable\s+for|strap\s+for|carrying\s+case|protective\s+cover|charging\s+cord|stylus\s+pen|usb\s+cable|wrist\s+strap)/i;

function testNewPriceError(d) {
  const np = d.numericPrice || parseFloat(String(d.price || '').replace(/[^0-9.]/g, '')) || 0;
  if (np < 8.0) return false;
  const title = String(d.title || '');
  if (JUNK_TRASH_REGEX.test(title)) return false;

  const disc = parseInt(d.discountPercent, 10) || 0;
  const origPrice = parseFloat(String(d.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
  const savings = origPrice > np ? (origPrice - np) : 0;
  const isWh = d.store === 'Amazon Warehouse';
  const brand = d.brand;
  const rev = parseInt(d.reviews, 10) || 0;

  // Fake MSRP reject
  if (!brand && disc >= 85 && savings >= 200 && rev < 20) return false;

  // Tier 1: 70%+ off (Super Glitch / Deep Clearance)
  if (disc >= 70 && savings >= 15) return { tier: 'epic_glitch', label: '🔥 ' + disc + '% GLITCH' };

  // Tier 2: 50%+ off AND $50+ savings (High Dollar Steal)
  if (disc >= 50 && savings >= 50) return { tier: 'dollar_glitch', label: '⚡ $' + Math.round(savings) + ' DROP (' + disc + '% OFF)' };

  // Tier 3: Warehouse Deep Steal (55%+ off & $25+ savings)
  if (isWh && disc >= 55 && savings >= 25) return { tier: 'warehouse_steal', label: '📦 ' + disc + '% WH STEAL' };

  // Tier 4: Brand Clearance (40%+ off & $60+ savings on top brand)
  if (brand && disc >= 40 && savings >= 60) return { tier: 'brand_glitch', label: '⭐ ' + disc + '% ' + brand.toUpperCase() };

  // Tier 5: Flash Crash Drop
  if (d.previousPrice && disc >= 35 && savings >= 25) {
    const prev = parseFloat(String(d.previousPrice).replace(/[^0-9.]/g, '')) || 0;
    if (prev > np && ((prev - np) / prev) >= 0.35) {
      return { tier: 'flash_drop', label: '📉 FLASH DROP' };
    }
  }

  return false;
}

let matches = [];
let tiers = { epic_glitch: 0, dollar_glitch: 0, warehouse_steal: 0, brand_glitch: 0, flash_drop: 0 };

for (const d of deals) {
  const res = testNewPriceError(d);
  if (res) {
    matches.push({ ...d, glitchInfo: res });
    tiers[res.tier]++;
  }
}

console.log('Total verified glitch deals:', matches.length);
console.log('Tiers breakdown:', JSON.stringify(tiers, null, 2));
console.log('\nSample verified glitch deals:');
matches.slice(0, 10).forEach(m => {
  console.log(`- [${m.glitchInfo.label}] ${m.title.substring(0, 55)} | ${m.price} (was ${m.originalPrice}) | ${m.store}`);
});
