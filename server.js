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

// Thread-safe / Atomic JSON Database Loader & Saver
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      if (!loaded.crawledDeals) loaded.crawledDeals = {};
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
      }
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
  const dept = AMAZON_DEPARTMENTS[category];

  if (storeType === 'normal' || storeType === 'both') {
    const iParam = dept || (category === 'all' || category === 'warehouse-deals' ? 'aps' : category);
    url = `https://www.${domain}/s?i=${encodeURIComponent(iParam)}&pct-off=${minDiscount}-${maxDiscount}`;
    let combinedK = keyword || '';
    if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
    if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
    if (combinedK) url += `&k=${encodeURIComponent(combinedK)}`;
  } else {
    // Warehouse deals: always search within i=warehouse-deals to stay in Amazon Warehouse
    url = `https://www.${domain}/s?i=warehouse-deals&pct-off=${minDiscount}-${maxDiscount}`;
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

    // Auto-save all scraped products into the database so deep searches are never lost!
    if (data.products && data.products.length > 0) {
      const now = Date.now();
      for (const item of data.products) {
        if (!item.asin) continue;
        const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
        item.numericPrice = numericPrice;
        item.domain = opts.domain;
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

app.delete('/api/sniped', (req, res) => {
  db.snipedDeals = [];
  (db.watchlist || []).forEach(w => w.matchCount = 0);
  saveDb(db);
  res.json({ success: true, count: 0 });
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
  const {
    timeWindow = 'all', // '1h', '2h', '6h', '12h', '24h', 'all'
    storeType = 'both', // 'warehouse', 'normal', 'both'
    category = 'all',
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

  const now = Date.now();
  const allDeals = Object.values(db.crawledDeals || {});

  // Time window bounds in milliseconds
  const timeWindows = {
    '1h': 1 * 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  };
  const windowMs = timeWindows[timeWindow] || 0;

  // Compute live stats for quick pill counts
  let count1h = 0, count2h = 0, count6h = 0, count12h = 0, count24h = 0;
  let totalWarehouse = 0, totalNormal = 0;
  for (const d of allDeals) {
    if (d.status === 'sold_out') continue;
    if (d.store === 'Normal Amazon') totalNormal++;
    else totalWarehouse++;

    // If store filter is active, only count matches for that store
    if (storeType === 'warehouse' && d.store === 'Normal Amazon') continue;
    if (storeType === 'normal' && d.store !== 'Normal Amazon') continue;

    const age = now - (d.firstSeenAt || d.lastSeenAt || now);
    if (age <= 1 * 3600000) count1h++;
    if (age <= 2 * 3600000) count2h++;
    if (age <= 6 * 3600000) count6h++;
    if (age <= 12 * 3600000) count12h++;
    if (age <= 24 * 3600000) count24h++;
  }

  const negList = negKeywords ? negKeywords.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  const searchTerms = keyword ? keyword.toLowerCase().split(/\s+/).filter(Boolean) : [];

  let filtered = allDeals.filter(d => {
    if (d.status === 'sold_out') return false;

    // Available / In-stock filter
    if ((availableOnly === 'true' || availableOnly === true) && d.inStock === false) {
      return false;
    }

    // Store type filter (Warehouse vs Normal Amazon vs Both)
    if (storeType === 'warehouse' && d.store === 'Normal Amazon') return false;
    if (storeType === 'normal' && d.store !== 'Normal Amazon') return false;

    // Time window filter
    if (windowMs > 0) {
      const age = now - (d.firstSeenAt || now);
      if (age > windowMs) return false;
    }

    // Category filter
    if (category !== 'all' && category !== 'sweep_all' && d.category !== category) {
      return false;
    }

    // Discount filter
    const disc = parseInt(d.discountPercent, 10) || 0;
    if (disc < parseInt(minDiscount, 10) || disc > parseInt(maxDiscount, 10)) {
      return false;
    }

    // Price filter
    const np = d.numericPrice || 0;
    const minP = parseFloat(minPrice) || 0;
    const maxP = parseFloat(maxPrice) || 0;
    if (minP > 0 && np < minP) return false;
    if (maxP > 0 && np > maxP) return false;

    // Condition filter (normalized comparison)
    if (condition && condition !== 'all') {
      const c = (d.condition || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetCond = condition.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!c.includes(targetCond)) return false;
    }

    // Excluded keywords
    if (negList.length > 0) {
      const text = `${d.title} ${d.condition || ''}`.toLowerCase();
      if (negList.some(neg => text.includes(neg))) return false;
    }

    // Keyword search
    if (searchTerms.length > 0) {
      const text = `${d.title} ${d.asin}`.toLowerCase();
      if (!searchTerms.every(t => text.includes(t))) return false;
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    switch (sort) {
      case 'date-desc-rank':
        return (b.firstSeenAt || 0) - (a.firstSeenAt || 0);
      case 'price-asc-rank':
        return (a.numericPrice || 0) - (b.numericPrice || 0);
      case 'price-desc-rank':
        return (b.numericPrice || 0) - (a.numericPrice || 0);
      case 'discount-desc-rank':
        return (parseInt(b.discountPercent, 10) || 0) - (parseInt(a.discountPercent, 10) || 0);
      case 'review-rank':
        return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      default:
        return (b.firstSeenAt || 0) - (a.firstSeenAt || 0);
    }
  });

  const p = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.max(1, parseInt(limit, 10) || 48);
  const total = filtered.length;
  const totalPages = Math.ceil(total / lim) || 1;
  const products = filtered.slice((p - 1) * lim, p * lim);

  res.json({
    total,
    page: p,
    totalPages,
    products,
    stats: {
      totalInDb: allDeals.length,
      warehouseDeals: totalWarehouse,
      normalDeals: totalNormal,
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
});

// Crawler Status Endpoint
app.get('/api/db/status', (req, res) => {
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
    crawler: db.crawler || {}
  });
});

// Manual Trigger for Crawler Sweep
app.post('/api/db/scan', async (req, res) => {
  try {
    if (db.crawler && db.crawler.isRunning) {
      return res.json({ success: false, message: 'Scan already in progress' });
    }
    const isDeep = req.query.deep === 'true' || (req.body && req.body.deep);
    const pages = isDeep ? 8 : (req.body && req.body.pages ? parseInt(req.body.pages, 10) : 6);
    runAutonomousCrawler(pages).catch(e => console.error('[CRAWLER] Background error:', e));
    res.json({ success: true, message: `Background ${isDeep ? 'Deep Sweep (150+ Pages across all 12 Categories)' : 'Scan'} started (${pages} pages per department)` });
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

// -------------------------------------------------------------
// WATCHLIST MATCH ENGINE (Precision Keyword & Anti-Accessory Verification)
// -------------------------------------------------------------
function isWatchlistMatch(item, target) {
  if (!item || !item.title || !target || !target.keyword) return false;

  const targetKw = target.keyword.trim().toLowerCase();
  const title = (item.title || '').toLowerCase();

  // 1. Tokenize significant words from target keyword (length >= 2)
  const requiredTokens = targetKw
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  if (requiredTokens.length === 0) return false;

  // 2. All required tokens must be present in the title as word boundaries
  const allTokensMatch = requiredTokens.every(token => {
    const re = new RegExp('\\b' + token + '\\b', 'i');
    return re.test(title);
  });
  if (!allTokensMatch) return false;

  // 3. Accessory, Case, Adapter & Manual filter: If target keyword does NOT ask for an accessory,
  // reject items that are cases, covers, sleeves, pouches, cables, straps, user guides, etc.
  const targetWantsAccessory = /\b(case|cover|sleeve|pouch|strap|cable|charger|adapter|converter|protector|holder|skin|band|keychain|charm|manual|guide|book|stand|mount|tips|pads)\b/i.test(targetKw);

  if (!targetWantsAccessory) {
    const isJunkOrAccessory = /\b(case\s+(for|compatible|cover|bag|pouch|shell|skin)|cover\s+(for|compatible|case|skin)|protective\s+(case|cover|shell|skin|sleeve)|(carrying|travel|storage)\s+(case|bag|pouch)|(silicone|clear|hard|leather|rugged|tpu|neoprene)\s+(case|cover|skin|sleeve|bag|pouch)|(sleeve|sleeves|pouch|pouches|skin|skins|decal|decals|holster|holsters)|screen\s+protectors?|replacement\s+(ear\s*tips?|ear\s*pads?|cushions?|cables?|batter(y|ies))|adapters?|converters?|chargers?|cables?|cords?|dust\s*plugs?|keychains?|charms?|straps?|stands?|mounts?|cleaning\s*kits?|users?['’s]*\s+guides?|manuals?|guidebooks?|handbooks?|tips\s+and\s+tricks|for\s+([0-9a-z.-]+\s+)*(apple|kindle|sony|samsung|iphone|airpods|ipad)\b|compatible\s+with)\b/i.test(title);
    if (isJunkOrAccessory) return false;
  }

  // 4. Price bounds check
  const numPrice = item.numericPrice || parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
  if (target.maxPrice > 0 && numPrice > target.maxPrice) return false;

  // 5. Discount threshold check
  const disc = parseInt(item.discountPercent, 10) || 0;
  if (target.minDiscount > 0 && disc < target.minDiscount) return false;

  return true;
}

function pruneInvalidSnipedDeals() {
  if (!Array.isArray(db.snipedDeals) || db.snipedDeals.length === 0) return;
  const activeTargets = (db.watchlist || []).filter(w => w.active);
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
async function runAutonomousSniperScan() {
  const activeTargets = (db.watchlist || []).filter(w => w.active);
  if (activeTargets.length === 0) return [];

  const intervalMinutes = (db.settings && db.settings.scanIntervalMinutes) || 120;
  const intervalMs = intervalMinutes * 60 * 1000;
  if (!db.sniperDaemon) db.sniperDaemon = {};
  db.sniperDaemon.isRunning = true;
  db.sniperDaemon.lastRunAt = Date.now();
  db.sniperDaemon.nextRunAt = Date.now() + intervalMs;

  console.log(`[SNIPER DAEMON] 🎯 Scanning ${activeTargets.length} active watchlist targets (every ${intervalMinutes}m / 2h)...`);
  const domain = db.settings.defaultDomain || 'amazon.com.au';
  const newHits = [];

  try {
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
          if (!isWatchlistMatch(item, target)) continue;

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
  } finally {
    db.sniperDaemon.isRunning = false;
    saveDb(db);
  }

  return newHits;
}

// Start Periodic Background Sniper Schedule (Runs every 2 hours)
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
setInterval(async () => {
  if (db.settings && db.settings.autoSniperEnabled !== false) {
    console.log(`[SNIPER DAEMON] ⏰ Starting scheduled 2-hour scan cycle...`);
    await runAutonomousSniperScan();
  }
}, TWO_HOURS_MS);

// Initial Sniper kickstart: run 15s after startup if never run or > 2 hours since last scan
setTimeout(async () => {
  if (db.settings && db.settings.autoSniperEnabled !== false) {
    const activeTargets = (db.watchlist || []).filter(w => w.active);
    const lastRun = db.sniperDaemon && db.sniperDaemon.lastRunAt;
    const intervalMs = ((db.settings && db.settings.scanIntervalMinutes) || 120) * 60 * 1000;
    const needsRun = activeTargets.length > 0 && (!lastRun || (Date.now() - lastRun > intervalMs));
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

async function runAutonomousCrawler(maxPagesPerDept = 20) {
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
    for (const store of storesToCrawl) {
      for (let i = 0; i < CRAWLER_DEPARTMENTS.length; i++) {
        const dept = CRAWLER_DEPARTMENTS[i];

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

              if (!db.crawledDeals[item.asin]) {
                item.firstSeenAt = Date.now();
                item.lastSeenAt = Date.now();
                item.status = 'active';
                db.crawledDeals[item.asin] = item;
                newAdded++;
                await checkWatchlistMatch(item);
              } else {
                const existing = db.crawledDeals[item.asin];
                existing.lastSeenAt = Date.now();
                existing.status = 'active';
                existing.store = item.store;
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
                  priceDrops++;
                  console.log(`[CRAWLER] 🔥 Price drop on ${item.asin}: ${existing.previousPrice} -> ${item.price}`);
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
    }

    // Prune deals older than 14 days
    const FOURTEEN_DAYS = 14 * 24 * 3600 * 1000;
    const now = Date.now();
    for (const asin in db.crawledDeals) {
      const deal = db.crawledDeals[asin];
      if (now - (deal.lastSeenAt || deal.firstSeenAt || now) > FOURTEEN_DAYS) {
        delete db.crawledDeals[asin];
      }
    }

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

// Scheduled Hourly Background Crawler
const HOURLY_INTERVAL_MS = 60 * 60 * 1000;
setInterval(async () => {
  if (db.crawler && db.crawler.enabled !== false) {
    await runAutonomousCrawler();
  }
}, HOURLY_INTERVAL_MS);

// Initial Crawler kickstart: run 10s after server launch if DB has < 100 items or hasn't run in > 1 hr
setTimeout(async () => {
  const dealCount = Object.keys(db.crawledDeals || {}).length;
  const needsRun = dealCount < 100 || !db.crawler.lastRunAt || (Date.now() - db.crawler.lastRunAt > 60 * 60 * 1000);
  if (needsRun && db.crawler && db.crawler.enabled !== false) {
    console.log(`[CRAWLER] Initializing first crawler sweep (current DB count: ${dealCount})...`);
    await runAutonomousCrawler();
  }
}, 10000);

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
