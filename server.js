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
    scanIntervalMinutes: 10,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    defaultDomain: "amazon.com.au"
  }
};

// Thread-safe / Atomic JSON Database Loader & Saver
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
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

// Express Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  'office-products': 'office products'
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
function getCurrencySymbol(domain) {
  if (domain.includes('amazon.co.jp')) return '¥';
  if (domain.includes('amazon.co.uk')) return '£';
  if (domain.includes('amazon.de')) return '€';
  if (domain.includes('amazon.ca')) return 'CAD $';
  if (domain.includes('amazon.com.au')) return 'AUD $';
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

async function fetchAmazonHtml(url) {
  if (BROWSER_PATH) {
    return new Promise((resolve, reject) => {
      const args = [
        '--headless=new',
        '--dump-dom',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        url
      ];
      execFile(BROWSER_PATH, args, { maxBuffer: 15 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
        if (err && (!stdout || stdout.length < 500)) {
          console.warn('[SCRAPER] Headless browser error, falling back to HTTP fetch:', err.message);
          return resolve(fetchWithHttp(url));
        }
        resolve(stdout || '');
      });
    });
  }
  return fetchWithHttp(url);
}

async function fetchWithHttp(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8'
  };
  const res = await fetch(url, { headers });
  return await res.text();
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
  if (storeType === 'normal') {
    const iParam = (category === 'all' || category === 'warehouse-deals') ? 'aps' : category;
    url = `https://www.${domain}/s?i=${encodeURIComponent(iParam)}&pct-off=${minDiscount}-${maxDiscount}`;
    let combinedK = keyword || '';
    if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
    if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
    if (combinedK) url += `&k=${encodeURIComponent(combinedK)}`;
  } else {
    // warehouse deals
    url = `https://www.${domain}/s?i=warehouse-deals&pct-off=${minDiscount}-${maxDiscount}`;
    const catKw = WAREHOUSE_CATEGORY_KEYWORDS[category] || '';
    let combinedK = '';
    if (catKw && keyword) combinedK = `${catKw} ${keyword}`;
    else if (catKw) combinedK = catKw;
    else if (keyword) combinedK = keyword;

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

    // Link
    let link = $(el).find('h2 a').first().attr('href');
    if (!link) link = `/dp/${asin}`;
    if (!link.startsWith('http')) {
      link = `https://www.${domain}${link.startsWith('/') ? '' : '/'}${link}`;
    }

    // Image
    let image = $(el).find('img.s-image').first().attr('src') || '';

    // Robust Price Extraction (handles Warehouse secondary offers & normal retail)
    let price = 0;

    // 1. Check standard .a-price .a-offscreen
    const offscreenPrice = $(el).find('.a-price .a-offscreen').first().text().trim();
    if (offscreenPrice) {
      const m = offscreenPrice.replace(/,/g, '').match(/[\d.]+/);
      if (m) price = parseFloat(m[0]);
    }

    // 2. Check Warehouse secondary offer box: [data-cy="secondary-offer-recipe"]
    if (!price || price === 0) {
      const secondaryOfferText = $(el).find('[data-cy="secondary-offer-recipe"] .a-color-base').first().text().trim();
      if (secondaryOfferText) {
        const m = secondaryOfferText.replace(/,/g, '').match(/[\d.]+/);
        if (m) price = parseFloat(m[0]);
      }
    }

    // 3. Check .a-color-price
    if (!price || price === 0) {
      const colorPrice = $(el).find('.a-color-price').first().text().trim();
      if (colorPrice) {
        const m = colorPrice.replace(/,/g, '').match(/[\d.]+/);
        if (m) price = parseFloat(m[0]);
      }
    }

    // 4. Check .a-price-whole and .a-price-fraction
    if (!price || price === 0) {
      let priceWhole = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
      let priceFraction = $(el).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '');
      if (priceWhole) {
        price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
      }
    }

    // 5. Fallback: Search any text inside card matching dollar amount
    if (!price || price === 0) {
      const allText = $(el).text();
      const m = allText.match(/\$\s*(\d+(?:\.\d{2})?)/);
      if (m) {
        price = parseFloat(m[1]);
      }
    }

    // Original / List price
    let originalPrice = 0;
    const basisText = $(el).find('.a-text-price .a-offscreen, .a-text-strike, span[data-a-strike="true"]').first().text();
    if (basisText) {
      const match = basisText.replace(/,/g, '').match(/[\d.]+/);
      if (match) originalPrice = parseFloat(match[0]);
    }

    // Calculate discount
    let discountPercent = 0;
    if (originalPrice > price && price > 0) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    } else {
      const badgeText = $(el).find('.s-coupon-unclipped, .a-badge-text').text();
      const pctMatch = badgeText.match(/(\d+)%/);
      if (pctMatch) {
        discountPercent = parseInt(pctMatch[1], 10);
      } else {
        discountPercent = parseInt(minDiscount, 10) || 50;
      }
      if (price > 0 && discountPercent > 0 && discountPercent < 100) {
        originalPrice = Math.round((price / (1 - (discountPercent / 100))) * 100) / 100;
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

    items.push({
      asin,
      title,
      price: price > 0 ? `${currencySymbol}${price.toFixed(2)}` : 'Check Site',
      originalPrice: originalPrice > 0 ? `${currencySymbol}${originalPrice.toFixed(2)}` : '',
      discountPercent: `${discountPercent}%`,
      savings: savings !== '0.00' ? `${currencySymbol}${savings}` : '',
      url: link,
      link: link,
      image,
      rating,
      reviews,
      condition: itemCondition,
      store: storeType === 'warehouse' ? 'Amazon Warehouse' : 'Normal Amazon',
      isPrime,
      inStock
    });
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
  const { keyword, category = 'all', maxPrice = 0, minDiscount = 25 } = req.body;
  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const newTarget = {
    id: `target-${crypto.randomBytes(4).toString('hex')}`,
    keyword: keyword.trim(),
    category: category || 'all',
    maxPrice: parseFloat(maxPrice) || 0,
    minDiscount: parseInt(minDiscount, 10) || 25,
    active: true,
    createdAt: Date.now(),
    lastScannedAt: null,
    matchCount: 0
  };

  db.watchlist.unshift(newTarget);
  saveDb(db);
  res.status(201).json(newTarget);
});

app.delete('/api/watchlist/:id', (req, res) => {
  const id = req.params.id;
  db.watchlist = db.watchlist.filter(w => w.id !== id);
  saveDb(db);
  res.json({ success: true, count: db.watchlist.length });
});

app.put('/api/watchlist/:id/toggle', (req, res) => {
  const id = req.params.id;
  const target = db.watchlist.find(w => w.id === id);
  if (!target) return res.status(404).json({ error: 'Target not found' });

  target.active = !target.active;
  saveDb(db);
  res.json(target);
});

// Sniped deals endpoints
app.get('/api/sniped', (req, res) => {
  res.json(db.snipedDeals || []);
});

app.delete('/api/sniped/:asin', (req, res) => {
  const asin = req.params.asin;
  db.snipedDeals = db.snipedDeals.filter(s => s.asin !== asin);
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
    savedDealsCount: db.savedDeals.length
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

// -------------------------------------------------------------
// AUTONOMOUS 24/7 BACKGROUND SNIPER DAEMON
// -------------------------------------------------------------
async function runAutonomousSniperScan() {
  const activeTargets = (db.watchlist || []).filter(w => w.active);
  if (activeTargets.length === 0) return [];

  console.log(`[SNIPER DAEMON] Scanning ${activeTargets.length} active watchlist targets...`);
  const domain = db.settings.defaultDomain || 'amazon.com.au';
  const newHits = [];

  for (const target of activeTargets) {
    try {
      const res = await scrapeAmazonStore({
        storeType: 'both',
        keyword: target.keyword,
        category: target.category || 'all',
        minDiscount: target.minDiscount || 25,
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
        // Price numeric check
        const numPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
        if (target.maxPrice > 0 && numPrice > target.maxPrice) continue;

        item.snipedFromTarget = target.keyword;

        // Check if already in sniped deals
        if (!db.snipedDeals.some(d => d.asin === item.asin)) {
          item.snipedAt = Date.now();
          db.snipedDeals.unshift(item);
          newHits.push(item);
          target.matchCount = (target.matchCount || 0) + 1;
          console.log(`[SNIPER HIT] Found matching deal: ${item.title} at ${item.price}!`);

          // Send push notifications
          await dispatchDealNotification(item, target);
        }
      }
    } catch (err) {
      console.error(`[SNIPER DAEMON] Error scanning target "${target.keyword}":`, err.message);
    }
  }

  if (newHits.length > 0) {
    saveDb(db);
  }
  return newHits;
}

// Start Periodic Background Sniper Schedule
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
setInterval(async () => {
  if (db.settings && db.settings.autoSniperEnabled !== false) {
    await runAutonomousSniperScan();
  }
}, DEFAULT_INTERVAL_MS);

// Run initial sniper check 30 seconds after server launch
setTimeout(async () => {
  if (db.settings && db.settings.autoSniperEnabled !== false) {
    await runAutonomousSniperScan();
  }
}, 30000);

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
