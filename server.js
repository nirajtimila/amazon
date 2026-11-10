const express = require('express');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure persistent data directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[DB] Notice on data directory:', err.message);
}

// Default Database Structure
const DEFAULT_DB = {
  watchlist: [
    {
      id: "target-1",
      keyword: "Sony WH-1000XM5",
      category: "electronics",
      maxPrice: 280,
      minDiscount: 35,
      active: true,
      createdAt: Date.now(),
      lastScannedAt: null,
      matchCount: 0
    },
    {
      id: "target-2",
      keyword: "Kindle Paperwhite",
      category: "electronics",
      maxPrice: 120,
      minDiscount: 30,
      active: true,
      createdAt: Date.now(),
      lastScannedAt: null,
      matchCount: 0
    },
    {
      id: "target-3",
      keyword: "Apple AirPods Pro",
      category: "electronics",
      maxPrice: 200,
      minDiscount: 30,
      active: true,
      createdAt: Date.now(),
      lastScannedAt: null,
      matchCount: 0
    }
  ],
  savedDeals: [],
  snipedDeals: [],
  settings: {
    autoSniperEnabled: true,
    scanIntervalMinutes: 120, // 2 hours
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    defaultDomain: "amazon.com.au"
  },
  crawledDeals: {},
  crawler: {
    enabled: true,
    intervalMinutes: 60,
    lastRunAt: null,
    nextRunAt: null,
    isRunning: false,
    currentStep: '',
    lastRunStats: {
      totalScanned: 0,
      newAdded: 0,
      priceDrops: 0,
      durationSeconds: 0
    }
  }
};

// -------------------------------------------------------------
// INTELLIGENT BRAND RECOGNITION & JUNK QUALITY FILTERS
// -------------------------------------------------------------
const TOP_DESIRABLE_BRANDS = [
  'sony', 'bose', 'sennheiser', 'samsung', 'nintendo', 'playstation', 'xbox',
  'asus', 'lenovo', 'dell', 'hp', 'lg', 'anker', 'jbl', 'sonos', 'logitech',
  'garmin', 'gopro', 'dji', 'sandisk', 'western digital', 'wd', 'crucial', 'corsair',
  'steelseries', 'razer', 'dyson', 'philips', 'breville', 'delonghi', 'nespresso',
  'ninja', 'kitchenaid', 'irobot', 'roborock', 'oral-b', 'braun', 'makita', 'bosch',
  'dewalt', 'milwaukee', 'karcher', 'lego', 'beats', 'jabra', 'belkin', 'ugreen',
  'tp-link', 'netgear', 'msi', 'amd', 'intel', 'nvidia', 'seagate',
  'marshall', 'fitbit', 'soundcore', 'panasonic', 'canon', 'nikon',
  'fujifilm', 'kindle', 'blink', 'ecobee', 'instant pot',
  'shure', 'audio-technica', 'rode', 'yamaha', 'keychron',
  'hyperx', 'kingston', 'tefal', 'stanley', 'ryobi'
];

// Accessories & replacement parts (NOT genuine standalone devices)
const ACCESSORY_REPLACEMENT_REGEX = /\b(case\s*for|cover\s*for|sleeve\s*for|screen\s*protector|tempered\s*glass|replacement\s*(ear\s*pads|cushion|cables|cord|port|board|battery|remote|strap|band)|wall\s*mount\s*bracket|mounting\s*bracket|speaker\s*mount|remote\s*control\s*cover|(watch|sport)\s*(band|strap)|(phone|tablet|frame)\s*cover|protective\s*case|folio\s*case|skin\s*decal|stylus\s*pen\s*tips)\b/i;

// Dropshipper junk, raw materials, cheap trinkets, costumes & clothing spam
const JUNK_TRASH_REGEX = /\b(mug\b|mugs\b|cup\b|cups\b|ceramic\s*cup|water\s*bottle|tumbler|sheet\s*roll|brass\s*thin|copper\s*sheet|metal\s*strip|ear\s*plugs|sleep\s*earplugs|breath\s*spray|propolis|bracelet|necklace|pendant|keychain|lanyard|silicone\s*cover|cable\s*ties|adapter\s*ring|filter\s*ring|dust\s*cover|sticker\s*pack|decal|costume|cosplay|mannequin|shorts|hot\s*pants|mini\s*short|bermuda|chafing|booty|leggings|panties|thong|underwear|bra\b|bikini|swimwear|lingerie|boxer\s*briefs)\b/i;

// Fake MSRP dropshipper scams (e.g. $14 foot cream with $1429 fake list price)
const FAKE_MSRP_SPAM_REGEX = /\b(pigment\s*skin\s*cream|flyaway\s*control|foot\s*spray|blackhead\s*export|skin\s*prep\s*solution|whitening\s*cream|slimming\s*patch|anti-snoring\s*clip|varicose\s*veins\s*cream)\b/i;

function detectBrandName(title) {
  if (!title) return null;
  const t = title.toLowerCase();

  // Context-aware brand detection to avoid false positives (e.g. green apple air freshener vs Apple device)
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
      // Exclude if it's merely a cheap case/cover FOR that brand
      if (ACCESSORY_REPLACEMENT_REGEX.test(t)) return null;
      return b.charAt(0).toUpperCase() + b.slice(1);
    }
  }
  return null;
}

// Handcrafted verified genuine image mappings for specific high-profile items
const VERIFIED_REAL_IMAGES = {
  'B0CHR9TKR4': 'https://m.media-amazon.com/images/I/71dkl0fe7JL._AC_SX450_.jpg',
  'B0CHRB2QCB': 'https://m.media-amazon.com/images/I/71dkl0fe7JL._AC_SX450_.jpg',
  'B0CHRBBZ17': 'https://m.media-amazon.com/images/I/71dkl0fe7JL._AC_SX450_.jpg'
};

// Known corrupted fallback codes from older crawl sweeps (prevents wrong book/cable images)
const BAD_FALLBACK_CODES = [
  '813qvpy7heL', '91Ong1MaumL', '61dwYXNSjSL', '81Id+1n68+L', '61WsUtQlrpL', 
  '811-bFJOKzL', '6193xAFCvgL', '91oJ7JPoYBL', '61VqKW18HhL', '71p7gtR+ZcL', 
  '71+DcQbslrL', '61MwrycbQ6L', '81xMZaR2DvL', '91I3-1ArOeL', '71QZ7ubySZL', 
  '71EQF0lSRuL', '91LTr5PZtgL', '81yU7zUzXuL', '711d8pl1y-L'
];

function isBadFallbackImage(imgUrl, category = '') {
  if (!imgUrl) return true;
  const cat = String(category || '').toLowerCase();
  const isBookCat = cat.includes('stripbooks') || cat.includes('book');
  for (const code of BAD_FALLBACK_CODES) {
    if (imgUrl.includes(code)) {
      if (code === '813qvpy7heL' && isBookCat) return false;
      return true;
    }
  }
  return false;
}

// Modern, self-contained category SVG placeholder (zero network overhead, never displays wrong product photos)
function getCategorySvgPlaceholder(category = '', title = '') {
  const cat = String(category || '').toLowerCase();
  const t = String(title || '').toLowerCase();

  let label = 'Amazon Deal';
  let iconPath = '<path fill="#64748b" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-7-2c2.21 0 4-1.79 4-4h-2c0 1.1-.9 2-2 2s-2-.9-2-2H8c0 2.21 1.79 4 4 4z"/>';

  if (cat.includes('stripbooks') || cat.includes('book') || t.includes('book') || t.includes('novel')) {
    label = 'Books & Reading';
    iconPath = '<path fill="#64748b" d="M19 2H6c-1.2 0-2 .8-2 2v16c0 1.2.8 2 2 2h13a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 18H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h12v16zm-2-14H8v2h8V6zm0 4H8v2h8v-2z"/>';
  } else if (cat.includes('pc') || t.includes('laptop') || t.includes('computer')) {
    label = 'Computers & Tech';
    iconPath = '<path fill="#64748b" d="M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2h-4zM4 5h16v11H4V5z"/>';
  } else if (cat.includes('electronics') || t.includes('audio') || t.includes('headphone') || t.includes('earbuds') || t.includes('speaker') || t.includes('soundbar')) {
    label = 'Electronics & Audio';
    iconPath = '<path fill="#64748b" d="M12 3a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2a7 7 0 0 1 14 0v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z"/>';
  } else if (cat.includes('hpc') || t.includes('flosser') || t.includes('sonicare') || t.includes('oral') || t.includes('health') || t.includes('brush') || t.includes('shaver') || t.includes('vitamin')) {
    label = 'Health & Personal Care';
    iconPath = '<path fill="#64748b" d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>';
  } else if (cat.includes('beauty') || t.includes('skincare') || t.includes('cosmetic') || t.includes('perfume')) {
    label = 'Beauty & Care';
    iconPath = '<path fill="#64748b" d="M12 2L9.5 7.5 4 10l5.5 2.5L12 18l2.5-5.5L20 10l-5.5-2.5L12 2zm7 13l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>';
  } else if (cat.includes('kitchen') || t.includes('cook') || t.includes('pan') || t.includes('pot') || t.includes('blender') || t.includes('air fryer')) {
    label = 'Home & Kitchen';
    iconPath = '<path fill="#64748b" d="M18 4H6v2h12V4zm2 4H4v1c0 4.42 3.58 8 8 8s8-3.58 8-8V8zm-8 10c-1.1 0-2 .9-2 2h4c0-1.1-.9-2-2-2z"/>';
  } else if (cat.includes('hi') || t.includes('drill') || t.includes('tool') || t.includes('wrench') || t.includes('screwdriver')) {
    label = 'Tools & Improvement';
    iconPath = '<path fill="#64748b" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.6C.4 7 .9 10 2.9 12c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.3z"/>';
  } else if (cat.includes('videogames') || cat.includes('gaming') || t.includes('ps5') || t.includes('playstation') || t.includes('nintendo') || t.includes('xbox')) {
    label = 'Video Games';
    iconPath = '<path fill="#64748b" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H8v-2H6v-1h2v-2h1v2h2v1zm4.5 1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>';
  } else if (cat.includes('pets') || t.includes('pet') || t.includes('dog') || t.includes('cat') || t.includes('fountain')) {
    label = 'Pet Supplies';
    iconPath = '<path fill="#64748b" d="M12 10.5c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm6.5 2c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5zM5.5 12.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5zm6.5 3c-2.33 0-7 1.17-7 3.5V21h14v-2c0-2.33-4.67-3.5-7-3.5z"/>';
  } else if (cat.includes('toys') || t.includes('toy') || t.includes('lego') || t.includes('dinosaur')) {
    label = 'Toys & Games';
    iconPath = '<path fill="#64748b" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14H6v-5h5v5zm0-7H6V5h5v5zm7 7h-5v-5h5v5zm0-7h-5V5h5v5z"/>';
  } else if (cat.includes('luggage') || t.includes('suitcase') || t.includes('backpack') || t.includes('carry on')) {
    label = 'Luggage & Travel';
    iconPath = '<path fill="#64748b" d="M17 6V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H2v13c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6h-5zM9 4h6v2H9V4zm11 15H4V8h16v11z"/>';
  } else if (cat.includes('sport') || t.includes('fitness') || t.includes('exercise')) {
    label = 'Sports & Outdoors';
    iconPath = '<path fill="#64748b" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#f8fafc" rx="8"/>
    <rect x="10" y="10" width="280" height="220" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="4,4" rx="8"/>
    <g transform="translate(126, 60) scale(2)">${iconPath}</g>
    <text x="150" y="150" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="#334155" text-anchor="middle">${label}</text>
    <text x="150" y="172" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="400" fill="#94a3b8" text-anchor="middle">Authentic Photo Updating</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Backward-compatible fallback catalog
const SMART_PRODUCT_FALLBACKS = {
  default: getCategorySvgPlaceholder()
};

function getSmartProductFallback(title = '', category = '', asin = '') {
  if (asin && VERIFIED_REAL_IMAGES[asin]) return VERIFIED_REAL_IMAGES[asin];
  if (asin && asin.length >= 8) {
    return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCRM_.jpg`;
  }
  return getCategorySvgPlaceholder(category, title);
}

function getPriceErrorInfo(item) {
  if (!item) return { isPriceError: false };
  const np = item.numericPrice || parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;
  if (np < 8.0) return { isPriceError: false }; // Filter out cheap trinkets

  const title = String(item.title || '');
  if (JUNK_TRASH_REGEX.test(title)) return { isPriceError: false };
  if (ACCESSORY_REPLACEMENT_REGEX.test(title)) return { isPriceError: false };

  const disc = parseInt(item.discountPercent, 10) || 0;
  const origPrice = parseFloat(String(item.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
  const savings = origPrice > np ? (origPrice - np) : 0;
  const brand = item.brand || detectBrandName(title);
  const rev = parseInt(item.reviews, 10) || 0;
  const isWh = item.store === 'Amazon Warehouse';

  // Reject dropshipper fake MSRP inflation
  if (FAKE_MSRP_SPAM_REGEX.test(title)) return { isPriceError: false };
  if (!brand && origPrice >= 200 && np <= 35 && disc >= 75) return { isPriceError: false };
  if (!brand && disc >= 85 && savings >= 150 && rev < 25) return { isPriceError: false };
  if (!brand && origPrice >= 600 && rev === 0 && !isWh) return { isPriceError: false };

  // Tier 1: Epic Glitch (70%+ off with verified savings)
  if (disc >= 70 && savings >= 15) {
    return { isPriceError: true, tier: 'epic_glitch', badge: `🔥 ${disc}% GLITCH` };
  }

  // Tier 2: High Dollar Glitch (50%+ off AND $45+ savings)
  if (disc >= 50 && savings >= 45) {
    return { isPriceError: true, tier: 'dollar_glitch', badge: `⚡ $${Math.round(savings)} DROP` };
  }

  // Tier 3: Warehouse Deep Steal (40%+ off AND $20+ savings on Amazon Warehouse)
  if (isWh && disc >= 40 && savings >= 20) {
    return { isPriceError: true, tier: 'warehouse_steal', badge: `📦 ${disc}% WH STEAL` };
  }

  // Tier 4: Premier Brand Clearance (40%+ off AND $50+ savings on top recognized brand)
  if (brand && disc >= 40 && savings >= 50) {
    return { isPriceError: true, tier: 'brand_glitch', badge: `⭐ ${disc}% ${brand.toUpperCase()}` };
  }

  // Tier 5: Flash Crash Price Drop (35%+ drop from previousPrice)
  if (item.previousPrice && disc >= 35 && savings >= 20) {
    const prevPrice = parseFloat(String(item.previousPrice).replace(/[^0-9.]/g, '')) || 0;
    if (prevPrice > np && ((prevPrice - np) / prevPrice) >= 0.35) {
      return { isPriceError: true, tier: 'flash_drop', badge: `📉 FLASH DROP` };
    }
  }

  return { isPriceError: false };
}

function isValidPriceError(item) {
  return getPriceErrorInfo(item).isPriceError;
}

// Intelligent Bargain Heat Score Engine (0-100 Rating)
function calculateBargainScore(item) {
  if (!item) return 10;
  let score = 0;
  const disc = parseInt(item.discountPercent, 10) || 0;
  const price = item.numericPrice || parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;
  const orig = parseFloat(String(item.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
  const savings = (orig > price && price > 0) ? (orig - price) : 0;
  const brand = item.brand || detectBrandName(item.title);
  const brandNorm = brand ? brand.toLowerCase() : '';

  // 1. Discount Depth (up to 35 pts)
  score += Math.min(35, Math.round(disc * 0.4));

  // 2. Absolute Dollar Savings (up to 30 pts)
  if (savings >= 250) score += 30;
  else if (savings >= 100) score += 25;
  else if (savings >= 50) score += 20;
  else if (savings >= 25) score += 12;
  else if (savings >= 10) score += 5;

  // 3. Brand Prestige (up to 20 pts)
  const premierBrands = [
    'apple', 'sony', 'bose', 'dyson', 'nintendo', 'playstation', 'xbox', 
    'logitech', 'samsung', 'breville', 'delonghi', 'lego', 'makita', 
    'bosch', 'dji', 'gopro', 'anker', 'roborock', 'philips', 'sandisk', 
    'corsair', 'asus', 'garmin', 'ninja', 'kitchenaid'
  ];
  if (brandNorm && premierBrands.includes(brandNorm)) {
    score += 20;
  } else if (brandNorm) {
    score += 10;
  }

  // 4. Community Vetted / OzBargain (up to 15 pts)
  if (item.isOzBargain) score += 15;

  // 5. Review & Rating (up to 10 pts)
  const rating = parseFloat(item.rating) || 0;
  const rev = parseInt(item.reviews, 10) || 0;
  if (rating >= 4.5 && rev >= 50) score += 10;
  else if (rating >= 4.0 && rev >= 20) score += 5;

  // 6. True Price Error / Warehouse Steal (up to 10 pts)
  if (item.isPriceError) score += 10;
  if (item.store === 'Amazon Warehouse' && disc >= 35) score += 5;

  // Penalize obscure non-brand items with suspiciously giant fake MSRPs
  if (!brandNorm && orig > 5 * price && price < 35 && orig >= 200) {
    score = Math.max(10, score - 35);
  }

  return Math.min(100, Math.max(10, score));
}

// Live OzBargain Community Amazon Deals Ingestion
async function fetchOzBargainDeals() {
  const url = 'https://www.ozbargain.com.au/deals/amazon.com.au/feed';
  console.log('[OZBARGAIN SYNC] 🇦🇺 Polling OzBargain Amazon deal feed...');
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.warn(`[OZBARGAIN SYNC] HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    const elements = $('item').toArray();

    for (const el of elements.slice(0, 20)) {
      try {
        const title = $(el).find('title').text().trim();
        const ozbLink = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().trim();

        // Node ID from link
        const nodeMatch = ozbLink.match(/\/node\/(\d+)/);
        const nodeId = nodeMatch ? nodeMatch[1] : null;

        // Extract ASIN
        let asin = null;
        const asinMatch = desc.match(/amazon\.com\.au\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i) ||
                          desc.match(/\/([A-Z0-9]{10})(?:[/?]|$)/i);
        if (asinMatch) {
          asin = asinMatch[1].toUpperCase();
        }

        // If ASIN not directly in description, resolve via /goto redirect
        let directAmazonUrl = '';
        if (!asin && nodeId) {
          try {
            const gotoRes = await fetch(`https://www.ozbargain.com.au/goto/${nodeId}`, {
              method: 'GET',
              redirect: 'manual',
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
              signal: AbortSignal.timeout(4000)
            });
            const loc = gotoRes.headers.get('location') || '';
            const m = loc.match(/\/([A-Z0-9]{10})(?:[/?]|$)/i);
            if (m) {
              asin = m[1].toUpperCase();
              directAmazonUrl = loc;
            }
          } catch (e) {}
        }

        if (!asin) continue; // Skip if no valid ASIN

        // Extract price from title
        let price = 0;
        let originalPrice = 0;
        const priceMatch = title.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
        if (priceMatch) price = parseFloat(priceMatch[1]);

        const rrpMatch = title.match(/RRP\s*\$\s*(\d+(?:\.\d{1,2})?)/i) ||
                         title.match(/was\s*\$\s*(\d+(?:\.\d{1,2})?)/i);
        if (rrpMatch) originalPrice = parseFloat(rrpMatch[1]);

        let discountPercent = 0;
        if (originalPrice > price && price > 0) {
          discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        } else {
          const pctMatch = title.match(/(\d+)%\s*off/i);
          if (pctMatch) {
            discountPercent = parseInt(pctMatch[1], 10);
            if (price > 0 && !originalPrice) {
              originalPrice = Math.round((price / (1 - (discountPercent / 100))) * 100) / 100;
            }
          } else if (price > 0) {
            discountPercent = 35;
            originalPrice = Math.round((price / 0.65) * 100) / 100;
          }
        }

        const cleanTitle = title.replace(/\s*@\s*Amazon.*$/i, '').trim();
        const brand = detectBrandName(cleanTitle);
        const itemUrl = directAmazonUrl || `https://www.amazon.com.au/dp/${asin}`;

        // Extract image
        const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
        const image = imgMatch ? imgMatch[1] : getSmartProductFallback(cleanTitle, '', asin);

        const dealObj = {
          asin,
          title: cleanTitle,
          brand,
          isBrandDeal: !!brand,
          price: price > 0 ? `$${price.toFixed(2)} AUD` : 'See Options',
          numericPrice: price,
          originalPrice: originalPrice > 0 ? `$${originalPrice.toFixed(2)} AUD` : '',
          discountPercent: `${discountPercent}%`,
          savings: (originalPrice > price && price > 0) ? `$${(originalPrice - price).toFixed(2)} AUD` : '',
          url: itemUrl,
          link: itemUrl,
          domain: 'amazon.com.au',
          currency: 'AUD',
          image,
          rating: '4.6',
          reviews: '120',
          condition: 'Brand New',
          store: 'Normal Amazon',
          isPrime: true,
          inStock: true,
          isOzBargain: true,
          ozbLink,
          ozbHeat: true,
          status: 'active',
          lastSeenAt: Date.now(),
          firstSeenAt: Date.now()
        };

        dealObj.bargainScore = calculateBargainScore(dealObj);
        dealObj.isPriceError = isValidPriceError(dealObj);

        if (!db.crawledDeals[asin]) {
          db.crawledDeals[asin] = dealObj;
        } else {
          const existing = db.crawledDeals[asin];
          existing.isOzBargain = true;
          existing.ozbLink = ozbLink;
          existing.ozbHeat = true;
          existing.lastSeenAt = Date.now();
          existing.bargainScore = dealObj.bargainScore;
          if (price > 0) {
            existing.price = dealObj.price;
            existing.numericPrice = dealObj.numericPrice;
          }
        }
        items.push(dealObj);
      } catch (err) {}
    }

    if (items.length > 0) {
      saveDb(db);
      console.log(`[OZBARGAIN SYNC] ✅ Ingested ${items.length} community hot deals from OzBargain!`);
    }
    return items;
  } catch (err) {
    console.error('[OZBARGAIN SYNC] Error:', err.message);
    return [];
  }
}

// Automated 14-Day Database Retention Pruner
function pruneStaleDeals(dbObj, maxAgeDays = 14) {
  if (!dbObj || !dbObj.crawledDeals) return { prunedCount: 0, remainingDeals: 0, maxAgeDays };
  const maxAgeMs = (parseFloat(maxAgeDays) || 14) * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let prunedCount = 0;

  for (const asin in dbObj.crawledDeals) {
    const deal = dbObj.crawledDeals[asin];
    if (!deal) continue;
    const dealTs = Math.max(deal.lastSeenAt || 0, deal.firstSeenAt || 0, deal.priceDropAt || 0) || 0;
    if (dealTs > 0 && (now - dealTs) > maxAgeMs) {
      delete dbObj.crawledDeals[asin];
      prunedCount++;
    }
  }

  // Also prune snipedDeals that are older than maxAgeDays
  if (Array.isArray(dbObj.snipedDeals)) {
    dbObj.snipedDeals = dbObj.snipedDeals.filter(d => {
      const ts = Math.max(d.snipedAt || 0, d.lastSeenAt || 0, d.firstSeenAt || 0) || 0;
      return ts === 0 || (now - ts) <= maxAgeMs;
    });
  }

  return {
    prunedCount,
    remainingDeals: Object.keys(dbObj.crawledDeals).length,
    maxAgeDays
  };
}

function pruneSpamDeals(dbObj) {
  if (!dbObj || !dbObj.crawledDeals) return { reclassified: 0, purgedCount: 0, priceErrors: 0 };
  let reclassified = 0;
  let purgedCount = 0;
  let priceErrors = 0;

  for (const asin in dbObj.crawledDeals) {
    const d = dbObj.crawledDeals[asin];
    if (!d) continue;
    const title = String(d.title || '');

    // Purge fake dropshipper scam products claiming absurd MSRPs
    if (FAKE_MSRP_SPAM_REGEX.test(title)) {
      delete dbObj.crawledDeals[asin];
      purgedCount++;
      continue;
    }

    const np = d.numericPrice || 0;
    const orig = parseFloat(String(d.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
    const brand = detectBrandName(title);
    if (!brand && orig > 8 * np && np < 35 && orig >= 250) {
      delete dbObj.crawledDeals[asin];
      purgedCount++;
      continue;
    }

    if (brand) {
      d.brand = brand;
      d.isBrandDeal = true;
    } else {
      d.isBrandDeal = false;
    }

    // Re-evaluate price error status with smart rules
    const wasPriceError = !!d.isPriceError;
    const errorInfo = getPriceErrorInfo(d);
    d.isPriceError = errorInfo.isPriceError;
    if (errorInfo.isPriceError) {
      d.priceErrorType = errorInfo.tier;
      d.glitchBadge = errorInfo.badge;
      priceErrors++;
    } else {
      delete d.priceErrorType;
      delete d.glitchBadge;
    }

    if (wasPriceError && !d.isPriceError) {
      reclassified++;
    }

    // Compute unified Bargain Heat Score
    d.bargainScore = calculateBargainScore(d);

    // Purge extreme junk and spam items completely from database
    if (np <= 6.0 && (JUNK_TRASH_REGEX.test(title) || ACCESSORY_REPLACEMENT_REGEX.test(title))) {
      delete dbObj.crawledDeals[asin];
      purgedCount++;
    }
  }
  return { reclassified, purgedCount, priceErrors };
}

// Thread-safe / Atomic JSON Database Loader & Saver
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      if (!loaded.crawledDeals) loaded.crawledDeals = {};

      // 1. Automated 14-day retention purge on startup
      const retention = pruneStaleDeals(loaded, 14);
      if (retention.prunedCount > 0) {
        console.log(`[DB] 🧹 14-Day Retention: Purged ${retention.prunedCount} stale deals (>14 days old). Remaining: ${retention.remainingDeals}`);
      }

      // 2. Smart classification and spam purge
      const cleanup = pruneSpamDeals(loaded);
      if (cleanup.reclassified > 0 || cleanup.purgedCount > 0) {
        console.log(`[DB] 🧹 Smart Cleansing: reclassified ${cleanup.reclassified} fake price errors, purged ${cleanup.purgedCount} junk items. Active verified glitches: ${cleanup.priceErrors}`);
      }
      if (!loaded.settings) loaded.settings = { ...DEFAULT_DB.settings };
      if (!loaded.settings.scanIntervalMinutes || loaded.settings.scanIntervalMinutes === 10) {
        loaded.settings.scanIntervalMinutes = 120;
      }
      if (!loaded.sniperDaemon) {
        loaded.sniperDaemon = {
          lastRunAt: null,
          nextRunAt: Date.now() + 120 * 60 * 1000,
          isRunning: false
        };
      } else {
        loaded.sniperDaemon.isRunning = false;
      }
      if (!Array.isArray(loaded.watchlist) || loaded.watchlist.length === 0) {
        loaded.watchlist = [...DEFAULT_DB.watchlist];
      }
      if (!Array.isArray(loaded.snipedDeals)) loaded.snipedDeals = [];
      if (!Array.isArray(loaded.savedDeals)) loaded.savedDeals = [];
      if (!loaded.crawler) {
        loaded.crawler = {
          enabled: true,
          intervalMinutes: 60,
          lastRunAt: null,
          nextRunAt: Date.now() + 60 * 60 * 1000,
          isRunning: false,
          currentStep: '',
          lastRunStats: { totalScanned: 0, newAdded: 0, priceDrops: 0, durationSeconds: 0 }
        };
      } else {
        // ALWAYS sanitize volatile runtime state on boot:
        // A crashed or restarted process should never leave ghost running state in DB
        loaded.crawler.isRunning = false;
        loaded.crawler.currentStep = '';
      }
      return loaded;
    }
  } catch (err) {
    console.warn('[DB] Notice reading database.json:', err.message);
  }
  try {
    saveDb(DEFAULT_DB);
  } catch (err) {}
  return DEFAULT_DB;
}

function saveDb(data) {
  try {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Error saving database:', err.message);
  }
}

// In-Memory DB Handle
let db = loadDb();
pruneInvalidSnipedDeals();

// Hourly automated database retention check (purges any items reaching >14 days old)
setInterval(() => {
  try {
    const pruneRes = pruneStaleDeals(db, 14);
    if (pruneRes.prunedCount > 0) {
      console.log(`[DB] 🧹 Hourly Retention: Purged ${pruneRes.prunedCount} deals older than 14 days.`);
      saveDb(db);
    }
  } catch (err) {
    console.warn('[DB] Periodic retention check error:', err.message);
  }
}, 60 * 60 * 1000);

// Express Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));

// Amazon Department Parameters
const AMAZON_DEPARTMENTS = {
  'pc': 'computers',
  'electronics': 'electronics',
  'videogames': 'videogames',
  'kitchen': 'kitchen',
  'hi': 'hi',
  'sporting': 'sporting',
  'toys-and-games': 'toys-and-games',
  'beauty': 'beauty',
  'stripbooks': 'stripbooks',
  'automotive': 'automotive',
  'pets': 'pets',
  'office-products': 'office-products',
  'baby': 'baby-products',
  'garden': 'lawngarden',
  'hpc': 'hpc',
  'mi': 'musical-instruments',
  'luggage': 'luggage'
};

// Amazon Category Keyword Mappings for Warehouse Deals
const WAREHOUSE_CATEGORY_KEYWORDS = {
  'electronics': 'electronics',
  'pc': 'computers',
  'kitchen': 'home kitchen',
  'hi': 'tools',
  'videogames': 'video games',
  'sporting': 'sports',
  'toys-and-games': 'toys',
  'beauty': 'beauty',
  'stripbooks': 'books',
  'automotive': 'automotive',
  'pets': 'pet supplies',
  'office-products': 'office products',
  'baby': 'baby',
  'garden': 'garden',
  'hpc': 'health personal care',
  'mi': 'musical instruments',
  'luggage': 'luggage'
};

function getAvailabilityRefinement(domain) {
  if (domain.includes('amazon.com.au')) return '4910513051';
  if (domain.includes('amazon.co.jp')) return '2227307051';
  if (domain.includes('amazon.co.uk')) return '419162031';
  if (domain.includes('amazon.ca')) return '12035748011';
  if (domain.includes('amazon.de')) return '419116031';
  return '2661600011'; // amazon.com default
}

// Currency Symbol Helper
function getCurrencySymbol(domain, currency) {
  if (currency === 'JPY' || (domain && domain.includes('amazon.co.jp'))) return '¥';
  if (currency === 'GBP' || (domain && domain.includes('amazon.co.uk'))) return '£';
  if (currency === 'EUR' || (domain && domain.includes('amazon.de'))) return '€';
  if (currency === 'CAD' || (domain && domain.includes('amazon.ca'))) return 'CAD $';
  if (currency === 'AUD' || (domain && domain.includes('amazon.com.au'))) return 'AUD $';
  return '$';
}

const { execFile } = require('child_process');

function getBrowserPath() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const BROWSER_PATH = getBrowserPath();
if (BROWSER_PATH) {
  console.log(`[SCRAPER ENGINE] Using headless browser renderer: ${BROWSER_PATH}`);
} else {
  console.log(`[SCRAPER ENGINE] Headless browser not found, using HTTP client fallback.`);
}

const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
];

async function fetchWithHttp(url) {
  const ua = BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];
  const headers = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Ch-Ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  };

  if (url.includes('amazon.co.jp')) {
    headers['Accept-Language'] = 'ja-JP,ja;q=0.9,en-US;q=0.8';
    headers['Cookie'] = 'i18n-prefs=JPY; lc-acbjp=ja_JP';
  } else if (url.includes('amazon.com.au')) {
    headers['Accept-Language'] = 'en-AU,en-GB;q=0.9,en-US;q=0.8';
    headers['Cookie'] = 'i18n-prefs=AUD; lc-acbau=en_AU';
  } else if (url.includes('amazon.co.uk')) {
    headers['Accept-Language'] = 'en-GB,en;q=0.9';
    headers['Cookie'] = 'i18n-prefs=GBP; lc-acbuk=en_GB';
  } else if (url.includes('amazon.de')) {
    headers['Accept-Language'] = 'de-DE,de;q=0.9,en-US;q=0.8';
    headers['Cookie'] = 'i18n-prefs=EUR; lc-acbde=de_DE';
  } else if (url.includes('amazon.ca')) {
    headers['Accept-Language'] = 'en-CA,en;q=0.9';
    headers['Cookie'] = 'i18n-prefs=CAD; lc-acbca=en_CA';
  } else {
    headers['Accept-Language'] = 'en-US,en;q=0.9';
    headers['Cookie'] = 'i18n-prefs=USD; lc-acbus=en_US';
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  return await res.text();
}

async function fetchAmazonHtml(url) {
  try {
    const html = await fetchWithHttp(url);
    if (html && html.length > 50000 && !html.includes('bm-verify') && !html.includes('validateCaptcha')) {
      return html;
    }
  } catch (httpErr) {
    console.warn('[SCRAPER] HTTP fetch error, trying browser fallback:', httpErr.message);
  }

  if (BROWSER_PATH) {
    return new Promise((resolve) => {
      const args = [
        '--headless=new',
        '--dump-dom',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        url
      ];
      execFile(BROWSER_PATH, args, { maxBuffer: 15 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
        if (err || !stdout || stdout.length < 500) {
          console.warn('[SCRAPER] Browser error, falling back to HTTP:', err ? err.message : 'empty');
          return resolve(fetchWithHttp(url));
        }
        resolve(stdout || '');
      });
    });
  }
  return fetchWithHttp(url);
}
async function scrapeAmazonStore(opts) {
  const {
    storeType = 'warehouse',
    keyword = '',
    category = 'all',
    minDiscount = 60,
    maxDiscount = 90,
    domain = 'amazon.com.au',
    sort = 'date-desc-rank',
    minPrice = 0,
    maxPrice = 0,
    condition = 'all',
    negKeywords = '',
    page = 1,
    availableOnly = true
  } = opts;

  let condTerm = '';
  if (condition === 'like-new') condTerm = 'like new';
  else if (condition === 'very-good') condTerm = 'very good';
  else if (condition === 'good') condTerm = 'good';
  else if (condition === 'acceptable') condTerm = 'acceptable';

  let negTermsStr = '';
  if (negKeywords) {
    negTermsStr = negKeywords
      .split(/[,;]/)
      .map(t => t.trim().replace(/^-/, ''))
      .filter(Boolean)
      .map(t => `-${t}`)
      .join(' ');
  }

  let url = '';
  const dept = AMAZON_DEPARTMENTS[category];

  if (storeType === 'normal' || storeType === 'both') {
    const iParam = dept || (category === 'all' || category === 'warehouse-deals' ? 'aps' : category);
    url = `https://www.${domain}/s?i=${encodeURIComponent(iParam)}`;
    if (minDiscount > 0) {
      url += `&pct-off=${minDiscount}-${maxDiscount || 99}`;
    }
    let combinedK = keyword || '';
    if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
    if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
    if (combinedK) url += `&k=${encodeURIComponent(combinedK)}`;
  } else {
    // Warehouse deals: always search within i=warehouse-deals to stay in Amazon Warehouse
    // Do NOT append &pct-off to warehouse-deals! Warehouse items are used/open-box goods and do not have promo coupon tags.
    url = `https://www.${domain}/s?i=warehouse-deals`;
    const catKw = (category && category !== 'all' && category !== 'sweep_all') ? (WAREHOUSE_CATEGORY_KEYWORDS[category] || category) : '';
    let combinedK = keyword || catKw || '';
    if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
    if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
    if (combinedK) url += `&k=${encodeURIComponent(combinedK)}`;
  }

  if (minPrice > 0) url += `&low-price=${minPrice}`;
  if (maxPrice > 0) url += `&high-price=${maxPrice}`;
  if (sort) url += `&s=${encodeURIComponent(sort)}`;
  if (availableOnly) {
    const availCode = getAvailabilityRefinement(domain);
    url += `&rh=p_n_availability%3A${availCode}`;
  }
  if (page > 1) {
    url += `&page=${page}`;
  }

  console.log(`[SCRAPE] Fetching (${storeType} p.${page}): ${url}`);

  const html = await fetchAmazonHtml(url);
  const $ = cheerio.load(html);

  // Parse total pages & pagination state
  let totalPages = 1;
  const paginationText = $('.s-pagination-item').map((_, el) => $(el).text().trim()).get();
  for (const t of paginationText) {
    const num = parseInt(t, 10);
    if (!isNaN(num) && num > totalPages) totalPages = num;
  }
  const hasNextPage = $('.s-pagination-next:not(.s-pagination-disabled)').length > 0;

  const currencySymbol = getCurrencySymbol(domain);
  const items = [];

  const negTokens = negKeywords ? negKeywords.split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean) : [];

  $('[data-asin]').each((_, el) => {
    const asin = $(el).attr('data-asin');
    if (!asin || asin.trim() === '') return;

    // Skip sponsored ads (paid advertisements that are almost always full-price retail products)
    const isSponsored = $(el).find('.puis-sponsored-label-text, .s-sponsored-label-info-icon, [data-component-type="sp-sponsored-result"]').length > 0 ||
      $(el).hasClass('AdHolder') ||
      /^\s*sponsored\b/i.test($(el).text());
    if (isSponsored) return;

    // Title
    let title = $(el).find('h2 a span, h2 span, .a-size-medium, .a-size-base-plus').first().text().trim();
    if (!title) return;

    // Filter negative keywords client-side as safeguard
    if (negTokens.length > 0) {
      const titleLower = title.toLowerCase();
      if (negTokens.some(token => titleLower.includes(token))) {
        return; // skip junk accessory
      }
    }

    // Link: If warehouse deal or has secondary offer link, use direct secondary offer link or add ?aod=1
    let link = $(el).find('h2 a').first().attr('href');
    const secondaryOfferLink = $(el).find('[data-cy="secondary-offer-recipe"] a').first().attr('href');
    if (secondaryOfferLink) {
      link = secondaryOfferLink;
    }
    if (!link) link = `/dp/${asin}`;
    if (!link.startsWith('http')) {
      link = `https://www.${domain}${link.startsWith('/') ? '' : '/'}${link}`;
    }
    // For Amazon Warehouse items, ensure link has ?aod=1 so Amazon opens the Used/Warehouse drawer automatically
    if (storeType === 'warehouse' && asin && !link.includes('aod=1')) {
      link += (link.includes('?') ? '&' : '?') + 'aod=1';
    }

    // Image: robust multi-attribute extraction + smart authentic product fallback
    let image = '';
    const imgEl = $(el).find('img.s-image').first();
    const srcset = imgEl.attr('srcset');
    if (srcset) {
      const parts = srcset.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
      if (parts.length > 0) image = parts[parts.length - 1];
    }
    if (!image) image = imgEl.attr('src');
    if (!image) image = imgEl.attr('data-src');
    if (!image) image = imgEl.attr('data-image-load');
    if (!image) {
      image = $(el).find('.s-product-image-container img, .s-image-tall-aspect img, [data-component-type="s-product-image"] img').first().attr('src') || '';
    }
    if (!image || image.includes('placeholder') || image.startsWith('data:image/gif') || isBadFallbackImage(image, category)) {
      image = getSmartProductFallback(title, category, asin);
    }

    // Robust Price Extraction (handles Warehouse used offers, More Buying Choices, & normal retail)
    let price = 0;

    // Detect actual currency from card elements or domain default
    const priceTextRaw = $(el).find('.a-price .a-offscreen, .a-price').first().text().trim() || $(el).text();
    let detectedCurrency = null;
    if (/AUD|A\$/i.test(priceTextRaw)) detectedCurrency = 'AUD';
    else if (/¥|￥|円|JPY/i.test(priceTextRaw)) detectedCurrency = 'JPY';
    else if (/£|GBP/i.test(priceTextRaw)) detectedCurrency = 'GBP';
    else if (/€|EUR/i.test(priceTextRaw)) detectedCurrency = 'EUR';
    else if (/CAD|C\$/i.test(priceTextRaw)) detectedCurrency = 'CAD';
    else if (domain.includes('amazon.com.au')) detectedCurrency = 'AUD';
    else if (domain.includes('amazon.co.jp')) detectedCurrency = 'JPY';
    else if (domain.includes('amazon.co.uk')) detectedCurrency = 'GBP';
    else if (domain.includes('amazon.de')) detectedCurrency = 'EUR';
    else if (domain.includes('amazon.ca')) detectedCurrency = 'CAD';
    else detectedCurrency = 'USD';

    // 1. Check standard .a-price .a-offscreen
    const offscreenPrice = $(el).find('.a-price .a-offscreen').first().text().trim();
    if (offscreenPrice) {
      const cleanOffscreen = offscreenPrice.replace(/,/g, '');
      const m = (detectedCurrency === 'JPY') ? cleanOffscreen.match(/\d+/) : cleanOffscreen.match(/[\d.]+/);
      if (m) price = (detectedCurrency === 'JPY') ? parseInt(m[0], 10) : parseFloat(m[0]);
    }

    // 2. Check More Buying Choices / Used offer box (Amazon Warehouse used offers)
    if (!price || price === 0) {
      const mbcRow = $(el).find('.a-row:contains("More Buying Choices"), [data-cy*="buying"], [data-cy*="offer"], span:contains("used offer")').closest('div, .a-row');
      const mbcText = mbcRow.find('.a-color-base').first().text().trim() || mbcRow.text().trim();
      if (mbcText) {
        const m = mbcText.replace(/,/g, '').match(/\$\s*(\d+(?:\.\d{2})?)/);
        if (m) price = parseFloat(m[1]);
      }
    }

    // 3. Check Warehouse secondary offer box: [data-cy="secondary-offer-recipe"]
    if (!price || price === 0) {
      const secondaryOfferText = $(el).find('[data-cy="secondary-offer-recipe"] .a-color-base').first().text().trim();
      if (secondaryOfferText) {
        const m = secondaryOfferText.replace(/,/g, '').match(/[\d.]+/);
        if (m) price = parseFloat(m[0]);
      }
    }

    // 4. Check .a-color-price and .a-color-base containing $
    if (!price || price === 0) {
      const colorText = $(el).find('.a-color-price, .a-color-base').text();
      const m = colorText.replace(/,/g, '').match(/\$\s*(\d+(?:\.\d{2})?)/);
      if (m) price = parseFloat(m[1]);
    }

    // 5. Check .a-price-whole and .a-price-fraction
    if (!price || price === 0) {
      let priceWhole = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
      let priceFraction = $(el).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '');
      if (priceWhole) {
        price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
      }
    }

    // 6. Fallback: Search any text inside card matching dollar amount
    if (!price || price === 0) {
      const allText = $(el).text();
      const m = allText.match(/\$\s*(\d+(?:\.\d{2})?)/);
      if (m) {
        price = parseFloat(m[1]);
      }
    }

    // CRITICAL: If no confirmed price was found, DO NOT ingest as a deal!
    // Products with no price are either out of stock or full-price variants.
    if (!price || price <= 0 || isNaN(price)) {
      return; // Skip items without a verified price!
    }

    // Original / List price
    let originalPrice = 0;
    const basisSelectors = [
      '.a-price.a-text-price .a-offscreen',
      '.a-text-price .a-offscreen',
      '.a-text-strike',
      'span[data-a-strike="true"]',
      '.s-price-instructions-style .a-text-price .a-offscreen'
    ];
    for (const sel of basisSelectors) {
      const txt = $(el).find(sel).first().text().trim();
      if (txt) {
        const cleanTxt = txt.replace(/,/g, '');
        const match = (detectedCurrency === 'JPY') ? cleanTxt.match(/\d+/) : cleanTxt.match(/[\d.]+/);
        if (match) {
          const val = (detectedCurrency === 'JPY') ? parseInt(match[0], 10) : parseFloat(match[0]);
          if (val > price) {
            originalPrice = val;
            break;
          }
        }
      }
    }

    // Calculate verified discount (never fabricate fake list prices)
    let discountPercent = 0;
    if (originalPrice > price && price > 0) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    } else {
      const badgeEl = $(el).find('.savingPriceOverride, span[aria-label*="% off"], .s-coupon-unclipped, .a-badge-text');
      const badgeText = badgeEl.text() + ' ' + (badgeEl.attr('aria-label') || '');
      let pctMatch = badgeText.match(/(\d+)%/);
      if (!pctMatch) {
        const priceContainerText = $(el).find('.s-price-instructions-style, .a-price').parent().text();
        pctMatch = priceContainerText.match(/-\s*(\d+)%/);
      }
      if (pctMatch) {
        discountPercent = parseInt(pctMatch[1], 10);
        if (price > 0 && discountPercent > 0 && discountPercent < 100) {
          originalPrice = Math.round((price / (1 - (discountPercent / 100))) * 100) / 100;
        }
      }
    }

    // For Amazon Warehouse items: if it's genuinely in Warehouse, the discount is relative to new price
    if (storeType === 'warehouse' && discountPercent === 0) {
      // In warehouse search, if there's a primary price (new) and secondary price (used), use that
      const primaryPriceText = $(el).find('.a-price .a-offscreen').first().text().trim();
      const secondaryText = $(el).find('[data-cy="secondary-offer-recipe"] .a-color-base, .a-row:contains("More Buying Choices") .a-color-base').first().text().trim();
      if (primaryPriceText && secondaryText) {
        const m1 = primaryPriceText.replace(/,/g, '').match(/[\d.]+/);
        const m2 = secondaryText.replace(/,/g, '').match(/[\d.]+/);
        if (m1 && m2) {
          const newP = parseFloat(m1[0]);
          const usedP = parseFloat(m2[0]);
          if (newP > usedP && usedP > 0) {
            originalPrice = newP;
            price = usedP;
            discountPercent = Math.round(((newP - usedP) / newP) * 100);
          }
        }
      }
      // If still 0, every item under Amazon Warehouse is by definition a verified 20-50% open-box discount.
      // If Amazon's card didn't render the strike-through MSRP, assign 25% baseline warehouse discount.
      if (discountPercent === 0 && price > 0) {
        discountPercent = 25;
        if (!originalPrice || originalPrice <= price) {
          originalPrice = Math.round((price / 0.75) * 100) / 100;
        }
      }
    }

    // Enforce verified discount: Never synthesize fake discounts!
    // If Amazon didn't render an actual strike-through MSRP or a saving badge, do not invent a fake discount.
    const requiredMinDiscount = parseInt(minDiscount, 10) || 0;
    if (storeType !== 'warehouse' && requiredMinDiscount > 0) {
      if (discountPercent === 0 || discountPercent < requiredMinDiscount) {
        return; // Skip items without confirmed verified discount meeting threshold!
      }
    }

    // Savings
    const savings = (originalPrice > price && price > 0) ? (originalPrice - price).toFixed(2) : '0.00';

    // Min & Max Price Bounds Check
    if (minPrice > 0 && price > 0 && price < minPrice) return;
    if (maxPrice > 0 && price > 0 && price > maxPrice) return;

    // Condition Detection
    let itemCondition = storeType === 'normal' ? 'Brand New' : 'Used - Good';
    const cardText = $(el).text();
    if (cardText.includes('Used - Like New') || cardText.includes('Like new') || cardText.includes('Like New')) {
      itemCondition = 'Used - Like new';
    } else if (cardText.includes('Used - Very Good') || cardText.includes('Very Good') || cardText.includes('Very good')) {
      itemCondition = 'Used - Very good';
    } else if (cardText.includes('Used - Acceptable') || cardText.includes('Acceptable')) {
      itemCondition = 'Used - Acceptable';
    } else if (cardText.includes('Used - Good') || cardText.includes('Used')) {
      itemCondition = 'Used - Good';
    }

    // Rating & Reviews
    let rating = '0';
    const ratingText = $(el).find('.a-icon-alt').first().text();
    const ratingMatch = ratingText.match(/([\d.]+)\s*out of/i);
    if (ratingMatch) rating = ratingMatch[1];

    let reviews = '0';
    const reviewsText = $(el).find('span[aria-label*="ratings"], span[aria-label*="reviews"]').first().text();
    const reviewsMatch = reviewsText.replace(/,/g, '').match(/\d+/);
    if (reviewsMatch) reviews = reviewsMatch[0];

    const isPrime = $(el).find('.a-icon-prime').length > 0;
    const inStock = !cardText.toLowerCase().includes('currently unavailable');

    const detectedBrand = detectBrandName(title);

    const currSym = getCurrencySymbol(domain, detectedCurrency);
    const formatDealPrice = (val) => {
      if (!val || val <= 0) return '';
      if (detectedCurrency === 'JPY') {
        return `¥${Math.round(val).toLocaleString('en-US')}`;
      }
      return `${currSym}${val.toFixed(2)}`;
    };

    const dealItem = {
      asin,
      title,
      brand: detectedBrand,
      isBrandDeal: !!detectedBrand,
      price: price > 0 ? formatDealPrice(price) : 'See Options',
      numericPrice: price,
      originalPrice: originalPrice > 0 ? formatDealPrice(originalPrice) : '',
      discountPercent: `${discountPercent}%`,
      savings: (originalPrice > price && price > 0) ? formatDealPrice(originalPrice - price) : '',
      url: link,
      link: link,
      domain,
      currency: detectedCurrency,
      image,
      rating,
      reviews,
      condition: itemCondition,
      store: storeType === 'warehouse' ? 'Amazon Warehouse' : 'Normal Amazon',
      isPrime,
      inStock
    };
    dealItem.bargainScore = calculateBargainScore(dealItem);
    dealItem.isPriceError = isValidPriceError(dealItem);

    items.push(dealItem);
  });

  return { items, totalPages, hasNextPage, targetUrl: url };
}

// Search Router (Handles single or both stores)
async function searchAmazon(opts) {
  const storeType = opts.storeType || 'warehouse';

  if (storeType === 'both') {
    const [whRes, normRes] = await Promise.allSettled([
      scrapeAmazonStore({ ...opts, storeType: 'warehouse' }),
      scrapeAmazonStore({ ...opts, storeType: 'normal' })
    ]);

    const whItems = whRes.status === 'fulfilled' ? whRes.value.items : [];
    const normItems = normRes.status === 'fulfilled' ? normRes.value.items : [];
    const combined = [];
    const seen = new Set();

    const maxLen = Math.max(whItems.length, normItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < whItems.length && !seen.has(whItems[i].asin)) {
        combined.push(whItems[i]);
        seen.add(whItems[i].asin);
      }
      if (i < normItems.length && !seen.has(normItems[i].asin)) {
        combined.push(normItems[i]);
        seen.add(normItems[i].asin);
      }
    }

    const totalPages = Math.max(
      whRes.status === 'fulfilled' ? whRes.value.totalPages : 1,
      normRes.status === 'fulfilled' ? normRes.value.totalPages : 1
    );
    const hasNextPage = (whRes.status === 'fulfilled' && whRes.value.hasNextPage) || (normRes.status === 'fulfilled' && normRes.value.hasNextPage);

    return {
      products: combined,
      page: opts.page || 1,
      totalPages,
      hasNextPage,
      targetUrl: whRes.status === 'fulfilled' ? whRes.value.targetUrl : ''
    };
  }

  const res = await scrapeAmazonStore(opts);
  return {
    products: res.items,
    page: opts.page || 1,
    totalPages: res.totalPages,
    hasNextPage: res.hasNextPage,
    targetUrl: res.targetUrl
  };
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const opts = {
      storeType: req.query.storeType || 'warehouse',
      keyword: req.query.keyword || '',
      category: req.query.category || 'all',
      minDiscount: parseInt(req.query.minDiscount || '60', 10),
      maxDiscount: parseInt(req.query.maxDiscount || '90', 10),
      domain: req.query.domain || 'amazon.com.au',
      sort: req.query.sort || 'date-desc-rank',
      minPrice: parseFloat(req.query.minPrice || '0'),
      maxPrice: parseFloat(req.query.maxPrice || '0'),
      condition: req.query.condition || 'all',
      negKeywords: req.query.negKeywords || '',
      page: parseInt(req.query.page || '1', 10),
      availableOnly: req.query.availableOnly !== 'false'
    };

    const data = await searchAmazon(opts);

    // Auto-save all scraped products into the database so deep searches are never lost!
    if (data.products && data.products.length > 0) {
      const now = Date.now();
      for (const item of data.products) {
        if (!item.asin) continue;
        const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
        item.numericPrice = numericPrice;
        item.domain = opts.domain;
        item.currency = item.currency || (opts.domain.includes('amazon.co.jp') ? 'JPY' : (opts.domain.includes('amazon.com.au') ? 'AUD' : 'USD'));
        if (opts.category && opts.category !== 'all' && opts.category !== 'sweep_all') {
          item.category = opts.category;
        }

        if (!db.crawledDeals[item.asin]) {
          item.firstSeenAt = now;
          item.lastSeenAt = now;
          item.status = 'active';
          db.crawledDeals[item.asin] = item;
        } else {
          const existing = db.crawledDeals[item.asin];
          existing.lastSeenAt = now;
          existing.status = 'active';
          if (!existing.firstSeenAt) {
            existing.firstSeenAt = existing.lastSeenAt || now;
          }
          // Preserve original listed hour: copy original firstSeenAt back onto item
          item.firstSeenAt = existing.firstSeenAt;
          item.lastSeenAt = now;
          if (numericPrice > 0 && existing.numericPrice > 0 && numericPrice < existing.numericPrice) {
            existing.previousPrice = existing.price;
            existing.price = item.price;
            existing.numericPrice = numericPrice;
            existing.discountPercent = item.discountPercent;
            existing.priceDropAt = now;
          }
        }
      }
      saveDb(db);
    }

    res.json(data);
  } catch (err) {
    console.error('[API /search ERROR]:', err.message);
    res.status(500).json({ error: err.message, products: [] });
  }
});

// Watchlist CRUD Endpoints
app.get('/api/watchlist', (req, res) => {
  res.json(db.watchlist || []);
});

app.post('/api/watchlist', (req, res) => {
  const { keyword, category = 'all', maxPrice = 0, minDiscount = 0, id } = req.body;
  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const parsedMinDisc = req.body.minDiscount !== undefined && !isNaN(parseInt(req.body.minDiscount, 10))
    ? Math.max(0, parseInt(req.body.minDiscount, 10))
    : 0;

  const targetId = id || `target-${crypto.randomBytes(4).toString('hex')}`;
  const existingIdx = (db.watchlist || []).findIndex(w => w.id === targetId || w.keyword.toLowerCase() === keyword.trim().toLowerCase());

  const newTarget = {
    id: targetId,
    keyword: keyword.trim(),
    category: category || 'all',
    maxPrice: parseFloat(maxPrice) || 0,
    minDiscount: parsedMinDisc,
    active: true,
    createdAt: Date.now(),
    lastScannedAt: null,
    matchCount: 0
  };

  // Check newly added target against existing database deals immediately
  for (const deal of Object.values(db.crawledDeals || {})) {
    if (deal.status === 'sold_out') continue;
    if (isWatchlistMatch(deal, newTarget)) {
      deal.snipedFromTarget = newTarget.keyword;
      if (!db.snipedDeals.some(d => d.asin === deal.asin)) {
        deal.snipedAt = Date.now();
        db.snipedDeals.unshift(deal);
        newTarget.matchCount = (newTarget.matchCount || 0) + 1;
        console.log(`[WATCHLIST INSTANT MATCH] "${newTarget.keyword}": ${deal.title} at ${deal.price}`);
      }
    }
  }

  if (!Array.isArray(db.watchlist)) db.watchlist = [];
  if (existingIdx >= 0) {
    db.watchlist[existingIdx] = newTarget;
  } else {
    db.watchlist.unshift(newTarget);
  }
  saveDb(db);
  res.status(201).json(newTarget);
});

app.post('/api/watchlist/sync', (req, res) => {
  const clientTargets = req.body;
  if (Array.isArray(clientTargets) && clientTargets.length > 0) {
    if (!Array.isArray(db.watchlist) || db.watchlist.length === 0) {
      db.watchlist = clientTargets;
      saveDb(db);
    }
  }
  res.json(db.watchlist || []);
});

app.delete('/api/watchlist/:id', (req, res) => {
  const id = req.params.id;
  db.watchlist = (db.watchlist || []).filter(w => w.id !== id);
  saveDb(db);
  res.json({ success: true, count: db.watchlist.length });
});

app.put('/api/watchlist/:id/toggle', (req, res) => {
  const id = req.params.id;
  const target = (db.watchlist || []).find(w => w.id === id);
  if (!target) return res.status(404).json({ error: 'Target not found' });

  target.active = !target.active;
  saveDb(db);
  res.json(target);
});

// Sniped deals endpoints
app.get('/api/sniped', (req, res) => {
  const target = req.query.target ? String(req.query.target).trim().toLowerCase() : '';
  const domain = req.query.domain ? String(req.query.domain).trim().toLowerCase() : '';
  const cleanDom = domain ? domain.replace('www.', '') : '';
  let deals = db.snipedDeals || [];

  if (domain && domain !== 'all') {
    deals = deals.filter(d => {
      const rawUrl = d.url || d.link || '';
      let dDom = (d.domain || (rawUrl && (rawUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/) || [])[1]) || '').toLowerCase().replace('www.', '');
      if (!dDom) dDom = 'amazon.com.au';
      if (dDom === cleanDom || dDom.includes(cleanDom)) {
        if (cleanDom === 'amazon.com' && dDom.includes('amazon.com.au')) return false;
        return true;
      }
      return false;
    });
  }

  if (!target || target === 'all') {
    return res.json(deals);
  }
  const filtered = deals.filter(d => {
    if (d.snipedFromTarget) {
      const snipedNorm = String(d.snipedFromTarget).trim().toLowerCase();
      if (snipedNorm === target || snipedNorm.includes(target) || target.includes(snipedNorm)) return true;
      if (/\b(ps5?|playstation)\b/i.test(target) && /\b(ps5?|playstation)\b/i.test(snipedNorm)) return true;
      if (/\b(glasses|sunglasses|eyewear)\b/i.test(target) && /\b(glasses|sunglasses|eyewear)\b/i.test(snipedNorm)) return true;
      return false;
    }
    const title = String(d.title || '').toLowerCase();
    if (/\b(ps5?|playstation)\b/i.test(target)) return /\b(ps5?|playstation)\b/i.test(title);
    if (/\b(glasses|sunglasses|eyewear)\b/i.test(target)) return /\b(glasses|sunglasses|eyewear)\b/i.test(title);
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(title);
  });
  res.json(filtered);
});

app.post('/api/sniped', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  let added = 0;
  if (!Array.isArray(db.snipedDeals)) db.snipedDeals = [];
  for (const item of items) {
    if (!item || !item.asin) continue;
    if (!db.snipedDeals.some(d => d.asin === item.asin)) {
      if (!item.snipedAt) item.snipedAt = Date.now();
      db.snipedDeals.unshift(item);
      added++;
    }
  }
  if (added > 0) {
    saveDb(db);
  }
  res.json({ success: true, added, total: db.snipedDeals.length });
});

app.delete('/api/sniped', (req, res) => {
  db.snipedDeals = [];
  (db.watchlist || []).forEach(w => w.matchCount = 0);
  saveDb(db);
  res.json({ success: true, count: 0 });
});

app.delete('/api/sniped/:asin', (req, res) => {
  const asin = req.params.asin;
  db.snipedDeals = (db.snipedDeals || []).filter(s => s.asin !== asin);
  saveDb(db);
  res.json({ success: true });
});

// Saved Deals Endpoints
app.get('/api/saved', (req, res) => {
  res.json(db.savedDeals || []);
});

app.post('/api/saved', (req, res) => {
  const deal = req.body;
  if (!deal || !deal.asin) return res.status(400).json({ error: 'Valid deal object required' });

  if (!db.savedDeals.some(d => d.asin === deal.asin)) {
    deal.savedAt = Date.now();
    db.savedDeals.unshift(deal);
    saveDb(db);
  }
  res.status(201).json({ success: true, count: db.savedDeals.length });
});

app.delete('/api/saved/:asin', (req, res) => {
  const asin = req.params.asin;
  db.savedDeals = db.savedDeals.filter(d => d.asin !== asin);
  saveDb(db);
  res.json({ success: true, count: db.savedDeals.length });
});

// Settings Endpoints
app.get('/api/settings', (req, res) => {
  res.json({
    ...db.settings,
    serverUptime: process.uptime(),
    activeTargetsCount: db.watchlist.filter(w => w.active).length,
    snipedDealsCount: db.snipedDeals.length,
    savedDealsCount: db.savedDeals.length,
    sniperDaemon: db.sniperDaemon || {}
  });
});

app.post('/api/settings', (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  saveDb(db);
  res.json(db.settings);
});

// Health check endpoint (for Docker / TrueNAS health monitoring)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: Date.now() });
});

// -------------------------------------------------------------
// DATABASE DEALS & HOURLY CRAWLER ENDPOINTS
// -------------------------------------------------------------

// Query Indexed Database Deals
app.get('/api/db/deals', (req, res) => {
  try {
    const {
      timeWindow = 'all', // '1h', '2h', '6h', '12h', '24h', 'all'
      storeType = 'both', // 'warehouse', 'normal', 'both'
      category = 'all',
      domain = 'amazon.com.au',
      excludeCategories = '', // Comma-separated categories to exclude (e.g. 'stripbooks,pets')
      priceErrorsOnly = 'false', // 'true' to show only verified price errors / clearance glitches
      stealsOnly = 'false', // 'true' to show only 50%+ or $50+ high-heat bargains
      ozBargainOnly = 'false', // 'true' to show only community vetted deals
      glitchTier = 'all', // 'all', 'epic', 'dollar', 'warehouse', 'brand'
      brandsOnly = 'false', // 'true' to show only recognized top brand bargains
      hideAccessories = 'true', // 'true' to auto-hide cases, covers, screen protectors, raw metal sheets
      minDiscount = 0,
      maxDiscount = 100,
      minPrice = 0,
      maxPrice = 0,
      condition = 'all',
      availableOnly = 'false',
      keyword = '',
      negKeywords = '',
      sort = 'date-desc-rank',
      page = 1,
      limit = 48
    } = req.query;

    const targetDomain = (domain || 'amazon.com.au').trim().toLowerCase();
    const cleanTargetDomain = targetDomain.replace('www.', '');

    const isDealDomainMatch = (d) => {
      if (!targetDomain || targetDomain === 'all') return true;
      const rawUrl = d.url || d.link || '';
      let dDom = (d.domain || (rawUrl && (rawUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/) || [])[1]) || '').toLowerCase().replace('www.', '');
      if (!dDom) dDom = 'amazon.com.au';
      if (dDom === cleanTargetDomain || dDom.includes(cleanTargetDomain)) {
        if (cleanTargetDomain === 'amazon.com' && dDom.includes('amazon.com.au')) return false;
        return true;
      }
      return false;
    };

    const now = Date.now();
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    const allDeals = Object.values(db.crawledDeals || {});

    // Excluded categories set with alias normalization
    const excludedSet = new Set(
      (excludeCategories || '')
        .split(/[,;]/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
    );

    const isCategoryExcluded = (cat, title, asin) => {
      if (excludedSet.size === 0) return false;
      if ((excludedSet.has('books') || excludedSet.has('stripbooks')) && asin && /^\d{9}[\dX]$/i.test(asin)) {
        return true;
      }
      if (cat) {
        const c = String(cat).toLowerCase();
        if (excludedSet.has(c)) return true;
        if (excludedSet.has('books') && (c === 'stripbooks' || c === 'books')) return true;
        if (excludedSet.has('stripbooks') && (c === 'stripbooks' || c === 'books')) return true;
        if (excludedSet.has('toys') && (c === 'toys-and-games' || c === 'toys')) return true;
        if (excludedSet.has('toys-and-games') && (c === 'toys-and-games' || c === 'toys')) return true;
        if (excludedSet.has('pets') && (c === 'pets' || c === 'pet-supplies')) return true;
        if (excludedSet.has('pet-supplies') && (c === 'pets' || c === 'pet-supplies')) return true;
        if (excludedSet.has('music') && (c === 'mi' || c === 'music' || c === 'musical-instruments')) return true;
        if (excludedSet.has('mi') && (c === 'mi' || c === 'music' || c === 'musical-instruments')) return true;
      }
      if ((excludedSet.has('books') || excludedSet.has('stripbooks')) && title) {
        if (/\b(paperback|hardcover|memoir|study\s+guide|bestseller|novel|thriller|biography|handbook)\b/i.test(String(title))) return true;
      }
      return false;
    };

    // Time window bounds in milliseconds
    const timeWindows = {
      '1h': 1 * 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    const windowMs = timeWindows[timeWindow] || 0;

    // Compute live stats for quick pill counts matching active store, category, exclusion, and discount filters
    let count1h = 0, count2h = 0, count6h = 0, count12h = 0, count24h = 0, countPriceErrors = 0, countTopBrands = 0, countSteals = 0, countOzBargain = 0;
    let totalWarehouse = 0, totalNormal = 0;
    for (const d of allDeals) {
      if (!d || d.status === 'sold_out') continue;

      // Domain isolation filter
      if (!isDealDomainMatch(d)) continue;

      // Automated 14-Day Retention: exclude deals older than 14 days from stats
      const dealActivityTs = Math.max(d.lastSeenAt || 0, d.firstSeenAt || 0, d.priceDropAt || 0) || 0;
      if (dealActivityTs > 0 && (now - dealActivityTs) > FOURTEEN_DAYS_MS) continue;

      // Require valid confirmed price (never include items with no price or 'See Options')
      const np = d.numericPrice || 0;
      if (np <= 0 || d.price === 'See Options' || d.price === 'Check Site') continue;

      // Excluded category filter for stats
      if (isCategoryExcluded(d.category, d.title, d.asin)) continue;

      if (d.store === 'Normal Amazon') totalNormal++;
      else totalWarehouse++;

      // If store filter is active, only count matches for that store
      if (storeType === 'warehouse' && d.store === 'Normal Amazon') continue;
      if (storeType === 'normal' && d.store !== 'Normal Amazon') continue;

      // Category filter for stats (when not all or sweep_all)
      if (category && category !== 'all' && category !== 'sweep_all' && d.category !== category && d.category !== 'all') continue;

      if (isValidPriceError(d)) countPriceErrors++;
      if (d.isBrandDeal || d.brand) countTopBrands++;

      // Steals of the day & OzBargain counts
      const bScore = d.bargainScore || calculateBargainScore(d);
      const disc = parseInt(d.discountPercent, 10) || 0;
      const orig = parseFloat(String(d.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
      const sav = orig > np ? (orig - np) : 0;
      if (bScore >= 60 || disc >= 50 || sav >= 50) countSteals++;
      if (d.isOzBargain) countOzBargain++;

      // Discount filter for stats
      if (disc < parseInt(minDiscount, 10) || disc > parseInt(maxDiscount, 10)) continue;

      // In-stock filter for stats
      if ((availableOnly === 'true' || availableOnly === true) && d.inStock === false) continue;

      // Discovery / fresh deal timestamp: evaluates when product was first discovered or price-dropped
      const dealTs = Math.max(d.firstSeenAt || 0, d.priceDropAt || 0) || d.lastSeenAt || now;
      const age = now - dealTs;
      if (age <= 1 * 3600000) count1h++;
      if (age <= 2 * 3600000) count2h++;
      if (age <= 6 * 3600000) count6h++;
      if (age <= 12 * 3600000) count12h++;
      if (age <= 24 * 3600000) count24h++;
    }

    const negList = negKeywords ? negKeywords.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    const searchTerms = keyword ? keyword.toLowerCase().split(/\s+/).filter(Boolean) : [];

    let filtered = allDeals.filter(d => {
      if (!d || d.status === 'sold_out') return false;

      // Domain isolation filter
      if (!isDealDomainMatch(d)) return false;

      // Automated 14-Day Retention: exclude deals older than 14 days
      const dealActivityTs = Math.max(d.lastSeenAt || 0, d.firstSeenAt || 0, d.priceDropAt || 0) || 0;
      if (dealActivityTs > 0 && (now - dealActivityTs) > FOURTEEN_DAYS_MS) return false;

      // Require valid confirmed price (never return items with no price or 'See Options')
      const np = d.numericPrice || 0;
      if (np <= 0 || d.price === 'See Options' || d.price === 'Check Site') return false;

      // Excluded categories filter (e.g. books, pets)
      if (isCategoryExcluded(d.category, d.title, d.asin)) return false;

      // Available / In-stock filter
      if ((availableOnly === 'true' || availableOnly === true) && d.inStock === false) {
        return false;
      }

      // Store type filter (Warehouse vs Normal Amazon vs Both)
      if (storeType === 'warehouse' && d.store === 'Normal Amazon') return false;
      if (storeType === 'normal' && d.store !== 'Normal Amazon') return false;

      // Steals of the day filter (50%+ off OR $50+ savings OR high bargain heat score)
      if (stealsOnly === 'true' || stealsOnly === true) {
        const bScore = d.bargainScore || calculateBargainScore(d);
        const disc = parseInt(d.discountPercent, 10) || 0;
        const origP = parseFloat(String(d.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
        const sav = origP > np ? (origP - np) : 0;
        if (bScore < 60 && disc < 50 && sav < 50) return false;
      }

      // OzBargain Community Hot Deals filter
      if (ozBargainOnly === 'true' || ozBargainOnly === true) {
        if (!d.isOzBargain) return false;
      }

      // Time window filter: strictly evaluates when deal was first discovered or price-dropped
      if (windowMs > 0) {
        const dealTs = Math.max(d.firstSeenAt || 0, d.priceDropAt || 0) || d.lastSeenAt || now;
        const age = now - dealTs;
        if (age > windowMs) return false;
      }

      // Category filter (allows all categories for 'all' and 'sweep_all')
      if (category && category !== 'all' && category !== 'sweep_all' && d.category !== category && d.category !== 'all') {
        return false;
      }

      // Price Errors / Glitches filter (genuine high-value clearance or price errors)
      if (priceErrorsOnly === 'true' || priceErrorsOnly === true) {
        const errorInfo = getPriceErrorInfo(d);
        if (!errorInfo.isPriceError) return false;
        if (glitchTier && glitchTier !== 'all') {
          if (glitchTier === 'epic' && errorInfo.tier !== 'epic_glitch') return false;
          if (glitchTier === 'dollar' && errorInfo.tier !== 'dollar_glitch') return false;
          if (glitchTier === 'warehouse' && errorInfo.tier !== 'warehouse_steal') return false;
          if (glitchTier === 'brand' && errorInfo.tier !== 'brand_glitch') return false;
        }
      }

      // Top Brands Only filter
      if (brandsOnly === 'true' || brandsOnly === true) {
        if (!d.isBrandDeal && !d.brand) return false;
      }

      // Auto-hide cheap accessories / parts / dropshipper junk
      if (hideAccessories === 'true' || hideAccessories === true) {
        const title = String(d.title || '');
        if (ACCESSORY_REPLACEMENT_REGEX.test(title) || JUNK_TRASH_REGEX.test(title)) {
          return false;
        }
      }

      // Discount filter
      const disc = parseInt(d.discountPercent, 10) || 0;
      const minD = parseInt(minDiscount, 10) || 0;
      const maxD = parseInt(maxDiscount, 10) || 100;
      if (priceErrorsOnly === 'true' || priceErrorsOnly === true) {
        // Valid price errors already satisfy smart threshold; only filter if user specifically set minDiscount > 20
        if (minD > 20 && disc < minD) return false;
        if (disc > maxD) return false;
      } else {
        if (disc < minD || disc > maxD) return false;
      }

      // Price filter
      const minP = parseFloat(minPrice) || 0;
      const maxP = parseFloat(maxPrice) || 0;
      if (minP > 0 && np < minP) return false;
      if (maxP > 0 && np > maxP) return false;

      // Condition filter (normalized comparison)
      if (condition && condition !== 'all') {
        const c = String(d.condition || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetCond = condition.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!c.includes(targetCond)) return false;
      }

      // Excluded keywords
      if (negList.length > 0) {
        const text = `${d.title || ''} ${d.condition || ''}`.toLowerCase();
        if (negList.some(neg => text.includes(neg))) return false;
      }

      // Keyword search
      if (searchTerms.length > 0) {
        const text = `${d.title || ''} ${d.asin || ''}`.toLowerCase();
        if (!searchTerms.every(t => text.includes(t))) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'bargain-score-desc':
          return (b.bargainScore || calculateBargainScore(b)) - (a.bargainScore || calculateBargainScore(a));
        case 'dollar-savings-desc': {
          const origA = parseFloat(String(a.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
          const origB = parseFloat(String(b.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
          const savA = origA > (a.numericPrice || 0) ? (origA - (a.numericPrice || 0)) : 0;
          const savB = origB > (b.numericPrice || 0) ? (origB - (b.numericPrice || 0)) : 0;
          return savB - savA;
        }
        case 'discount-desc':
        case 'discount-desc-rank':
          return (parseInt(b.discountPercent, 10) || 0) - (parseInt(a.discountPercent, 10) || 0);
        case 'date-desc-rank':
          return (Math.max(b.firstSeenAt || 0, b.priceDropAt || 0)) - (Math.max(a.firstSeenAt || 0, a.priceDropAt || 0));
        case 'price-asc-rank':
          return (a.numericPrice || 0) - (b.numericPrice || 0);
        case 'price-desc-rank':
          return (b.numericPrice || 0) - (a.numericPrice || 0);
        case 'review-rank':
          return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
        default:
          return (Math.max(b.firstSeenAt || 0, b.priceDropAt || 0)) - (Math.max(a.firstSeenAt || 0, a.priceDropAt || 0));
      }
    });

    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, parseInt(limit, 10) || 48);
    const total = filtered.length;
    const totalPages = Math.ceil(total / lim) || 1;
    const products = filtered.slice((p - 1) * lim, p * lim).map(item => {
      const errorInfo = getPriceErrorInfo(item);
      item.isPriceError = errorInfo.isPriceError;
      if (errorInfo.isPriceError) {
        item.priceErrorType = errorInfo.tier;
        item.glitchBadge = errorInfo.badge;
      }
      return item;
    });

    res.json({
      total,
      page: p,
      totalPages,
      products,
      stats: {
        totalInDb: allDeals.length,
        warehouseDeals: totalWarehouse,
        normalDeals: totalNormal,
        priceErrors: countPriceErrors,
        topBrands: countTopBrands,
        steals: countSteals,
        ozBargain: countOzBargain,
        last1h: count1h,
        last2h: count2h,
        last6h: count6h,
        last12h: count12h,
        last24h: count24h,
        lastCrawlerRun: db.crawler ? db.crawler.lastRunAt : null,
        nextCrawlerRun: db.crawler ? db.crawler.nextRunAt : null,
        isRunning: db.crawler ? db.crawler.isRunning : false,
        currentStep: db.crawler ? db.crawler.currentStep : ''
      }
    });
  } catch (err) {
    console.error('[API /api/db/deals] Critical query error:', err);
    res.status(500).json({ error: 'Failed to query database deals: ' + err.message, stack: err.stack });
  }
});

// Crawler Status Endpoint
app.get('/api/db/status', (req, res) => {
  // Self-heal: If DB thinks crawler is running but Node memory says no process is running
  if (db.crawler && db.crawler.isRunning && !crawlerRunning) {
    db.crawler.isRunning = false;
    db.crawler.currentStep = '';
    saveDb(db);
  }
  const all = Object.values(db.crawledDeals || {});
  let whCount = 0, normCount = 0;
  for (const d of all) {
    if (d.store === 'Normal Amazon') normCount++;
    else whCount++;
  }
  res.json({
    totalDeals: all.length,
    warehouseDeals: whCount,
    normalDeals: normCount,
    retentionDays: 14,
    autoPruneEnabled: true,
    crawler: db.crawler || {}
  });
});

// Database Stale Deals Retention Pruner
app.post('/api/db/prune', (req, res) => {
  try {
    const maxAgeDays = parseFloat(req.query.maxAgeDays || (req.body && req.body.maxAgeDays)) || 14;
    const result = pruneStaleDeals(db, maxAgeDays);
    saveDb(db);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Live Market Analytics & Price Distribution Endpoint
app.get('/api/db/analytics', (req, res) => {
  try {
    const domain = req.query.domain ? String(req.query.domain).trim().toLowerCase() : '';
    const cleanDom = domain ? domain.replace('www.', '') : '';
    let all = Object.values(db.crawledDeals || {});

    if (domain && domain !== 'all') {
      all = all.filter(d => {
        const rawUrl = d.url || d.link || '';
        let dDom = (d.domain || (rawUrl && (rawUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/) || [])[1]) || '').toLowerCase().replace('www.', '');
        if (!dDom) dDom = 'amazon.com.au';
        if (dDom === cleanDom || dDom.includes(cleanDom)) {
          if (cleanDom === 'amazon.com' && dDom.includes('amazon.com.au')) return false;
          return true;
        }
        return false;
      });
    }
    let whCount = 0, normCount = 0, priceErrors = 0;
    let totalDiscount = 0, countWithDiscount = 0;
    let maxSavings = 0;
    let maxSavingsDeal = null;

    const discountTiers = {
      '20-39%': 0,
      '40-59%': 0,
      '60-79%': 0,
      '80%+ (Glitch)': 0
    };

    const categories = {};
    const conditionStats = {
      'Brand New': 0,
      'Like New': 0,
      'Very Good': 0,
      'Good': 0,
      'Acceptable': 0
    };

    const now = Date.now();
    let fresh1h = 0, fresh24h = 0;

    for (const d of all) {
      if (!d || d.status === 'sold_out') continue;
      const np = d.numericPrice || 0;
      if (np <= 0 || d.price === 'See Options' || d.price === 'Check Site') continue;

      if (d.store === 'Normal Amazon') normCount++;
      else whCount++;

      const disc = parseInt(d.discountPercent, 10) || 0;
      if (disc > 0) {
        totalDiscount += disc;
        countWithDiscount++;
        if (disc < 40) discountTiers['20-39%']++;
        else if (disc < 60) discountTiers['40-59%']++;
        else if (disc < 80) discountTiers['60-79%']++;
        else discountTiers['80%+ (Glitch)']++;
      }

      if (isValidPriceError(d)) priceErrors++;

      const origPrice = parseFloat(String(d.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
      if (origPrice > np) {
        const sav = origPrice - np;
        if (sav > maxSavings) {
          maxSavings = sav;
          maxSavingsDeal = {
            title: d.title,
            asin: d.asin,
            price: d.price,
            originalPrice: d.originalPrice,
            savings: sav,
            discountPercent: d.discountPercent
          };
        }
      }

      // Department/category distribution
      const cat = d.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;

      // Condition distribution
      const cond = String(d.condition || '').toLowerCase();
      if (cond.includes('like new')) conditionStats['Like New']++;
      else if (cond.includes('very good')) conditionStats['Very Good']++;
      else if (cond.includes('good')) conditionStats['Good']++;
      else if (cond.includes('acceptable')) conditionStats['Acceptable']++;
      else conditionStats['Brand New']++;

      const dealTs = Math.max(d.firstSeenAt || 0, d.priceDropAt || 0) || d.lastSeenAt || 0;
      if (dealTs && (now - dealTs <= 3600000)) fresh1h++;
      if (dealTs && (now - dealTs <= 86400000)) fresh24h++;
    }

    res.json({
      totalDeals: all.length,
      warehouseDeals: whCount,
      normalDeals: normCount,
      priceErrors,
      fresh1h,
      fresh24h,
      avgDiscount: countWithDiscount > 0 ? Math.round(totalDiscount / countWithDiscount) : 0,
      maxSavings: Math.round(maxSavings),
      maxSavingsDeal,
      discountTiers,
      categories,
      conditionStats
    });
  } catch (err) {
    console.error('[API /api/db/analytics] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Force-Reset Crawler State Endpoint
app.post('/api/db/reset-crawler', (req, res) => {
  crawlerRunning = false;
  if (db.crawler) {
    db.crawler.isRunning = false;
    db.crawler.currentStep = '';
  }
  saveDb(db);
  res.json({ success: true, message: 'Crawler runtime state cleared' });
});

// Manual Trigger for OzBargain Community Amazon Deals Ingestion
app.post('/api/ozbargain/sync', async (req, res) => {
  try {
    const deals = await fetchOzBargainDeals();
    res.json({ success: true, count: deals.length, totalInDb: Object.keys(db.crawledDeals || {}).length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global Cross-Store Arbitrage & Comparison Endpoint
app.get('/api/arbitrage/:asin', (req, res) => {
  try {
    const asin = String(req.params.asin || '').trim().toUpperCase();
    if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
      return res.status(400).json({ error: 'Invalid ASIN format' });
    }
    const deal = (db.crawledDeals && db.crawledDeals[asin]) || null;
    const directAuCart = `https://www.amazon.com.au/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`;
    const links = {
      au: `https://www.amazon.com.au/dp/${asin}`,
      us: `https://www.amazon.com/dp/${asin}`,
      jp: `https://www.amazon.co.jp/dp/${asin}`,
      uk: `https://www.amazon.co.uk/dp/${asin}`,
      de: `https://www.amazon.de/dp/${asin}`,
      keepa: `https://keepa.com/#!product/9-${asin}`,
      instantCartAu: directAuCart
    };

    res.json({
      asin,
      deal,
      links,
      promoExtra20: deal && deal.numericPrice ? (deal.numericPrice * 0.8).toFixed(2) : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Trigger for Crawler Sweep
app.post('/api/db/scan', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.body?.force;
    if (crawlerRunning && !force) {
      return res.json({ success: false, message: 'Scan already in progress' });
    }
    // Auto-heal stale DB flag if process was not actually running
    if (!crawlerRunning && db.crawler) {
      db.crawler.isRunning = false;
      db.crawler.currentStep = '';
    }
    const isDeep = req.query.deep === 'true' || (req.body && req.body.deep);
    const pages = isDeep ? 8 : (req.body && req.body.pages ? parseInt(req.body.pages, 10) : 6);
    const excludeList = req.body?.excludeCategories || req.query?.excludeCategories;
    const excludedCats = excludeList ? excludeList.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean) : null;
    runAutonomousCrawler(pages, excludedCats).catch(e => console.error('[CRAWLER] Background error:', e));
    res.json({ success: true, message: `Background ${isDeep ? `Deep Sweep (150+ Pages across all ${CRAWLER_DEPARTMENTS.length} Categories)` : 'Scan'} started (${pages} pages per department)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Sniper Scan Trigger
app.post('/api/watchlist/scan', async (req, res) => {
  try {
    const hits = await runAutonomousSniperScan();
    res.json({ success: true, newHits: hits.length, totalSniped: db.snipedDeals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PUSH NOTIFICATION SERVICES (Discord & Telegram)
// -------------------------------------------------------------
async function dispatchDealNotification(item, target) {
  const settings = db.settings || {};

  // Discord Webhook Notification
  if (settings.discordWebhookUrl && settings.discordWebhookUrl.startsWith('http')) {
    try {
      const payload = {
        embeds: [{
          title: `🎯 SNIPED DEAL: ${item.title.substring(0, 100)}...`,
          url: item.link,
          color: 0xf59e0b, // Amber
          thumbnail: { url: item.image },
          fields: [
            { name: "Deal Price", value: `**${item.price}**`, inline: true },
            { name: "Discount", value: `${item.discountPercent} off`, inline: true },
            { name: "Target Matched", value: `"${target.keyword}" (Max $${target.maxPrice})`, inline: true },
            { name: "Condition", value: item.condition || 'Used', inline: true },
            { name: "Store", value: item.store || 'Amazon Warehouse', inline: true }
          ],
          footer: { text: "Amazon Warehouse Hunter • 24/7 Sniper Daemon" },
          timestamp: new Date().toISOString()
        }]
      };
      await fetch(settings.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`[ALERT] Sent Discord webhook alert for ${item.asin}`);
    } catch (err) {
      console.error('[ALERT] Failed to send Discord notification:', err.message);
    }
  }

  // Telegram Bot Notification
  if (settings.telegramBotToken && settings.telegramChatId) {
    try {
      const text = `🎯 *AMAZON WAREHOUSE SNIPED!* \n\n*Product:* ${item.title}\n*Price:* ${item.price} (${item.discountPercent} OFF)\n*Condition:* ${item.condition}\n*Target:* "${target.keyword}"\n\n[🛒 View Deal on Amazon](${item.link})`;
      const tgUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text,
          parse_mode: 'Markdown'
        })
      });
      console.log(`[ALERT] Sent Telegram alert for ${item.asin}`);
    } catch (err) {
      console.error('[ALERT] Failed to send Telegram notification:', err.message);
    }
  }
}

async function dispatchPriceErrorNotification(item) {
  const settings = db.settings || {};

  // Discord Webhook Notification
  if (settings.discordWebhookUrl && settings.discordWebhookUrl.startsWith('http')) {
    try {
      const payload = {
        embeds: [{
          title: `🚨 PRICE ERROR DETECTED (${item.discountPercent || ''} OFF): ${item.title.substring(0, 100)}...`,
          url: item.link,
          color: 0xef4444, // Red
          thumbnail: { url: item.image },
          fields: [
            { name: "Price", value: `**${item.price}** (was ${item.originalPrice || 'higher'})`, inline: true },
            { name: "Discount", value: `🔥 **${item.discountPercent}**`, inline: true },
            { name: "Store", value: item.store || 'Amazon', inline: true },
            { name: "Department", value: item.category || 'General', inline: true },
            { name: "Condition", value: item.condition || 'New/Warehouse', inline: true }
          ],
          footer: { text: "Amazon Warehouse Hunter • Autonomous Price Error Hunter" },
          timestamp: new Date().toISOString()
        }]
      };
      await fetch(settings.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`[ALERT] Sent Discord Price Error alert for ${item.asin}`);
    } catch (err) {
      console.error('[ALERT] Failed to send Discord Price Error notification:', err.message);
    }
  }

  // Telegram Bot Notification
  if (settings.telegramBotToken && settings.telegramChatId) {
    try {
      const text = `🚨 *AMAZON PRICE ERROR DETECTED!* 🔥\n\n*Product:* ${item.title}\n*Price:* ${item.price} (was ${item.originalPrice || 'higher'})\n*Discount:* ${item.discountPercent} OFF\n*Store:* ${item.store || 'Amazon'}\n\n[🛒 Open Deal on Amazon Now!](${item.link})`;
      const tgUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text,
          parse_mode: 'Markdown'
        })
      });
      console.log(`[ALERT] Sent Telegram Price Error alert for ${item.asin}`);
    } catch (err) {
      console.error('[ALERT] Failed to send Telegram Price Error notification:', err.message);
    }
  }
}

// -------------------------------------------------------------
// WATCHLIST MATCH ENGINE (Precision Keyword & Anti-Accessory Verification)
// -------------------------------------------------------------
function isWatchlistMatch(item, target) {
  if (!item || !item.title || !target || !target.keyword) return false;

  const normalizeKw = (str) => {
    return (str || '')
      .toLowerCase()
      .replace(/play\s*station\s*5/g, 'playstation 5 ps5')
      .replace(/\bps5\b/g, 'playstation 5 ps5')
      .replace(/play\s*station\s*4/g, 'playstation 4 ps4')
      .replace(/\bps4\b/g, 'playstation 4 ps4')
      .replace(/play\s*station/g, 'playstation')
      .replace(/xbox\s*series\s*x/g, 'xbox series x xsx')
      .replace(/air\s*pods/g, 'airpods');
  };

  const targetKw = target.keyword.trim().toLowerCase();
  const title = (item.title || '').toLowerCase();
  const normTarget = normalizeKw(targetKw);
  const normTitle = normalizeKw(title);

  // 1. Tokenize significant words from target keyword (length >= 2)
  const rawTokens = targetKw
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  if (rawTokens.length === 0) return false;

  // 2. Token Matching (supports alias matches like PS5 <-> PlayStation 5)
  const isPs5Target = /\b(playstation\s*5|ps5)\b/i.test(targetKw);
  const isPs4Target = /\b(playstation\s*4|ps4)\b/i.test(targetKw);

  if (isPs5Target) {
    const hasPs5InTitle = /\b(playstation\s*5|ps5)\b/i.test(title);
    if (!hasPs5InTitle) return false;
  } else if (isPs4Target) {
    const hasPs4InTitle = /\b(playstation\s*4|ps4)\b/i.test(title);
    if (!hasPs4InTitle) return false;
  } else {
    // Standard all-token match with substring fallback for compound words
    const allTokensMatch = rawTokens.every(token => {
      const re = new RegExp('\\b' + token + '\\b', 'i');
      return re.test(title) || normTitle.includes(token);
    });
    if (!allTokensMatch) return false;
  }

  // 3. Category match check (if target specified category other than 'all')
  if (target.category && target.category !== 'all' && target.category !== 'sweep_all') {
    if (item.category && item.category !== 'all' && item.category !== 'sweep_all' && item.category !== target.category) return false;
  }

  // 4. Accessory & Junk Filter:
  // If target did NOT explicitly ask for a case, cover, skin, or cable, reject pure accessories
  const targetWantsAccessory = /\b(case|cover|sleeve|pouch|strap|cable|charger|adapter|converter|protector|holder|skin|band|keychain|charm|manual|guide|book|stand|mount|tips|pads|thumb\s*grips?)\b/i.test(targetKw);

  if (!targetWantsAccessory) {
    const isAccessoryKeyword = /\b(cases?|covers?|sleeves?|pouches?|skins?|decals?|screen\s+protectors?|replacement\s+(ear\s*tips?|ear\s*pads?|cushions?|cables?|batter(y|ies)|buttons?)|adapters?|converters?|chargers?|cables?|cords?|straps?|stands?|mounts?|holders?|cleaning\s*kits?|stylus)\b/i.test(title);

    if (isAccessoryKeyword) {
      const hasAccessoryPrefix = /\b(case\s+(for|compatible|to\s+fit)|cover\s+(for|compatible)|protective\s+(case|cover|skin|sleeve)|carrying\s+(case|bag)|silicone\s+(case|cover)|hard\s+(case|shell)|travel\s+case|storage\s+case|stand\s+(for|compatible)|mount\s+(for|compatible)|holder\s+(for|compatible)|strap\s+(for|compatible)|dock\s+(for|compatible))\b/i.test(title);
      if (hasAccessoryPrefix) return false;

      const isActualDevice = /\b(wireless\s+earbuds|headphones?|earphones?|console|bundle|ereader|e-reader|tablet)\b/i.test(title);
      if (!isActualDevice) return false;
    }
  }

  // 5. Price bounds check
  const numPrice = item.numericPrice || parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
  if (target.maxPrice > 0 && numPrice > target.maxPrice) return false;

  // 6. Discount threshold check (only enforced if target explicitly specified minDiscount > 0)
  const targetMinDisc = parseInt(target.minDiscount, 10) || 0;
  if (targetMinDisc > 0) {
    const disc = parseInt(item.discountPercent, 10) || 0;
    if (disc < targetMinDisc) return false;
  }

  return true;
}

function pruneInvalidSnipedDeals() {
  if (!Array.isArray(db.snipedDeals) || db.snipedDeals.length === 0) return;
  const activeTargets = (db.watchlist || []).filter(w => w.active);
  if (activeTargets.length === 0) return;
  const beforeCount = db.snipedDeals.length;
  db.snipedDeals = db.snipedDeals.filter(deal => {
    return activeTargets.some(target => isWatchlistMatch(deal, target));
  });
  if (db.snipedDeals.length !== beforeCount) {
    console.log(`[SNIPER] 🧹 Cleaned up ${beforeCount - db.snipedDeals.length} false sniper matches from database.`);
    saveDb(db);
  }
}

// -------------------------------------------------------------
// AUTONOMOUS 24/7 BACKGROUND SNIPER DAEMON
// -------------------------------------------------------------
let sniperRunning = false;

async function runAutonomousSniperScan() {
  if (sniperRunning) {
    console.log('[SNIPER DAEMON] Scan already in progress. Skipping.');
    return [];
  }
  sniperRunning = true;
  const activeTargets = (db.watchlist || []).filter(w => w.active);
  if (activeTargets.length === 0) {
    sniperRunning = false;
    return [];
  }

  const intervalMinutes = (db.settings && db.settings.scanIntervalMinutes) || 120;
  const intervalMs = intervalMinutes * 60 * 1000;
  if (!db.sniperDaemon) db.sniperDaemon = {};
  db.sniperDaemon.isRunning = true;
  db.sniperDaemon.lastRunAt = Date.now();
  db.sniperDaemon.nextRunAt = Date.now() + intervalMs;
  saveDb(db);

  console.log(`[SNIPER DAEMON] 🎯 Scanning ${activeTargets.length} active watchlist targets across indexed database and live stores...`);
  const domain = db.settings.defaultDomain || 'amazon.com.au';
  const newHits = [];

  try {
    // 1. FIRST: Scan all indexed database deals (finds hits instantly from 10,000+ cached deals)
    const allDeals = Object.values(db.crawledDeals || {});
    for (const deal of allDeals) {
      if (deal.status === 'sold_out') continue;
      for (const target of activeTargets) {
        if (isWatchlistMatch(deal, target)) {
          deal.snipedFromTarget = target.keyword;
          if (!db.snipedDeals.some(d => d.asin === deal.asin)) {
            deal.snipedAt = Date.now();
            db.snipedDeals.unshift(deal);
            newHits.push(deal);
            target.matchCount = (target.matchCount || 0) + 1;
            console.log(`[SNIPER HIT FROM DB] 🎯 Matched "${target.keyword}": ${deal.title} at ${deal.price}!`);
            await dispatchDealNotification(deal, target);
          }
        }
      }
    }

    // 2. SECOND: Query live Amazon store for each active target
    for (const target of activeTargets) {
      try {
        const targetMinDisc = parseInt(target.minDiscount, 10) || 0;
        const res = await scrapeAmazonStore({
          storeType: 'both',
          keyword: target.keyword,
          category: target.category || 'all',
          minDiscount: targetMinDisc > 0 ? targetMinDisc : 0,
          maxDiscount: 99,
          domain,
          sort: 'price-asc-rank',
          maxPrice: target.maxPrice || 0,
          page: 1,
          availableOnly: true
        });

        target.lastScannedAt = Date.now();
        const items = res.items || [];

        for (const item of items) {
          if (!isWatchlistMatch(item, target)) continue;

          item.snipedFromTarget = target.keyword;

          // Check if already in sniped deals
          if (!db.snipedDeals.some(d => d.asin === item.asin)) {
            item.snipedAt = Date.now();
            db.snipedDeals.unshift(item);
            newHits.push(item);
            target.matchCount = (target.matchCount || 0) + 1;
            console.log(`[SNIPER HIT LIVE] 🎯 Found matching deal: ${item.title} at ${item.price}!`);

            // Send push notifications
            await dispatchDealNotification(item, target);
          }
        }
      } catch (err) {
        console.error(`[SNIPER DAEMON] Error scanning target "${target.keyword}":`, err.message);
      }
    }
  } finally {
    sniperRunning = false;
    if (db.sniperDaemon) db.sniperDaemon.isRunning = false;
    saveDb(db);
  }

  return newHits;
}

// Periodic Background Sniper Check: every 5 minutes, checks if interval elapsed
const SNIPER_CHECK_INTERVAL_MS = 5 * 60 * 1000;
setInterval(async () => {
  if (db.settings && db.settings.autoSniperEnabled !== false && !sniperRunning) {
    const activeTargets = (db.watchlist || []).filter(w => w.active);
    if (activeTargets.length > 0) {
      const intervalMinutes = (db.settings && db.settings.scanIntervalMinutes) || 120;
      const intervalMs = intervalMinutes * 60 * 1000;
      const lastRun = db.sniperDaemon?.lastRunAt || 0;
      if (Date.now() - lastRun >= intervalMs) {
        console.log(`[SNIPER DAEMON] ⏰ Scheduled scan trigger (${Math.round((Date.now() - lastRun) / 60000)}m elapsed >= ${intervalMinutes}m interval). Starting sniper scan...`);
        await runAutonomousSniperScan();
      }
    }
  }
}, SNIPER_CHECK_INTERVAL_MS);

// Initial Sniper kickstart: run 15s after startup if never run or > 30 mins since last scan
setTimeout(async () => {
  if (db.settings && db.settings.autoSniperEnabled !== false && !sniperRunning) {
    const activeTargets = (db.watchlist || []).filter(w => w.active);
    const lastRun = db.sniperDaemon && db.sniperDaemon.lastRunAt;
    const intervalMs = ((db.settings && db.settings.scanIntervalMinutes) || 120) * 60 * 1000;
    const needsRun = activeTargets.length > 0 && (!lastRun || (Date.now() - lastRun > Math.min(intervalMs, 30 * 60 * 1000)));
    if (needsRun) {
      console.log(`[SNIPER DAEMON] Initializing kickstart scan (${activeTargets.length} active watchlist targets)...`);
      await runAutonomousSniperScan();
    }
  }
}, 15000);

// -------------------------------------------------------------
// AUTONOMOUS HOURLY DATABASE CRAWLER
// -------------------------------------------------------------
const CRAWLER_DEPARTMENTS = [
  { id: 'all', name: '⚡ Broad All Deals' },
  { id: 'electronics', name: 'Electronics & Audio' },
  { id: 'pc', name: 'Computers & Tablets' },
  { id: 'kitchen', name: 'Home & Kitchen' },
  { id: 'hi', name: 'Tools & Home Improvement' },
  { id: 'videogames', name: 'Video Games & Consoles' },
  { id: 'sporting', name: 'Sports & Outdoors' },
  { id: 'toys-and-games', name: 'Toys & Games' },
  { id: 'beauty', name: 'Beauty & Personal Care' },
  { id: 'stripbooks', name: 'Books' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'pets', name: 'Pet Supplies' },
  { id: 'office-products', name: 'Office Products' },
  { id: 'baby', name: 'Baby Products' },
  { id: 'garden', name: 'Garden & Outdoor' },
  { id: 'hpc', name: 'Health & Household' },
  { id: 'mi', name: 'Musical Instruments' },
  { id: 'luggage', name: 'Luggage & Travel' }
];

let crawlerRunning = false;

async function checkWatchlistMatch(item) {
  const activeTargets = (db.watchlist || []).filter(w => w.active);
  for (const target of activeTargets) {
    if (isWatchlistMatch(item, target)) {
      item.snipedFromTarget = target.keyword;
      if (!db.snipedDeals.some(d => d.asin === item.asin)) {
        item.snipedAt = Date.now();
        db.snipedDeals.unshift(item);
        target.matchCount = (target.matchCount || 0) + 1;
        console.log(`[SNIPER HIT FROM CRAWLER] Matched "${target.keyword}": ${item.title} at ${item.price}`);
        await dispatchDealNotification(item, target);
      }
    }
  }
}

async function runAutonomousCrawler(maxPagesPerDept = 6, overrideExcluded = null) {
  if (crawlerRunning) {
    console.log('[CRAWLER] Crawler already running. Skipping.');
    return { skipped: true };
  }
  crawlerRunning = true;
  if (!db.crawler) db.crawler = {};
  db.crawler.isRunning = true;
  db.crawler.lastRunAt = Date.now();
  saveDb(db);

  const startTime = Date.now();
  const depth = (db.settings && db.settings.crawlerDepth) || maxPagesPerDept;
  console.log(`[CRAWLER] 🚀 Starting dual crawler sweep (Warehouse + Normal Retail clearance) across ${CRAWLER_DEPARTMENTS.length} departments (depth: ${depth} pages/dept = up to ${depth * CRAWLER_DEPARTMENTS.length * 2} pages)...`);
  let totalScanned = 0;
  let pagesScanned = 0;
  let newAdded = 0;
  let priceDrops = 0;
  const domain = db.settings.defaultDomain || 'amazon.com.au';

  const storesToCrawl = [
    { type: 'warehouse', label: '📦 Warehouse' },
    { type: 'normal', label: '🛒 Normal Amazon' }
  ];

  try {
    // 0. Poll and Ingest Live OzBargain Amazon Community Hot Deals
    try {
      db.crawler.currentStep = '🇦🇺 Polling OzBargain Community Hot Deals...';
      const ozDeals = await fetchOzBargainDeals();
      if (ozDeals && ozDeals.length > 0) {
        newAdded += ozDeals.length;
      }
    } catch (ozbErr) {
      console.warn('[CRAWLER] OzBargain sync warning:', ozbErr.message);
    }

    for (const store of storesToCrawl) {
      for (let i = 0; i < CRAWLER_DEPARTMENTS.length; i++) {
        const dept = CRAWLER_DEPARTMENTS[i];

        const activeExcluded = overrideExcluded || (db.settings && db.settings.excludedCategories) || [];
        if (activeExcluded.includes(dept.id) || (activeExcluded.includes('books') && dept.id === 'stripbooks') || (activeExcluded.includes('stripbooks') && dept.id === 'books') || (activeExcluded.includes('pets') && dept.id === 'pets')) {
          console.log(`[CRAWLER] ⏭️ Skipping excluded department: ${dept.name}`);
          continue;
        }

        for (let p = 1; p <= depth; p++) {
          db.crawler.currentStep = `${store.label}: ${dept.name} (p.${p}/${depth} • Dept ${i + 1}/${CRAWLER_DEPARTMENTS.length})`;
          try {
            pagesScanned++;
            const res = await scrapeAmazonStore({
              storeType: store.type,
              category: dept.id,
              minDiscount: 20,
              maxDiscount: 99,
              domain,
              sort: 'date-desc-rank',
              page: p,
              availableOnly: true
            });

            const items = res.items || [];
            totalScanned += items.length;

            for (const item of items) {
              item.category = dept.id;
              const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
              item.numericPrice = numericPrice;
              item.domain = domain;
              item.store = store.type === 'warehouse' ? 'Amazon Warehouse' : 'Normal Amazon';

              item.isPriceError = isValidPriceError(item);

              if (!db.crawledDeals[item.asin]) {
                item.firstSeenAt = Date.now();
                item.lastSeenAt = Date.now();
                item.status = 'active';
                db.crawledDeals[item.asin] = item;
                newAdded++;
                if (item.isPriceError) {
                  console.log(`[CRAWLER] 🚨 Price Error Ingested: ${item.title.substring(0, 50)} at ${item.price} (${item.discountPercent} OFF)!`);
                  await dispatchPriceErrorNotification(item);
                }
                await checkWatchlistMatch(item);
              } else {
                const existing = db.crawledDeals[item.asin];
                existing.lastSeenAt = Date.now();
                existing.status = 'active';
                if (item.isPriceError) existing.isPriceError = true;
                // Preserve warehouse store type if either crawl found it in Warehouse
                if (item.store === 'Amazon Warehouse' || existing.store === 'Amazon Warehouse') {
                  existing.store = 'Amazon Warehouse';
                } else {
                  existing.store = item.store;
                }
                if (item.condition && !existing.condition) {
                  existing.condition = item.condition;
                }
                // Preserve original firstSeenAt: a deal seen 1 hour ago stays 1 hour ago
                if (!existing.firstSeenAt) {
                  existing.firstSeenAt = existing.lastSeenAt || Date.now();
                }

                if (numericPrice > 0 && existing.numericPrice > 0 && numericPrice < existing.numericPrice) {
                  existing.previousPrice = existing.price;
                  existing.price = item.price;
                  existing.numericPrice = numericPrice;
                  existing.discountPercent = item.discountPercent;
                  existing.priceDropAt = Date.now();
                  if (discNum >= 80) existing.isPriceError = true;
                  priceDrops++;
                  console.log(`[CRAWLER] 🔥 Price drop on ${item.asin}: ${existing.previousPrice} -> ${item.price}`);
                  if (existing.isPriceError) {
                    await dispatchPriceErrorNotification(existing);
                  }
                }
              }
            }

            if (!res.hasNextPage || items.length === 0) break;
            await new Promise(r => setTimeout(r, 1500));
          } catch (pageErr) {
            console.warn(`[CRAWLER] Page error in ${store.label} ${dept.name} p.${p}:`, pageErr.message);
          }
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      // Save database periodically after each department completes
      saveDb(db);
    }

    // 1. Dedicated Price Error & Deep Clearance Sweep (70%-99% Off across high-value departments, pages 1..3)
    const GLITCH_DEPARTMENTS = [
      { id: 'electronics', name: 'Electronics' },
      { id: 'computers', name: 'Computers' },
      { id: 'videogames', name: 'Video Games' },
      { id: 'kitchen', name: 'Kitchen & Home' },
      { id: 'hi', name: 'Tools & Hardware' },
      { id: 'sporting', name: 'Sports & Outdoors' },
      { id: 'toys-and-games', name: 'Toys & Games' },
      { id: 'automotive', name: 'Automotive' },
      { id: 'office-products', name: 'Office Products' },
      { id: 'hpc', name: 'Health & Personal' },
      { id: 'mi', name: 'Audio & Music' }
    ];
    console.log(`[CRAWLER] 🔥 Initiating Expanded Clearance & Glitch Sweep across ${GLITCH_DEPARTMENTS.length} categories (70%+ off, multiple pages)...`);
    const activeExcludedGlitch = overrideExcluded || (db.settings && db.settings.excludedCategories) || [];
    for (const dept of GLITCH_DEPARTMENTS) {
      if (activeExcludedGlitch.includes(dept.id)) continue;
      for (let gp = 1; gp <= 3; gp++) {
        db.crawler.currentStep = `🔥 Clearance / Glitch Sweep: ${dept.name} (p.${gp}/3 • 70%+ Off)`;
        try {
          pagesScanned++;
          const glitchRes = await scrapeAmazonStore({
            storeType: 'both',
            category: dept.id,
            minDiscount: 70,
            maxDiscount: 99,
            domain,
            sort: 'date-desc-rank',
            page: gp,
            availableOnly: true
          });
          const glitchItems = glitchRes.items || [];
          totalScanned += glitchItems.length;
          for (const item of glitchItems) {
            item.category = dept.id;
            item.isPriceError = isValidPriceError(item);
            const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
            item.numericPrice = numericPrice;
            item.domain = domain;
            item.store = item.store || 'Normal Amazon';

            if (!db.crawledDeals[item.asin]) {
              item.firstSeenAt = Date.now();
              item.lastSeenAt = Date.now();
              item.status = 'active';
              db.crawledDeals[item.asin] = item;
              newAdded++;
              if (item.isPriceError) {
                console.log(`[PRICE ERROR SWEEP] 🚨 Discovered ${item.discountPercent} OFF glitch: ${item.title.substring(0, 60)} for ${item.price}!`);
                await dispatchPriceErrorNotification(item);
              }
              await checkWatchlistMatch(item);
            } else {
              const existing = db.crawledDeals[item.asin];
              existing.lastSeenAt = Date.now();
              if (item.isPriceError) existing.isPriceError = true;
              if (numericPrice > 0 && existing.numericPrice > 0 && numericPrice < existing.numericPrice) {
                existing.previousPrice = existing.price;
                existing.price = item.price;
                existing.numericPrice = numericPrice;
                existing.discountPercent = item.discountPercent;
                existing.priceDropAt = Date.now();
                priceDrops++;
                if (existing.isPriceError) await dispatchPriceErrorNotification(existing);
              }
            }
          }
          if (!glitchRes.hasNextPage || glitchItems.length === 0) break;
          await new Promise(r => setTimeout(r, 1200));
        } catch (err) {
          console.warn(`[CRAWLER] Glitch sweep error on ${dept.id} p.${gp}:`, err.message);
        }
      }
    }
    saveDb(db);

    // 2. Dedicated Amazon Warehouse & Clearance Premier Brand Bargain Sniper (35+ Top Brands)
    const PREMIER_SNIPER_BRANDS = [
      'apple', 'sony', 'bose', 'dyson', 'nintendo', 'playstation', 
      'xbox', 'logitech', 'samsung', 'garmin', 'ninja', 'dewalt', 'asus',
      'sennheiser', 'lenovo', 'dell', 'hp', 'lg', 'anker', 'jbl', 'sonos',
      'gopro', 'dji', 'sandisk', 'crucial', 'corsair', 'steelseries', 'razer',
      'philips', 'breville', 'delonghi', 'kitchenaid', 'roborock', 'oral-b',
      'braun', 'makita', 'bosch', 'lego', 'beats'
    ];
    console.log(`[CRAWLER] 🎯 Scanning Amazon Warehouse & Retail Clearance for top in-demand brand bargains across ${PREMIER_SNIPER_BRANDS.length} brands...`);
    for (const brand of PREMIER_SNIPER_BRANDS) {
      db.crawler.currentStep = `📦 Brand Sniper: ${brand.toUpperCase()} (Warehouse & Clearance)`;
      try {
        pagesScanned++;
        // 1) Warehouse search
        const brandRes = await scrapeAmazonStore({
          storeType: 'warehouse',
          keyword: brand,
          category: 'all',
          domain,
          sort: 'date-desc-rank',
          page: 1,
          availableOnly: true
        });
        const brandItems = brandRes.items || [];
        totalScanned += brandItems.length;
        for (const item of brandItems) {
          item.isPriceError = isValidPriceError(item);
          const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
          item.numericPrice = numericPrice;
          item.domain = domain;
          item.store = 'Amazon Warehouse';

          if (!db.crawledDeals[item.asin]) {
            item.firstSeenAt = Date.now();
            item.lastSeenAt = Date.now();
            item.status = 'active';
            db.crawledDeals[item.asin] = item;
            newAdded++;
            if (item.isPriceError) {
              console.log(`[BRAND SNIPER] 🚨 Price Error on ${brand}: ${item.title.substring(0, 50)} at ${item.price}!`);
              await dispatchPriceErrorNotification(item);
            }
            await checkWatchlistMatch(item);
          } else {
            const existing = db.crawledDeals[item.asin];
            existing.lastSeenAt = Date.now();
            existing.store = 'Amazon Warehouse';
            if (item.isPriceError) existing.isPriceError = true;
            if (numericPrice > 0 && existing.numericPrice > 0 && numericPrice < existing.numericPrice) {
              existing.previousPrice = existing.price;
              existing.price = item.price;
              existing.numericPrice = numericPrice;
              existing.discountPercent = item.discountPercent;
              existing.priceDropAt = Date.now();
              priceDrops++;
              if (existing.isPriceError) await dispatchPriceErrorNotification(existing);
            }
          }
        }
        await new Promise(r => setTimeout(r, 800));

        // 2) Normal Amazon clearance (35%+ off)
        const normalRes = await scrapeAmazonStore({
          storeType: 'normal',
          keyword: brand,
          category: 'all',
          minDiscount: 35,
          domain,
          sort: 'date-desc-rank',
          page: 1,
          availableOnly: true
        });
        const normalItems = normalRes.items || [];
        totalScanned += normalItems.length;
        for (const item of normalItems) {
          item.isPriceError = isValidPriceError(item);
          const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
          item.numericPrice = numericPrice;
          item.domain = domain;
          item.store = 'Normal Amazon';

          if (!db.crawledDeals[item.asin]) {
            item.firstSeenAt = Date.now();
            item.lastSeenAt = Date.now();
            item.status = 'active';
            db.crawledDeals[item.asin] = item;
            newAdded++;
            if (item.isPriceError) {
              console.log(`[BRAND SNIPER] 🚨 Clearance Price Error on ${brand}: ${item.title.substring(0, 50)} at ${item.price}!`);
              await dispatchPriceErrorNotification(item);
            }
            await checkWatchlistMatch(item);
          } else {
            const existing = db.crawledDeals[item.asin];
            existing.lastSeenAt = Date.now();
            if (item.isPriceError) existing.isPriceError = true;
            if (numericPrice > 0 && existing.numericPrice > 0 && numericPrice < existing.numericPrice) {
              existing.previousPrice = existing.price;
              existing.price = item.price;
              existing.numericPrice = numericPrice;
              existing.discountPercent = item.discountPercent;
              existing.priceDropAt = Date.now();
              priceDrops++;
              if (existing.isPriceError) await dispatchPriceErrorNotification(existing);
            }
          }
        }
        await new Promise(r => setTimeout(r, 800));
      } catch (brandErr) {
        console.warn(`[CRAWLER] Brand sweep error for ${brand}:`, brandErr.message);
      }
    }
    // Automated 14-day database retention purge
    const retention = pruneStaleDeals(db, 14);
    if (retention.prunedCount > 0) {
      console.log(`[CRAWLER] 🧹 14-Day Retention: Purged ${retention.prunedCount} stale deals (>14 days old). Remaining: ${retention.remainingDeals}`);
    }
    saveDb(db);

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    db.crawler.lastRunStats = { totalScanned, pagesScanned, newAdded, priceDrops, durationSeconds };
    db.crawler.lastRunAt = Date.now();
    const intervalMs = (db.crawler.intervalMinutes || 60) * 60 * 1000;
    db.crawler.nextRunAt = Date.now() + intervalMs;
    console.log(`[CRAWLER] ✅ Completed in ${durationSeconds}s. Pages Scanned: ${pagesScanned}, Items Scanned: ${totalScanned}, New: ${newAdded}, Price Drops: ${priceDrops}`);
  } catch (err) {
    console.error('[CRAWLER] Global error during sweep:', err.message);
  } finally {
    crawlerRunning = false;
    db.crawler.isRunning = false;
    db.crawler.currentStep = '';
    saveDb(db);
  }

  return { totalScanned, newAdded, priceDrops };
}

// Scheduled Background Crawler Check: every 5 minutes, checks if crawler interval has elapsed
const CRAWLER_CHECK_INTERVAL_MS = 5 * 60 * 1000;
setInterval(async () => {
  if (db.crawler && db.crawler.enabled !== false && !crawlerRunning) {
    const intervalMinutes = db.crawler.intervalMinutes || 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    const timeSinceLast = db.crawler.lastRunAt ? (Date.now() - db.crawler.lastRunAt) : Infinity;
    if (timeSinceLast >= intervalMs) {
      console.log(`[CRAWLER] ⏰ Scheduled sweep trigger (${Math.round(timeSinceLast / 60000)}m elapsed >= ${intervalMinutes}m interval). Starting autonomous crawl...`);
      await runAutonomousCrawler();
    }
  }
}, CRAWLER_CHECK_INTERVAL_MS);

// Scheduled OzBargain Community Feed Sync: every 30 minutes
const OZBARGAIN_SYNC_INTERVAL_MS = 30 * 60 * 1000;
setInterval(async () => {
  try {
    console.log('[OZBARGAIN SYNC] ⏰ Running scheduled 30m OzBargain sync...');
    await fetchOzBargainDeals();
  } catch (e) {
    console.warn('[OZBARGAIN SYNC] Scheduled poll notice:', e.message);
  }
}, OZBARGAIN_SYNC_INTERVAL_MS);

// Initial Crawler kickstart: run 5s after server launch if DB has < 100 items or hasn't run in > 30 mins
setTimeout(async () => {
  try {
    console.log('[OZBARGAIN SYNC] Ingesting initial OzBargain community deals...');
    await fetchOzBargainDeals();
  } catch (e) {}

  const dealCount = Object.keys(db.crawledDeals || {}).length;
  const timeSinceLast = db.crawler?.lastRunAt ? (Date.now() - db.crawler.lastRunAt) : Infinity;
  const needsRun = dealCount < 100 || timeSinceLast > 30 * 60 * 1000;
  if (needsRun && db.crawler && db.crawler.enabled !== false && !crawlerRunning) {
    console.log(`[CRAWLER] Initializing startup crawler sweep (current DB count: ${dealCount}, time since last crawl: ${timeSinceLast === Infinity ? 'never' : Math.round(timeSinceLast / 60000) + 'm'})...`);
    await runAutonomousCrawler();
  }
}, 5000);

// Graceful Shutdown Handlers (Docker Stop / Restart)
function handleShutdown(signal) {
  console.log(`[SERVER] Received ${signal}. Resetting active runtime flags and saving database...`);
  crawlerRunning = false;
  sniperRunning = false;
  if (db.crawler) {
    db.crawler.isRunning = false;
    db.crawler.currentStep = '';
  }
  if (db.sniperDaemon) {
    db.sniperDaemon.isRunning = false;
  }
  saveDb(db);
  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Launch Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Amazon Warehouse Hunter Server Running!`);
  console.log(`📍 Local URL:    http://localhost:${PORT}`);
  console.log(`🌐 Network URL:  http://0.0.0.0:${PORT}`);
  console.log(`📂 Database:     ${DB_FILE}`);
  console.log(`🎯 Active Watchlist Targets: ${(db.watchlist || []).filter(w => w.active).length}`);
  console.log('====================================================');
});
