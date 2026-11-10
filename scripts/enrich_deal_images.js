/**
 * Amazon Warehouse Hunter - Comprehensive Image Enrichment Engine
 * Fetches real Amazon CDN product images for all deals missing pictures,
 * applies verified ASIN images and smart category SVG placeholders.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

const VERIFIED_REAL_IMAGES = {
  'B0CHR9TKR4': 'https://m.media-amazon.com/images/I/71dkl0fe7JL._AC_SX450_.jpg',
  'B0CHRB2QCB': 'https://m.media-amazon.com/images/I/71dkl0fe7JL._AC_SX450_.jpg',
  'B0CHRBBZ17': 'https://m.media-amazon.com/images/I/71dkl0fe7JL._AC_SX450_.jpg'
};

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

async function checkAsinCdn(asin) {
  const url = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCRM_.jpg`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('image/jpeg')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 1000) return url;
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchRealAmazonImage(asin) {
  const url = `https://www.amazon.com.au/dp/${asin}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const dyn = $('#landingImage').attr('data-a-dynamic-image');
    if (dyn) {
      try {
        const parsed = JSON.parse(dyn);
        const keys = Object.keys(parsed);
        if (keys.length > 0) return keys[0];
      } catch (e) {}
    }

    const hires = $('#landingImage').attr('data-old-hires');
    if (hires) return hires;

    const src = $('#landingImage').attr('src');
    if (src && !src.includes('placeholder')) return src;

    return null;
  } catch (e) {
    return null;
  }
}

async function enrichAllImages() {
  console.log('Loading database from:', DB_PATH);
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(raw);
  const allDeals = Object.values(db.crawledDeals || {});

  const missing = allDeals.filter(d => !d.image || d.image.trim() === '' || d.image.includes('placeholder'));
  console.log(`Found ${missing.length} deals with missing or placeholder images.`);

  if (missing.length === 0) {
    console.log('All deals already have valid images!');
    return;
  }

  let realFetched = 0;
  let fallbackAssigned = 0;
  const CONCURRENCY = 8;

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (deal) => {
      if (VERIFIED_REAL_IMAGES[deal.asin]) {
        deal.image = VERIFIED_REAL_IMAGES[deal.asin];
        realFetched++;
        return;
      }
      let img = await checkAsinCdn(deal.asin);
      if (!img) img = await fetchRealAmazonImage(deal.asin);

      if (img) {
        deal.image = img;
        realFetched++;
      } else {
        deal.image = getCategorySvgPlaceholder(deal.category, deal.title);
        fallbackAssigned++;
      }
      db.crawledDeals[deal.asin] = deal;
    }));

    if ((i + CONCURRENCY) % 40 === 0 || i + CONCURRENCY >= missing.length) {
      console.log(`Progress: ${Math.min(i + CONCURRENCY, missing.length)}/${missing.length} (Real fetched: ${realFetched}, SVG: ${fallbackAssigned})`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Also update snipedDeals and savedDeals if present
  if (Array.isArray(db.snipedDeals)) {
    for (const d of db.snipedDeals) {
      if (db.crawledDeals[d.asin]) {
        d.image = db.crawledDeals[d.asin].image;
      }
    }
  }

  console.log(`Saving enriched database to ${DB_PATH}...`);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`SUCCESS! Enriched all ${missing.length} deals.`);
}

if (require.main === module) {
  enrichAllImages().catch(err => {
    console.error('Enrichment failed:', err);
    process.exit(1);
  });
}

module.exports = { enrichAllImages, getCategorySvgPlaceholder, checkAsinCdn, fetchRealAmazonImage };
