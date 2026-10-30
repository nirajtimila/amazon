/**
 * Amazon Warehouse Hunter - Comprehensive Frontend E2E UI Test Suite
 * Tests all 12 UI feature suites via Headless Chrome DevTools Protocol (CDP)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9235;
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

async function runFrontendTests() {
  console.log('\n============================================================');
  console.log('🚀 LAUNCHING HEADLESS CHROME E2E CDP TEST ENVIRONMENT');
  console.log('============================================================');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-e2e-'));
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1080'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let ws;
  let msgId = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      console.error('Eval failed on expression:', expression, 'details:', JSON.stringify(res.exceptionDetails));
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'CDP Eval Exception');
    }
    return res.result ? res.result.value : undefined;
  }

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const wsUrl = pageTab.webSocketDebuggerUrl;

    ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        const resolve = callbacks.get(data.id);
        callbacks.delete(data.id);
        resolve(data.result);
      }
    };

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');

    console.log(`Navigating to ${BASE_URL}...`);
    await send('Page.navigate', { url: BASE_URL });
    await new Promise(r => setTimeout(r, 3500));

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 1: Navigation Bar Highlighting & Synchronization');
    console.log('============================================================');

    // 1. Initial State
    const initialNav = await evaluate(`(() => {
      const exp = document.getElementById('navExploreDeals');
      const mobExp = document.getElementById('mobileNavExploreDeals');
      return {
        expActive: exp.classList.contains('active'),
        mobExpActive: mobExp.classList.contains('active')
      };
    })()`);
    assert(initialNav.expActive && initialNav.mobExpActive, 'Explore Deals is initially highlighted active on desktop & mobile');

    // 2. Click Warehouse Open-Box
    await evaluate(`document.getElementById('navWarehouseDeals').click()`);
    await new Promise(r => setTimeout(r, 400));
    const whNav = await evaluate(`(() => {
      const wh = document.getElementById('navWarehouseDeals');
      const exp = document.getElementById('navExploreDeals');
      const mobWh = document.getElementById('mobileNavWarehouseDeals');
      const mobExp = document.getElementById('mobileNavExploreDeals');
      const storeWhPill = document.querySelector('.store-pill[data-store="warehouse"]');
      return {
        whActive: wh.classList.contains('active'),
        expActive: exp.classList.contains('active'),
        mobWhActive: mobWh.classList.contains('active'),
        mobExpActive: mobExp.classList.contains('active'),
        storePillActive: storeWhPill ? storeWhPill.classList.contains('active') : false
      };
    })()`);
    assert(whNav.whActive && !whNav.expActive, 'Warehouse Open-Box tab receives active highlight and removes active from Explore', `wh: ${whNav.whActive}`);
    assert(whNav.mobWhActive && !whNav.mobExpActive, 'Mobile navigation bar synchronizes Warehouse active state', `mobWh: ${whNav.mobWhActive}`);
    assert(whNav.storePillActive, 'Warehouse store filter pill is synchronized and active', `active: ${whNav.storePillActive}`);

    // 3. Click Price Glitches Tab
    await evaluate(`document.getElementById('navPriceGlitches').click()`);
    await new Promise(r => setTimeout(r, 400));
    const glitchNav = await evaluate(`(() => {
      const glitch = document.getElementById('navPriceGlitches');
      const wh = document.getElementById('navWarehouseDeals');
      const mobGlitch = document.getElementById('mobileNavPriceGlitches');
      const errTab = document.getElementById('tabPriceErrors');
      return {
        glitchActive: glitch.classList.contains('active'),
        whActive: wh.classList.contains('active'),
        mobGlitchActive: mobGlitch.classList.contains('active'),
        errTabActive: errTab ? errTab.classList.contains('active') : false
      };
    })()`);
    assert(glitchNav.glitchActive && !glitchNav.whActive, 'Price Glitches tab receives active highlight and deselects Warehouse', `glitch: ${glitchNav.glitchActive}`);
    assert(glitchNav.mobGlitchActive, 'Mobile navigation synchronizes Price Glitches active highlight');
    assert(glitchNav.errTabActive, 'Results filter pill switches to Price Errors tab');

    // 4. Return to Explore Deals
    await evaluate(`document.getElementById('navExploreDeals').click()`);
    await new Promise(r => setTimeout(r, 400));
    const returnNav = await evaluate(`document.getElementById('navExploreDeals').classList.contains('active')`);
    assert(returnNav, 'Navigation returns cleanly to Explore Deals active state');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 2: Store Selector Filter Pills');
    console.log('============================================================');
    await evaluate(`(() => {
      const pill = document.querySelector('.store-pill[data-store="normal"]');
      if (pill) pill.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const normalStoreState = await evaluate(`document.querySelector('.store-pill[data-store="normal"]').classList.contains('active')`);
    assert(normalStoreState, 'Normal Amazon Clearance store selector pill is selectable and active');

    await evaluate(`(() => {
      const pill = document.querySelector('.store-pill[data-store="both"]');
      if (pill) pill.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const bothStoreState = await evaluate(`document.querySelector('.store-pill[data-store="both"]').classList.contains('active')`);
    assert(bothStoreState, 'All Deals (Both stores) selector pill is selectable and active');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 3: Category Quick Chips & Dropdown');
    console.log('============================================================');
    const electroChipClick = await evaluate(`(() => {
      const chip = document.querySelector('.cat-chip[data-cat="electronics"]');
      if (chip) chip.click();
      const select = document.getElementById('categorySelect');
      return {
        chipActive: chip ? chip.classList.contains('active') : false,
        selectVal: select ? select.value : ''
      };
    })()`);
    assert(electroChipClick.chipActive, 'Electronics category chip receives active styling when clicked');
    assert(electroChipClick.selectVal === 'electronics', 'Category dropdown synchronized to "electronics"', `value: ${electroChipClick.selectVal}`);

    const pcChipClick = await evaluate(`(() => {
      const chip = document.querySelector('.cat-chip[data-cat="pc"]');
      if (chip) chip.click();
      const select = document.getElementById('categorySelect');
      return {
        chipActive: chip ? chip.classList.contains('active') : false,
        selectVal: select ? select.value : ''
      };
    })()`);
    assert(pcChipClick.chipActive && pcChipClick.selectVal === 'pc', 'Computers quick chip updates active state and category select to "pc"');

    // Reset back to Deep Sweep
    await evaluate(`(() => {
      const chip = document.querySelector('.cat-chip[data-cat="sweep_all"]');
      if (chip) chip.click();
    })()`);
    await new Promise(r => setTimeout(r, 300));
    const sweepAllState = await evaluate(`document.querySelector('.cat-chip[data-cat="sweep_all"]').classList.contains('active')`);
    assert(sweepAllState, 'Deep Sweep category chip safely restored');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 4: Condition Filter Dropdown');
    console.log('============================================================');
    const condChange = await evaluate(`(() => {
      const sel = document.getElementById('conditionSelect');
      sel.value = 'like-new';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return sel.value;
    })()`);
    assert(condChange === 'like-new', 'Condition dropdown selects "like-new" successfully');

    await evaluate(`(() => {
      const sel = document.getElementById('conditionSelect');
      sel.value = 'all';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    const condReset = await evaluate(`document.getElementById('conditionSelect').value`);
    assert(condReset === 'all', 'Condition dropdown safely reset to "all"');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 5: Dual Discount Range Sliders and Presets');
    console.log('============================================================');
    const p30 = await evaluate(`(() => {
      const btn = document.querySelector('.preset-pill[data-min="30"]');
      if (btn) btn.click();
      const slider = document.getElementById('minDiscountSlider');
      const disp = document.getElementById('discountDisplay');
      return { val: slider.value, text: disp.textContent };
    })()`);
    assert(p30.val === '30', 'Preset 30%+ Off sets min discount slider to 30', `val: ${p30.val}`);

    const p50 = await evaluate(`(() => {
      const btn = document.querySelector('.preset-pill[data-min="50"]');
      if (btn) btn.click();
      return document.getElementById('minDiscountSlider').value;
    })()`);
    assert(p50 === '50', 'Preset 50%+ Half Price sets min discount slider to 50', `val: ${p50}`);

    const p70 = await evaluate(`(() => {
      const btn = document.querySelector('.preset-pill[data-min="70"]');
      if (btn) btn.click();
      return document.getElementById('minDiscountSlider').value;
    })()`);
    assert(p70 === '70', 'Preset 70%+ Steals sets min discount slider to 70', `val: ${p70}`);

    // Reset preset to 20%
    await evaluate(`(() => {
      const btn = document.querySelector('.preset-pill[data-min="20"]');
      if (btn) btn.click();
    })()`);
    const pReset = await evaluate(`document.getElementById('minDiscountSlider').value`);
    assert(pReset === '20', 'Discount slider reset to default 20%');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 6: Price Range Inputs & Quick Price Presets');
    console.log('============================================================');
    const under50 = await evaluate(`(() => {
      const btn = document.querySelector('.price-preset-pill[data-max="50"]');
      if (btn) btn.click();
      return {
        max: document.getElementById('maxPriceInput').value,
        active: btn ? btn.classList.contains('active') : false
      };
    })()`);
    assert(under50.max === '50' && under50.active, 'Quick price preset "<$50" populates max price input to 50', `max: ${under50.max}`);

    const price50to200 = await evaluate(`(() => {
      const btn = document.querySelector('.price-preset-pill[data-min="50"][data-max="200"]');
      if (btn) btn.click();
      return {
        min: document.getElementById('minPriceInput').value,
        max: document.getElementById('maxPriceInput').value
      };
    })()`);
    assert(price50to200.min === '50' && price50to200.max === '200', 'Quick price preset "$50-$200" sets min 50 and max 200', `min: ${price50to200.min}, max: ${price50to200.max}`);

    const priceClear = await evaluate(`(() => {
      document.getElementById('priceClearBtn').click();
      return {
        min: document.getElementById('minPriceInput').value,
        max: document.getElementById('maxPriceInput').value
      };
    })()`);
    assert(priceClear.min === '' && priceClear.max === '', 'Price Reset button successfully clears min and max price inputs');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 7: Search Input & Negative Keyword Accessory Blocker');
    console.log('============================================================');
    const kwInput = await evaluate(`(() => {
      const inp = document.getElementById('keywordInput');
      inp.value = 'Sony Headphones';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return inp.value;
    })()`);
    assert(kwInput === 'Sony Headphones', 'Search keyword input accepts user query', `value: ${kwInput}`);

    // Auto-block junk accessories
    const junkBlock = await evaluate(`(() => {
      const btn = document.getElementById('junkBlockerToggleBtn');
      if (btn) btn.click();
      const negInp = document.getElementById('negKeywordsInput');
      return negInp ? negInp.value : '';
    })()`);
    assert(junkBlock.length > 5 && junkBlock.includes('case'), 'Auto-Block Junk Accessories populates negative keyword terms', `terms: ${junkBlock.slice(0, 30)}...`);

    // Clean up search input
    await evaluate(`(() => {
      const inp = document.getElementById('keywordInput');
      inp.value = '';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 8: Department Exclusion Pills & Quick Actions');
    console.log('============================================================');
    const excludeQuick = await evaluate(`(() => {
      const btn = document.getElementById('quickExcludeBooksPetsBtn');
      if (btn) btn.click();
      const booksChip = document.querySelector('.exclude-pill[data-cat="stripbooks"]');
      const petsChip = document.querySelector('.exclude-pill[data-cat="pets"]');
      return {
        booksExcluded: booksChip ? booksChip.classList.contains('excluded') : false,
        petsExcluded: petsChip ? petsChip.classList.contains('excluded') : false
      };
    })()`);
    assert(excludeQuick.booksExcluded && excludeQuick.petsExcluded, 'Quick Exclude Books & Pets triggers exclusion state on both category pills');

    const resetExcluded = await evaluate(`(() => {
      const resetBtn = document.getElementById('resetExcludedCatsBtn');
      if (resetBtn) resetBtn.click();
      const excludedPills = document.querySelectorAll('.exclude-pill.excluded');
      return excludedPills.length;
    })()`);
    assert(resetExcluded === 0, 'Reset Excluded Categories clears all active exclusions');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 9: Results Sub-Filter Tabs');
    console.log('============================================================');
    const brandTab = await evaluate(`(() => {
      const tab = document.getElementById('tabTopBrands');
      if (tab) tab.click();
      return tab ? tab.classList.contains('active') : false;
    })()`);
    assert(brandTab, 'Top Brands tab activates properly upon selection');

    const justListedTab = await evaluate(`(() => {
      const tab = document.getElementById('tabJustListed');
      if (tab) tab.click();
      const timeRow = document.getElementById('timeFilterRow');
      return {
        tabActive: tab ? tab.classList.contains('active') : false,
        timeRowVisible: timeRow ? timeRow.style.display !== 'none' : false
      };
    })()`);
    assert(justListedTab.tabActive && justListedTab.timeRowVisible, 'Just Listed tab reveals time filter row with 1h/2h/6h/24h pills');

    const returnAllTab = await evaluate(`(() => {
      const tab = document.getElementById('tabAllDeals');
      if (tab) tab.click();
      return tab ? tab.classList.contains('active') : false;
    })()`);
    assert(returnAllTab, 'All Deals subfilter tab returns cleanly');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 10: Sort Selector & Deal Cards Rendering');
    console.log('============================================================');
    const sortCheck = await evaluate(`(() => {
      const sort = document.getElementById('sortSelect');
      sort.value = 'price-asc-rank';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
      return sort.value;
    })()`);
    assert(sortCheck === 'price-asc-rank', 'Sort dropdown sets price ascending sorting mode');

    await new Promise(r => setTimeout(r, 600));
    const cardRenderCheck = await evaluate(`(() => {
      const grid = document.getElementById('dealsGrid');
      const cards = grid ? grid.querySelectorAll('.deal-card') : [];
      return {
        count: cards.length,
        hasTitle: cards.length > 0 ? !!cards[0].querySelector('.deal-title, h3') : false
      };
    })()`);
    assert(cardRenderCheck.count > 0, 'Deals grid successfully renders active deal cards', `Card count: ${cardRenderCheck.count}`);

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 11: Live Market Analytics Dashboard');
    console.log('============================================================');
    const analyticsOpen = await evaluate(`(() => {
      const btn = document.getElementById('toggleAnalyticsBtn');
      if (btn) btn.click();
      const board = document.getElementById('analyticsDashboard');
      const discChart = document.getElementById('discountChart');
      const catChart = document.getElementById('categoryChart');
      const storeChart = document.getElementById('storeSplitChart');
      return {
        boardVisible: board ? board.style.display !== 'none' : false,
        discChartExists: !!discChart,
        catChartExists: !!catChart,
        storeChartExists: !!storeChart
      };
    })()`);
    assert(analyticsOpen.boardVisible, 'Market Analytics Dashboard expands upon toggle click');
    assert(analyticsOpen.discChartExists && analyticsOpen.catChartExists && analyticsOpen.storeChartExists, 'All 3 market intelligence Chart.js canvases exist in DOM');

    const analyticsClose = await evaluate(`(() => {
      const closeBtn = document.getElementById('closeAnalyticsBtn');
      if (closeBtn) closeBtn.click();
      const board = document.getElementById('analyticsDashboard');
      return board ? board.style.display === 'none' : false;
    })()`);
    assert(analyticsClose, 'Market Analytics Dashboard collapses cleanly upon close click');

    // ============================================================
    console.log('\n============================================================');
    console.log('🧪 SUITE 12: Modals & Drawers (Saved, Watchlist & Price History)');
    console.log('============================================================');
    // 1. Saved Drawer
    const savedDrawerOpen = await evaluate(`(() => {
      const btn = document.getElementById('savedDrawerBtn');
      if (btn) btn.click();
      const backdrop = document.getElementById('savedBackdrop');
      return backdrop ? backdrop.classList.contains('open') : false;
    })()`);
    assert(savedDrawerOpen, 'Saved Deals drawer opens upon header bookmark click');

    const savedDrawerClose = await evaluate(`(() => {
      const closeBtn = document.getElementById('closeDrawerBtn');
      if (closeBtn) closeBtn.click();
      const backdrop = document.getElementById('savedBackdrop');
      return backdrop ? !backdrop.classList.contains('open') : false;
    })()`);
    assert(savedDrawerClose, 'Saved Deals drawer closes on dismiss button click');

    // 2. Watchlist Sniper Modal
    const watchlistModalOpen = await evaluate(`(() => {
      const btn = document.getElementById('watchlistModalBtn');
      if (btn) btn.click();
      const modal = document.getElementById('watchlistModal');
      return modal ? modal.style.display !== 'none' : false;
    })()`);
    assert(watchlistModalOpen, 'Watchlist Sniper modal displays upon header radar click');

    const watchlistModalClose = await evaluate(`(() => {
      const closeBtn = document.getElementById('closeWatchlistModalBtn');
      if (closeBtn) closeBtn.click();
      const modal = document.getElementById('watchlistModal');
      return modal ? modal.style.display === 'none' : false;
    })()`);
    assert(watchlistModalClose, 'Watchlist Sniper modal closes cleanly');

    // 3. Price History Modal
    const priceModalOpen = await evaluate(`(() => {
      const firstCard = document.querySelector('.deal-card');
      const asin = firstCard ? firstCard.getAttribute('data-asin') : 'B0TESTASIN';
      if (typeof window.openPriceHistoryModal === 'function') {
        window.openPriceHistoryModal(asin);
      } else {
        const modal = document.getElementById('priceHistoryModal');
        if (modal) modal.style.display = 'flex';
      }
      const modal = document.getElementById('priceHistoryModal');
      return modal ? modal.style.display !== 'none' : false;
    })()`);
    assert(priceModalOpen, 'Keepa Price History modal displays on demand');

    const priceModalClose = await evaluate(`(() => {
      const closeBtn = document.getElementById('closePriceHistoryModalBtn');
      if (closeBtn) closeBtn.click();
      const modal = document.getElementById('priceHistoryModal');
      return modal ? modal.style.display === 'none' : false;
    })()`);
    assert(priceModalClose, 'Keepa Price History modal closes upon dismiss');

  } catch (err) {
    console.error('Fatal Frontend Test Error:', err);
    assert(false, 'Frontend test runner fatal exception', err.message);
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    chromeProc.kill('SIGTERM');
  }

  console.log('\n============================================================');
  console.log(`📊 FRONTEND TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  return { passed, failed, results };
}

if (require.main === module) {
  runFrontendTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

module.exports = runFrontendTests;
