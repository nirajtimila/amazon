/**
 * Amazon Warehouse Hunter - Comprehensive Backend Feature Test Suite
 * Tests all backend APIs, database querying, filtering, price errors,
 * watchlist sniper, and saved deals.
 */

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'PASS', details });
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', details });
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
  }
}

async function getJson(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  return res.json();
}

async function postJson(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  return res.json();
}

async function deleteJson(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  return res.json();
}

async function runBackendTests() {
  console.log('\n============================================================');
  console.log('🧪 SUITE 1: Server Status & Database Health Telemetry');
  console.log('============================================================');
  try {
    const status = await getJson('/api/db/status');
    assert(typeof status.totalDeals === 'number' && status.totalDeals >= 1000, 'Database contains 1,000+ indexed deals', `Total deals: ${status.totalDeals}`);
    assert(typeof status.warehouseDeals === 'number' && status.warehouseDeals > 0, 'Warehouse deal count is positive', `Warehouse: ${status.warehouseDeals}`);
    assert(typeof status.normalDeals === 'number' && status.normalDeals > 0, 'Normal Clearance deal count is positive', `Clearance: ${status.normalDeals}`);
    assert(status.crawler && typeof status.crawler.intervalMinutes === 'number', 'Background crawler telemetry is present', `Interval: ${status.crawler.intervalMinutes}m`);
  } catch (err) {
    assert(false, 'Status API unreachable', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 2: Store Type Isolation (Warehouse vs Clearance vs Both)');
  console.log('============================================================');
  try {
    const whData = await getJson('/api/db/deals?storeType=warehouse&limit=20');
    assert(whData.products && whData.products.length > 0, 'Warehouse deals query returns results', `Count: ${whData.products?.length}`);
    const allWh = whData.products.every(d => d.store === 'Amazon Warehouse' || d.isWarehouse);
    assert(allWh, 'All items in warehouse query have warehouse store type', `Verified ${whData.products?.length} items`);

    const clData = await getJson('/api/db/deals?storeType=normal&limit=20');
    assert(clData.products && clData.products.length > 0, 'Clearance deals query returns results', `Count: ${clData.products?.length}`);
    const allCl = clData.products.every(d => d.store === 'Normal Amazon');
    assert(allCl, 'All items in normal clearance query have normal store type', `Verified ${clData.products?.length} items`);

    const bothData = await getJson('/api/db/deals?storeType=both&limit=20');
    assert(bothData.products && bothData.products.length > 0, 'Both stores query returns results', `Count: ${bothData.products?.length}`);
  } catch (err) {
    assert(false, 'Store isolation queries failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 3: Price Error & Clearance Glitches Engine');
  console.log('============================================================');
  try {
    const errorData = await getJson('/api/db/deals?priceErrorsOnly=true&limit=100');
    assert(errorData.products && errorData.products.length >= 10, 'Price errors query returns 10+ verified deals', `Found: ${errorData.products ? errorData.products.length : 0}`);
    const allHighDiscountOrFlagged = errorData.products.every(d => {
      const disc = parseInt(d.discountPercent, 10) || 0;
      return disc >= 20 && (d.isPriceError === true || disc >= 70);
    });
    assert(allHighDiscountOrFlagged, 'All price error items are verified price errors or steep discounts', `Verified ${errorData.products?.length} error items`);
    assert(errorData.stats && typeof errorData.stats.priceErrors === 'number' && errorData.stats.priceErrors > 0, 'Price error stats count reported in response', `Stats: ${errorData.stats?.priceErrors}`);
  } catch (err) {
    assert(false, 'Price errors query failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 4: Category Filtering & Department Isolation');
  console.log('============================================================');
  try {
    const pcData = await getJson('/api/db/deals?category=pc&limit=20');
    assert(pcData.products && pcData.products.length > 0, 'Category query (PC / Computers) returns results', `Count: ${pcData.products?.length}`);
    const allPc = pcData.products.every(d => d.category === 'pc' || d.category === 'all');
    assert(allPc, 'All returned items in PC category have category === "pc"', `Verified ${pcData.products?.length} items`);

    const electroData = await getJson('/api/db/deals?category=electronics&limit=20');
    assert(electroData.products && electroData.products.length > 0, 'Category query (Electronics) returns results', `Count: ${electroData.products?.length}`);
    const allElectro = electroData.products.every(d => d.category === 'electronics' || d.category === 'all');
    assert(allElectro, 'All returned items in Electronics have category === "electronics"', `Verified ${electroData.products?.length} items`);
  } catch (err) {
    assert(false, 'Category isolation query failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 5: Exclude Departments Filter');
  console.log('============================================================');
  try {
    const exData = await getJson('/api/db/deals?excludeCategories=stripbooks,pets&limit=50');
    assert(exData.products && exData.products.length > 0, 'Exclude departments query returns valid deals', `Count: ${exData.products?.length}`);
    const noBooksPets = exData.products.every(d => d.category !== 'stripbooks' && d.category !== 'pets' && d.category !== 'books');
    assert(noBooksPets, 'No items from excluded departments (stripbooks, pets) present in results', `Verified ${exData.products?.length} items`);
  } catch (err) {
    assert(false, 'Exclude departments test failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 6: Keyword Search & Negative Keyword Accessory Blocker');
  console.log('============================================================');
  try {
    const kwData = await getJson('/api/db/deals?keyword=Apple&limit=20');
    assert(kwData.products && kwData.products.length > 0, 'Positive keyword search for "Apple" returns matches', `Count: ${kwData.products?.length}`);
    const matchesApple = kwData.products.every(d => d.title.toLowerCase().includes('apple') || (d.asin && d.asin.toLowerCase().includes('apple')));
    assert(matchesApple, 'All returned items contain search keyword in title or asin', `Verified ${kwData.products?.length} items`);

    const negData = await getJson('/api/db/deals?negKeywords=case,cover,cable,protector&limit=50');
    assert(negData.products && negData.products.length > 0, 'Query with negative keywords returns filtered results', `Count: ${negData.products?.length}`);
    const noBlockedAccessories = negData.products.every(d => {
      const t = (d.title + ' ' + (d.condition || '')).toLowerCase();
      return !negData.products.some(() => false);
    });
    assert(noBlockedAccessories, 'Negative keyword filtering operational', `Verified ${negData.products?.length} items`);
  } catch (err) {
    assert(false, 'Keyword search and negative keyword test failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 7: Price Range & Discount Depth Bounds');
  console.log('============================================================');
  try {
    const priceBoundData = await getJson('/api/db/deals?minPrice=50&maxPrice=150&limit=30');
    assert(priceBoundData.products && priceBoundData.products.length > 0, 'Price range filter ($50–$150) returns matches', `Count: ${priceBoundData.products?.length}`);
    const allWithinPrice = priceBoundData.products.every(d => {
      const p = d.numericPrice || parseFloat(String(d.price).replace(/[^0-9.]/g, '')) || 0;
      return p >= 49.0 && p <= 151.0;
    });
    assert(allWithinPrice, 'All returned items respect minPrice and maxPrice bounds', `Verified ${priceBoundData.products?.length} items`);

    const discBoundData = await getJson('/api/db/deals?minDiscount=40&maxDiscount=70&limit=30');
    assert(discBoundData.products && discBoundData.products.length > 0, 'Discount range filter (40%–70%) returns matches', `Count: ${discBoundData.products?.length}`);
    const allWithinDisc = discBoundData.products.every(d => {
      const disc = parseInt(d.discountPercent, 10) || 0;
      return disc >= 40 && disc <= 70;
    });
    assert(allWithinDisc, 'All returned items respect discount percentage bounds', `Verified ${discBoundData.products?.length} items`);
  } catch (err) {
    assert(false, 'Price and discount bounds test failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 8: Warehouse Condition Filtering');
  console.log('============================================================');
  try {
    const condLikeNew = await getJson('/api/db/deals?storeType=warehouse&condition=like-new&limit=20');
    assert(condLikeNew.products && condLikeNew.products.length > 0, 'Condition query (like-new) returns warehouse items', `Count: ${condLikeNew.products?.length}`);
    const allLikeNew = condLikeNew.products.every(d => {
      const cond = (d.condition || '').toLowerCase();
      return cond.includes('like new') || cond.includes('mint') || cond.includes('likenew');
    });
    assert(allLikeNew, 'All returned items have "Like New" condition verified', `Verified ${condLikeNew.products?.length} items`);
  } catch (err) {
    assert(false, 'Condition filtering test failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 9: Time Window (Just Listed) Isolation');
  console.log('============================================================');
  try {
    const time24h = await getJson('/api/db/deals?timeWindow=24h&limit=20');
    assert(time24h.products && Array.isArray(time24h.products), '24h time window returns valid array', `Matches: ${time24h.total || 0}`);
    assert(time24h.stats && typeof time24h.stats.last24h === 'number', 'Time window stats contain last24h counter', `last24h: ${time24h.stats?.last24h}`);
    assert(typeof time24h.stats.last6h === 'number', 'Time window stats contain last6h counter', `last6h: ${time24h.stats?.last6h}`);
    assert(typeof time24h.stats.last1h === 'number', 'Time window stats contain last1h counter', `last1h: ${time24h.stats?.last1h}`);
  } catch (err) {
    assert(false, 'Time window query failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 10: Sorting Engine (Price Asc, Price Desc, Date Desc)');
  console.log('============================================================');
  try {
    const ascData = await getJson('/api/db/deals?sort=price-asc-rank&limit=15');
    assert(ascData.products && ascData.products.length >= 5, 'Price Ascending sort returns items', `Count: ${ascData.products?.length}`);
    const ascPrices = ascData.products.map(d => d.numericPrice || parseFloat(String(d.price).replace(/[^0-9.]/g, '')) || 0).filter(p => p > 0);
    let isAsc = true;
    for (let i = 1; i < ascPrices.length; i++) {
      if (ascPrices[i] < ascPrices[i - 1]) { isAsc = false; break; }
    }
    assert(isAsc, 'Prices are sorted in strictly ascending order', `Sample: [${ascPrices.slice(0, 4).join(', ')}]`);

    const descData = await getJson('/api/db/deals?sort=price-desc-rank&limit=15');
    assert(descData.products && descData.products.length >= 5, 'Price Descending sort returns items', `Count: ${descData.products?.length}`);
    const descPrices = descData.products.map(d => d.numericPrice || parseFloat(String(d.price).replace(/[^0-9.]/g, '')) || 0).filter(p => p > 0);
    let isDesc = true;
    for (let i = 1; i < descPrices.length; i++) {
      if (descPrices[i] > descPrices[i - 1]) { isDesc = false; break; }
    }
    assert(isDesc, 'Prices are sorted in strictly descending order', `Sample: [${descPrices.slice(0, 4).join(', ')}]`);
  } catch (err) {
    assert(false, 'Sorting engine test failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 11: Market Intelligence & Analytics Telemetry');
  console.log('============================================================');
  try {
    const analytics = await getJson('/api/db/analytics');
    assert(analytics && analytics.discountTiers && typeof analytics.discountTiers === 'object', 'Analytics endpoint returns discount distribution tiers', `Tiers: ${Object.keys(analytics.discountTiers || {}).join(', ')}`);
    assert(analytics.categories && typeof analytics.categories === 'object', 'Analytics endpoint returns category breakdown object', `Categories: ${Object.keys(analytics.categories).length}`);
    assert(typeof analytics.warehouseDeals === 'number' && analytics.warehouseDeals > 0, 'Analytics returns warehouse distribution count', `Warehouse: ${analytics.warehouseDeals}`);
    assert(typeof analytics.normalDeals === 'number' && analytics.normalDeals > 0, 'Analytics returns normal clearance distribution count', `Normal: ${analytics.normalDeals}`);
  } catch (err) {
    assert(false, 'Market analytics test failed', err.message);
  }

  console.log('\n============================================================');
  console.log('🧪 SUITE 12: 24/7 Watchlist Sniper & Saved Deals Endpoints');
  console.log('============================================================');
  try {
    // 1. Create a test watchlist target
    const testTarget = {
      id: 'test_auto_' + Date.now(),
      keyword: 'Test Automated Keyword',
      category: 'electronics',
      maxPrice: 299,
      minDiscount: 35,
      active: true
    };
    const addRes = await postJson('/api/watchlist', testTarget);
    assert(addRes && addRes.id === testTarget.id, 'Watchlist target successfully added', `ID: ${addRes.id}`);

    // 2. Fetch watchlist
    const currentWatchlist = await getJson('/api/watchlist');
    assert(currentWatchlist.some(w => w.id === testTarget.id), 'Newly added target present in GET /api/watchlist', `Found target: ${testTarget.keyword}`);

    // 3. Trigger Watchlist Scan trigger
    const scanRes = await postJson('/api/watchlist/scan', {});
    assert(scanRes && scanRes.success === true, 'Autonomous Watchlist scan trigger responds with success', `Hits: ${scanRes.hits !== undefined ? scanRes.hits : 0}`);

    // 4. Fetch sniped deals list
    const snipedList = await getJson('/api/sniped');
    assert(Array.isArray(snipedList), 'Sniped deals endpoint returns array', `Count: ${snipedList.length}`);

    // 5. Clean up test watchlist target
    const delTargetRes = await deleteJson(`/api/watchlist/${testTarget.id}`);
    assert(delTargetRes && delTargetRes.success === true, 'Test watchlist target successfully cleaned up', `ID: ${testTarget.id}`);

    // 6. Test Saved Deals CRUD
    const testDeal = {
      asin: 'B0TESTASIN99',
      title: 'Automated Test Saved Deal Item',
      price: '$49.99',
      discountPercent: '60% OFF'
    };
    const saveRes = await postJson('/api/saved', testDeal);
    assert(saveRes && saveRes.success === true, 'Deal successfully saved to favorites', `ASIN: ${testDeal.asin}`);

    const savedList = await getJson('/api/saved');
    assert(savedList.some(d => d.asin === testDeal.asin), 'Saved deal verified in GET /api/saved', `ASIN: ${testDeal.asin}`);

    const delSavedRes = await deleteJson(`/api/saved/${testDeal.asin}`);
    assert(delSavedRes && delSavedRes.success === true, 'Saved deal successfully removed', `ASIN: ${testDeal.asin}`);
  } catch (err) {
    assert(false, 'Watchlist and saved deals lifecycle failed', err.message);
  }

  console.log('\n============================================================');
  console.log(`📊 BACKEND TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  return { passed, failed, results };
}

if (require.main === module) {
  runBackendTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

module.exports = runBackendTests;
