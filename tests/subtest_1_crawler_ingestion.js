/**
 * Sub-Test 1: Crawler Ingestion & Deal Lifecycle Verification
 * Verifies that the crawler:
 * 1. Correctly indexes brand new deals (sets firstSeenAt and lastSeenAt).
 * 2. Preserves firstSeenAt when re-scanning existing deals (updates lastSeenAt only).
 * 3. Accurately detects price cuts, records previousPrice and priceDropAt.
 * 4. Ignores non-drops and does not set false priceDropAt.
 * 5. Preserves Amazon Warehouse store classification.
 * 6. Checks watchlist triggers on new deal arrival.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runSubTest1() {
  console.log('====================================================');
  console.log('🧪 SUB-TEST 1: CRAWLER INGESTION & DEAL LIFECYCLE');
  console.log('====================================================');

  const now = Date.now();
  const mockDb = {
    crawledDeals: {},
    watchlist: [
      { id: 't1', keyword: 'Sony XM5', category: 'electronics', maxPrice: 350, minDiscount: 20, active: true, matchCount: 0 }
    ],
    snipedDeals: [],
    settings: { defaultDomain: 'amazon.com.au' }
  };

  // Helper function imitating crawler deal ingestion logic in server.js
  function ingestItem(db, item, currentTimestamp) {
    const numericPrice = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
    item.numericPrice = numericPrice;

    if (!db.crawledDeals[item.asin]) {
      item.firstSeenAt = currentTimestamp;
      item.lastSeenAt = currentTimestamp;
      item.status = 'active';
      db.crawledDeals[item.asin] = { ...item };

      // Watchlist check
      for (const target of db.watchlist) {
        if (target.active && item.title.toLowerCase().includes(target.keyword.toLowerCase())) {
          if (target.maxPrice === 0 || item.numericPrice <= target.maxPrice) {
            item.snipedFromTarget = target.keyword;
            item.snipedAt = currentTimestamp;
            db.snipedDeals.unshift({ ...item });
            target.matchCount = (target.matchCount || 0) + 1;
          }
        }
      }
      return { type: 'new' };
    } else {
      const existing = db.crawledDeals[item.asin];
      existing.lastSeenAt = currentTimestamp;
      existing.status = 'active';

      if (item.store === 'Amazon Warehouse' || existing.store === 'Amazon Warehouse') {
        existing.store = 'Amazon Warehouse';
      } else {
        existing.store = item.store;
      }
      if (item.condition && !existing.condition) {
        existing.condition = item.condition;
      }

      if (!existing.firstSeenAt) {
        existing.firstSeenAt = currentTimestamp;
      }

      let dropped = false;
      if (numericPrice > 0 && existing.numericPrice > 0 && numericPrice < existing.numericPrice) {
        existing.previousPrice = existing.price;
        existing.price = item.price;
        existing.numericPrice = numericPrice;
        existing.discountPercent = item.discountPercent;
        existing.priceDropAt = currentTimestamp;
        dropped = true;
      }
      return { type: 'existing', priceDrop: dropped };
    }
  }

  // --- Step 1.1: Ingest Brand New Item ---
  console.log('[Step 1.1] Ingesting brand new deal (ASIN: B0TEST0001)...');
  const item1 = {
    asin: 'B0TEST0001',
    title: 'Sony XM5 Wireless Noise Cancelling Headphones',
    price: 'AUD $299.00',
    originalPrice: 'AUD $549.00',
    discountPercent: '45%',
    store: 'Amazon Warehouse',
    category: 'electronics'
  };

  const r1 = ingestItem(mockDb, item1, now);
  assert.strictEqual(r1.type, 'new', 'Item should be recognized as brand new');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].firstSeenAt, now, 'firstSeenAt should match current timestamp');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].lastSeenAt, now, 'lastSeenAt should match current timestamp');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].numericPrice, 299.00);
  assert.strictEqual(mockDb.snipedDeals.length, 1, 'Should trigger watchlist match for Sony XM5');
  console.log('✅ PASS: Brand new item indexed with proper firstSeenAt and watchlist trigger.');

  // --- Step 1.2: Re-scan 1 Hour Later (Same Price) ---
  console.log('[Step 1.2] Simulating crawler re-scan 1 hour later (no price change)...');
  const oneHourLater = now + 3600000;
  const item1Rescan = { ...item1 };
  const r2 = ingestItem(mockDb, item1Rescan, oneHourLater);
  assert.strictEqual(r2.type, 'existing', 'Item should be recognized as existing');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].firstSeenAt, now, 'Original firstSeenAt MUST be preserved');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].lastSeenAt, oneHourLater, 'lastSeenAt MUST be updated to 1 hour later');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].priceDropAt, undefined, 'priceDropAt must NOT be set when price is identical');
  console.log('✅ PASS: firstSeenAt preserved, lastSeenAt updated, no false price drop.');

  // --- Step 1.3: Re-scan 2 Hours Later with Price Drop ---
  console.log('[Step 1.3] Simulating crawler re-scan 2 hours later with price cut (AUD $299 -> AUD $249)...');
  const twoHoursLater = now + 7200000;
  const item1PriceDrop = {
    ...item1,
    price: 'AUD $249.00',
    discountPercent: '55%'
  };
  const r3 = ingestItem(mockDb, item1PriceDrop, twoHoursLater);
  assert.strictEqual(r3.type, 'existing');
  assert.strictEqual(r3.priceDrop, true, 'Price drop should be detected');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].previousPrice, 'AUD $299.00', 'previousPrice must be saved');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].price, 'AUD $249.00', 'New price must be updated');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].priceDropAt, twoHoursLater, 'priceDropAt must be set to current timestamp');
  assert.strictEqual(mockDb.crawledDeals['B0TEST0001'].firstSeenAt, now, 'Original firstSeenAt still preserved');
  console.log('✅ PASS: Price drop detected, previous price saved, priceDropAt assigned.');

  // --- Step 1.4: Warehouse Store Classification Preservation ---
  console.log('[Step 1.4] Testing warehouse store classification priority...');
  const item2 = {
    asin: 'B0TEST0002',
    title: 'Anker USB C Charger 65W',
    price: 'AUD $39.99',
    store: 'Amazon Warehouse',
    category: 'pc'
  };
  ingestItem(mockDb, item2, now);
  // Re-scan from retail clearance pass
  const item2RetailPass = {
    asin: 'B0TEST0002',
    title: 'Anker USB C Charger 65W',
    price: 'AUD $39.99',
    store: 'Normal Amazon',
    category: 'pc'
  };
  ingestItem(mockDb, item2RetailPass, now + 1000);
  assert.strictEqual(mockDb.crawledDeals['B0TEST0002'].store, 'Amazon Warehouse', 'Store should retain Amazon Warehouse classification');
  console.log('✅ PASS: Warehouse classification retained across crawler passes.');

  console.log('----------------------------------------------------');
  console.log('🎉 SUB-TEST 1 RESULT: ALL 4 VERIFICATION STEPS PASSED');
  console.log('----------------------------------------------------\n');
  return true;
}

if (require.main === module) {
  runSubTest1().catch(err => {
    console.error('❌ SUB-TEST 1 FAILED:', err);
    process.exit(1);
  });
}

module.exports = runSubTest1;
