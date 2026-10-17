// Amazon Warehouse Deal Hunter - Frontend Application
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const keywordInput = document.getElementById('keywordInput');
  const categorySelect = document.getElementById('categorySelect');
  const domainSelect = document.getElementById('domainSelect');
  const currencySelect = document.getElementById('currencySelect');
  const sortSelect = document.getElementById('sortSelect');
  const pagesSelect = document.getElementById('pagesSelect');
  const inStockOnly = document.getElementById('inStockOnly');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const minDiscountSlider = document.getElementById('minDiscountSlider');
  const maxDiscountSlider = document.getElementById('maxDiscountSlider');
  const discountDisplay = document.getElementById('discountDisplay');
  const presetPills = document.querySelectorAll('.preset-pill');
  const searchBtn = document.getElementById('searchBtn');
  const openDirectBtn = document.getElementById('openDirectBtn');
  const targetUrlText = document.getElementById('targetUrlText');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const dealsGrid = document.getElementById('dealsGrid');
  const resultsMeta = document.getElementById('resultsMeta');
  const resultsCount = document.getElementById('resultsCount');
  const filterSummaryBadge = document.getElementById('filterSummaryBadge');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const savedDrawerBtn = document.getElementById('savedDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const savedBackdrop = document.getElementById('savedBackdrop');
  const savedList = document.getElementById('savedList');
  const savedCount = document.getElementById('savedCount');
  const clearSavedBtn = document.getElementById('clearSavedBtn');
  const serverStatus = document.getElementById('serverStatus');
  const serverStatusText = document.getElementById('serverStatusText');
  const toast = document.getElementById('toast');
  const storePills = document.querySelectorAll('.store-pill');
  const autoRefreshSelect = document.getElementById('autoRefreshSelect');
  const scanBanner = document.getElementById('scanBanner');
  const scanBannerText = document.getElementById('scanBannerText');
  const stopScanBtn = document.getElementById('stopScanBtn');
  const tabAllDeals = document.getElementById('tabAllDeals');
  const tabJustListed = document.getElementById('tabJustListed');
  const tabSnipedDeals = document.getElementById('tabSnipedDeals');
  const countAllDeals = document.getElementById('countAllDeals');
  const countJustListed = document.getElementById('countJustListed');
  const countSnipedDeals = document.getElementById('countSnipedDeals');

  // New Filters
  const minPriceInput = document.getElementById('minPriceInput');
  const maxPriceInput = document.getElementById('maxPriceInput');
  const pricePresetPills = document.querySelectorAll('.price-preset-pill');
  const conditionSelect = document.getElementById('conditionSelect');
  const negKeywordsInput = document.getElementById('negKeywordsInput');
  const junkBlockerToggleBtn = document.getElementById('junkBlockerToggleBtn');
  const priceCurrencySymbol = document.getElementById('priceCurrencySymbol');
  const minCurrencyTag = document.getElementById('minCurrencyTag');
  const maxCurrencyTag = document.getElementById('maxCurrencyTag');
  const priceClearBtn = document.getElementById('priceClearBtn');

  // Watchlist & Sniper Elements
  const watchlistModalBtn = document.getElementById('watchlistModalBtn');
  const closeWatchlistModalBtn = document.getElementById('closeWatchlistModalBtn');
  const watchlistModal = document.getElementById('watchlistModal');
  const watchKeywordInput = document.getElementById('watchKeywordInput');
  const watchCategorySelect = document.getElementById('watchCategorySelect');
  const watchMaxPriceInput = document.getElementById('watchMaxPriceInput');
  const watchMinDiscountInput = document.getElementById('watchMinDiscountInput');
  const addWatchTargetBtn = document.getElementById('addWatchTargetBtn');
  const runSniperScanBtn = document.getElementById('runSniperScanBtn');
  const watchlistItemsContainer = document.getElementById('watchlistItemsContainer');
  const watchTargetCount = document.getElementById('watchTargetCount');
  const watchlistCountBadge = document.getElementById('watchlistCountBadge');

  // Currency Exchange Rates (Base USD = 1.0) with automatic online update & reliable offline fallback
  const EXCHANGE_RATES = {
    USD: 1.0,
    AUD: 1.54,
    JPY: 152.0,
    GBP: 0.77,
    EUR: 0.92,
    CAD: 1.38
  };

  const CURRENCY_SYMBOLS = {
    AUD: '$',
    USD: '$',
    JPY: '¥',
    GBP: '£',
    EUR: '€',
    CAD: '$'
  };

  async function fetchLiveExchangeRates() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          if (data.rates.AUD) EXCHANGE_RATES.AUD = data.rates.AUD;
          if (data.rates.JPY) EXCHANGE_RATES.JPY = data.rates.JPY;
          if (data.rates.GBP) EXCHANGE_RATES.GBP = data.rates.GBP;
          if (data.rates.EUR) EXCHANGE_RATES.EUR = data.rates.EUR;
          if (data.rates.CAD) EXCHANGE_RATES.CAD = data.rates.CAD;
          if (deals && deals.length > 0) renderDeals(deals);
        }
      }
    } catch (e) {
      // Keeps accurate built-in rates
    }
  }

  function getStoreCurrency(domain) {
    if (!domain) return 'AUD';
    if (domain.includes('amazon.com.au')) return 'AUD';
    if (domain.includes('amazon.co.jp')) return 'JPY';
    if (domain.includes('amazon.co.uk')) return 'GBP';
    if (domain.includes('amazon.de')) return 'EUR';
    if (domain.includes('amazon.ca')) return 'CAD';
    return 'USD';
  }

  function formatPriceWithCurrency(priceStr, storeDomain, targetCurrency) {
    if (!priceStr || priceStr === 'See Options' || priceStr.toLowerCase().includes('unavailable')) {
      return { display: priceStr || 'See Options', original: '', numVal: null };
    }

    const cleanStr = priceStr.replace(/&nbsp;/gi, ' ').trim();
    const storeCurr = getStoreCurrency(storeDomain || (domainSelect ? domainSelect.value : 'amazon.com.au'));

    // Extract numeric amount
    let numericVal = 0;
    if (storeCurr === 'EUR' && cleanStr.includes(',')) {
      const euroClean = cleanStr.replace(/[^\d,]/g, '').replace(',', '.');
      numericVal = parseFloat(euroClean);
    } else {
      const stdClean = cleanStr.replace(/[^\d.]/g, '');
      numericVal = parseFloat(stdClean);
    }

    if (isNaN(numericVal) || numericVal <= 0) {
      return { display: cleanStr, original: '', numVal: null };
    }

    if (!targetCurrency || targetCurrency === 'ORIGINAL' || storeCurr === targetCurrency) {
      return { display: cleanStr, original: '', numVal: numericVal };
    }

    // Convert currency
    const rateFrom = EXCHANGE_RATES[storeCurr] || 1.0;
    const rateTo = EXCHANGE_RATES[targetCurrency] || 1.0;
    const convertedVal = (numericVal / rateFrom) * rateTo;

    const symbol = CURRENCY_SYMBOLS[targetCurrency] || '$';
    const decimals = (targetCurrency === 'JPY') ? 0 : 2;
    const formattedNum = convertedVal.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return {
      display: `${symbol}${formattedNum} ${targetCurrency}`,
      original: `(${cleanStr} ${storeCurr})`,
      numVal: convertedVal
    };
  }

  // Verification Links (CamelCamelCamel, Keepa, OzBargain)
  function getCamelUrl(asin, domain) {
    let sub = '';
    const d = domain || (domainSelect ? domainSelect.value : 'amazon.com.au');
    if (d.includes('amazon.com.au')) sub = 'au.';
    else if (d.includes('amazon.co.uk')) sub = 'uk.';
    else if (d.includes('amazon.co.jp')) sub = 'jp.';
    else if (d.includes('amazon.ca')) sub = 'ca.';
    else if (d.includes('amazon.de')) sub = 'de.';
    return `https://${sub}camelcamelcamel.com/product/${asin}`;
  }

  function getKeepaUrl(asin, domain) {
    let domainId = 1;
    const d = domain || (domainSelect ? domainSelect.value : 'amazon.com.au');
    if (d.includes('amazon.co.uk')) domainId = 2;
    else if (d.includes('amazon.de')) domainId = 3;
    else if (d.includes('amazon.co.jp')) domainId = 5;
    else if (d.includes('amazon.ca')) domainId = 6;
    else if (d.includes('amazon.com.au')) domainId = 9;
    return `https://keepa.com/#!product/${domainId}-${asin}`;
  }

  function getOzBargainUrl(title) {
    if (!title) return 'https://www.ozbargain.com.au';
    const clean = title.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 4).join(' ');
    return `https://www.ozbargain.com.au/search/node/${encodeURIComponent(clean)}?s=t`;
  }

  // HTML5 Web Audio Notification Chime (Zero external files needed)
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2); // D6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  // Category keyword mapping for Warehouse search
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

  // Deal History Registry & Just Listed Tracking
  const HISTORY_KEY = 'wh_deal_history_registry';
  let dealHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  let activeFilterTab = 'all'; // 'all' or 'just_listed'
  let stopRequested = false;
  let autoRefreshTimer = null;

  function tagNewDealStatus(item) {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (!dealHistory[item.asin]) {
      dealHistory[item.asin] = now;
      item.isJustListed = true;
    } else {
      const age = now - dealHistory[item.asin];
      item.isJustListed = (age < TWENTY_FOUR_HOURS);
    }
  }

  function cleanHistory() {
    const now = Date.now();
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    let modified = false;
    for (const asin in dealHistory) {
      if (now - dealHistory[asin] > FOURTEEN_DAYS) {
        delete dealHistory[asin];
        modified = true;
      }
    }
    if (modified) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(dealHistory));
    }
  }
  cleanHistory();

  // State
  let storeType = 'warehouse'; // 'warehouse', 'normal', or 'both'
  let deals = [];
  let savedDeals = JSON.parse(localStorage.getItem('saved_warehouse_deals') || '[]');
  let isBackendOnline = false;
  let currentPage = 1;
  let isLoading = false;

  // Initialize
  updateSavedCount();
  fetchLiveExchangeRates();
  checkBackendHealth().then(() => {
    executeSearch();
  });
  updateTargetUrl();

  // Filter Tabs (All Deals vs Just Listed vs Sniped Deals)
  if (tabAllDeals) {
    tabAllDeals.addEventListener('click', () => {
      activeFilterTab = 'all';
      tabAllDeals.classList.add('active');
      if (tabJustListed) tabJustListed.classList.remove('active');
      if (tabSnipedDeals) tabSnipedDeals.classList.remove('active');
      renderDeals(deals);
    });
  }

  if (tabJustListed) {
    tabJustListed.addEventListener('click', () => {
      activeFilterTab = 'just_listed';
      tabJustListed.classList.add('active');
      if (tabAllDeals) tabAllDeals.classList.remove('active');
      if (tabSnipedDeals) tabSnipedDeals.classList.remove('active');
      renderDeals(deals);
    });
  }

  if (tabSnipedDeals) {
    tabSnipedDeals.addEventListener('click', () => {
      activeFilterTab = 'sniped';
      tabSnipedDeals.classList.add('active');
      if (tabAllDeals) tabAllDeals.classList.remove('active');
      if (tabJustListed) tabJustListed.classList.remove('active');
      renderDeals(snipedDeals);
    });
  }

  // Persistent Watchlist & Sniping System
  const WATCHLIST_KEY = 'wh_sniper_watchlist';
  const defaultWatchlist = [
    { id: 'w1', keyword: 'Sony WH-1000XM', category: 'electronics', maxPrice: 280, minDiscount: 35, active: true },
    { id: 'w2', keyword: 'RTX 4070', category: 'pc', maxPrice: 850, minDiscount: 25, active: true },
    { id: 'w3', keyword: 'Breville Barista', category: 'kitchen', maxPrice: 600, minDiscount: 30, active: true }
  ];
  let watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || JSON.stringify(defaultWatchlist));
  let snipedDeals = [];

  function saveWatchlist() {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    updateWatchlistUI();
  }

  // Sync Watchlist and Saved Deals with Server Database
  async function syncInitialData() {
    try {
      const [wRes, sRes, snipedRes] = await Promise.allSettled([
        fetch('/api/watchlist'),
        fetch('/api/saved'),
        fetch('/api/sniped')
      ]);
      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        const wData = await wRes.value.json();
        if (Array.isArray(wData) && wData.length > 0) {
          watchlist = wData;
          saveWatchlist();
        }
      }
      if (sRes.status === 'fulfilled' && sRes.value.ok) {
        const sData = await sRes.value.json();
        if (Array.isArray(sData) && sData.length > 0) {
          savedDeals = sData;
          updateSavedCount();
          renderSavedList();
        }
      }
      if (snipedRes.status === 'fulfilled' && snipedRes.value.ok) {
        const snipedData = await snipedRes.value.json();
        if (Array.isArray(snipedData) && snipedData.length > 0) {
          snipedDeals = snipedData;
          if (countSnipedDeals) countSnipedDeals.textContent = `(${snipedDeals.length})`;
          if (tabSnipedDeals) tabSnipedDeals.style.display = 'flex';
        }
      }
    } catch (e) {}
  }
  syncInitialData();

  function updateWatchlistUI() {
    const activeCount = watchlist.filter(w => w.active).length;
    if (watchlistCountBadge) watchlistCountBadge.textContent = activeCount;
    if (watchTargetCount) watchTargetCount.textContent = watchlist.length;
    if (!watchlistItemsContainer) return;

    if (watchlist.length === 0) {
      watchlistItemsContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No watchlist targets saved yet. Add one above!</div>';
      return;
    }

    watchlistItemsContainer.innerHTML = watchlist.map(item => `
      <div class="watchlist-item-card" data-id="${item.id}">
        <div class="watchlist-info">
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" class="watch-toggle-checkbox" data-id="${item.id}" ${item.active ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--accent-emerald);">
            <span class="watchlist-kw" style="${!item.active ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(item.keyword)}</span>
          </div>
          <div class="watchlist-details">
            <span>📁 ${escapeHtml(item.category)}</span>
            <span>💰 Max: $${item.maxPrice ? item.maxPrice : 'Any'}</span>
            <span>🏷️ Min: ${item.minDiscount}% OFF</span>
          </div>
        </div>
        <div class="watchlist-actions">
          <button class="btn btn-sm btn-primary watch-snipe-btn" data-id="${item.id}" title="Run search for this item immediately">
            🎯 Snipe
          </button>
          <button class="btn-icon watch-delete-btn" data-id="${item.id}" title="Delete target" style="color: #ef4444; font-size: 1.1rem;">
            ✕
          </button>
        </div>
      </div>
    `).join('');

    watchlistItemsContainer.querySelectorAll('.watch-toggle-checkbox').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const target = watchlist.find(w => w.id === id);
        if (target) {
          target.active = e.target.checked;
          saveWatchlist();
          try {
            await fetch(`/api/watchlist/${id}/toggle`, { method: 'PUT' });
          } catch (err) {}
        }
      });
    });

    watchlistItemsContainer.querySelectorAll('.watch-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        watchlist = watchlist.filter(w => w.id !== id);
        saveWatchlist();
        try {
          await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
        } catch (err) {}
        showToast('Target removed from watchlist');
      });
    });

    watchlistItemsContainer.querySelectorAll('.watch-snipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const target = watchlist.find(w => w.id === id);
        if (target) {
          closeWatchlistModal();
          keywordInput.value = target.keyword;
          categorySelect.value = target.category;
          minDiscountSlider.value = target.minDiscount || 30;
          syncDiscountUI();
          if (target.maxPrice && maxPriceInput) maxPriceInput.value = target.maxPrice;
          updateTargetUrl();
          executeSearch(false);
        }
      });
    });
  }

  function openWatchlistModal() {
    if (watchlistModal) watchlistModal.style.display = 'flex';
    updateWatchlistUI();
  }

  function closeWatchlistModal() {
    if (watchlistModal) watchlistModal.style.display = 'none';
  }

  if (watchlistModalBtn) watchlistModalBtn.addEventListener('click', openWatchlistModal);
  if (closeWatchlistModalBtn) closeWatchlistModalBtn.addEventListener('click', closeWatchlistModal);
  if (watchlistModal) {
    watchlistModal.addEventListener('click', (e) => {
      if (e.target === watchlistModal) closeWatchlistModal();
    });
  }

  if (addWatchTargetBtn) {
    addWatchTargetBtn.addEventListener('click', async () => {
      const kw = watchKeywordInput.value.trim();
      if (!kw) {
        showToast('Please enter a target keyword');
        return;
      }
      const cat = watchCategorySelect.value || 'all';
      const maxP = parseFloat(watchMaxPriceInput.value) || 0;
      const minD = parseInt(watchMinDiscountInput.value) || 30;
      const newTarget = {
        id: 'w_' + Date.now(),
        keyword: kw,
        category: cat,
        maxPrice: maxP,
        minDiscount: minD,
        active: true
      };
      watchlist.unshift(newTarget);
      saveWatchlist();
      try {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTarget)
        });
      } catch (err) {}
      watchKeywordInput.value = '';
      watchMaxPriceInput.value = '';
      showToast(`Added "${kw}" to Watchlist!`);
    });
  }

  if (runSniperScanBtn) {
    runSniperScanBtn.addEventListener('click', runWatchlistSniper);
  }

  async function runWatchlistSniper() {
    const activeTargets = watchlist.filter(w => w.active);
    if (activeTargets.length === 0) {
      showToast('No active watchlist targets. Enable or add targets first!');
      return;
    }

    closeWatchlistModal();
    if (scanBanner) {
      scanBanner.style.display = 'flex';
      scanBannerText.textContent = `🎯 Sniper scanning ${activeTargets.length} active watchlist targets...`;
    }

    snipedDeals = [];
    showToast(`🎯 Running Watchlist Sniper for ${activeTargets.length} target(s)...`);

    const domain = domainSelect ? domainSelect.value : 'amazon.com.au';
    const onlyInStock = inStockOnly ? inStockOnly.checked : true;

    for (let i = 0; i < activeTargets.length; i++) {
      const target = activeTargets[i];
      if (scanBannerText) {
        scanBannerText.textContent = `🎯 Sniper scanning target ${i + 1}/${activeTargets.length}: "${target.keyword}"...`;
      }

      try {
        const apiUrl = `/api/search?storeType=both&keyword=${encodeURIComponent(target.keyword)}&category=${encodeURIComponent(target.category)}&minDiscount=${target.minDiscount || 25}&maxDiscount=90&domain=${encodeURIComponent(domain)}&sort=price-asc-rank&page=1&maxPages=1&availableOnly=${onlyInStock}&maxPrice=${target.maxPrice || 0}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          const items = data.products || [];
          for (const item of items) {
            item.snipedFromTarget = target.keyword;
            tagNewDealStatus(item);
            if (!snipedDeals.some(d => d.asin === item.asin)) {
              snipedDeals.push(item);
            }
          }
        }
      } catch (e) {
        console.warn('Sniper error on target:', target.keyword, e);
      }
    }

    if (scanBanner) scanBanner.style.display = 'none';
    if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;

    if (snipedDeals.length > 0) {
      playNotificationChime();
      showToast(`🎯 SNIPER SUCCESS! Found ${snipedDeals.length} match(es) for your watchlist!`);
      if (tabSnipedDeals) tabSnipedDeals.click();
    } else {
      showToast('🎯 Sniper scan complete. No items currently match your target price/discount thresholds.');
    }
  }

  updateWatchlistUI();

  // Currency Symbol Sync for UI
  function syncCurrencyUI() {
    const curr = currencySelect ? currencySelect.value : 'AUD';
    let sym = '$';
    if (curr === 'ORIGINAL') {
      const d = domainSelect ? domainSelect.value : 'amazon.com.au';
      if (d.includes('.co.jp')) sym = '¥';
      else if (d.includes('.co.uk')) sym = '£';
      else if (d.includes('.de')) sym = '€';
      else if (d.includes('.ca')) sym = 'C$';
      else if (d.includes('.com.au')) sym = 'A$';
      else sym = '$';
    } else {
      switch (curr) {
        case 'AUD': sym = 'A$'; break;
        case 'USD': sym = '$'; break;
        case 'JPY': sym = '¥'; break;
        case 'GBP': sym = '£'; break;
        case 'EUR': sym = '€'; break;
        case 'CAD': sym = 'C$'; break;
        default: sym = '$'; break;
      }
    }
    if (priceCurrencySymbol) {
      priceCurrencySymbol.textContent = `${curr} (${sym})`;
    }
    if (minCurrencyTag) minCurrencyTag.textContent = sym;
    if (maxCurrencyTag) maxCurrencyTag.textContent = sym;
  }
  syncCurrencyUI();

  // Junk Blocker Toggle
  const DEFAULT_JUNK_TERMS = 'case, cover, strap, cable, protector, replacement, holder, screen protector, battery, pouch';
  if (junkBlockerToggleBtn) {
    junkBlockerToggleBtn.addEventListener('click', () => {
      if (!negKeywordsInput.value || negKeywordsInput.value.trim() === '') {
        negKeywordsInput.value = DEFAULT_JUNK_TERMS;
        junkBlockerToggleBtn.classList.add('active');
        junkBlockerToggleBtn.textContent = '✓ Junk Accessories Blocked';
        showToast('Auto-blocked accessory terms (cases, straps, covers, cables)');
      } else {
        negKeywordsInput.value = '';
        junkBlockerToggleBtn.classList.remove('active');
        junkBlockerToggleBtn.textContent = '+ Auto-Block Junk Accessories';
        showToast('Cleared excluded keywords');
      }
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      executeSearch(false);
    });
  }

  function syncPricePresetsFromInputs() {
    const minVal = minPriceInput ? minPriceInput.value.trim() : '';
    const maxVal = maxPriceInput ? maxPriceInput.value.trim() : '';
    let matched = false;
    pricePresetPills.forEach(p => {
      const pMin = p.getAttribute('data-min') === '0' ? '' : p.getAttribute('data-min');
      const pMax = p.getAttribute('data-max') === '0' ? '' : p.getAttribute('data-max');
      if (minVal === pMin && maxVal === pMax) {
        p.classList.add('active');
        matched = true;
      } else {
        p.classList.remove('active');
      }
    });
    if (!matched && !minVal && !maxVal) {
      pricePresetPills.forEach(p => {
        if (p.getAttribute('data-min') === '0' && p.getAttribute('data-max') === '0') {
          p.classList.add('active');
        }
      });
    }
  }

  // Price Preset Pills
  pricePresetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      pricePresetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const min = pill.getAttribute('data-min');
      const max = pill.getAttribute('data-max');
      if (minPriceInput) minPriceInput.value = (min && min !== '0') ? min : '';
      if (maxPriceInput) maxPriceInput.value = (max && max !== '0') ? max : '';
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      executeSearch(false);
    });
  });

  // Price Clear Button
  if (priceClearBtn) {
    priceClearBtn.addEventListener('click', () => {
      if (minPriceInput) minPriceInput.value = '';
      if (maxPriceInput) maxPriceInput.value = '';
      syncPricePresetsFromInputs();
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      executeSearch(false);
      showToast('Cleared price filter');
    });
  }

  // Price Inputs & Condition Event Listeners
  if (minPriceInput) {
    minPriceInput.addEventListener('input', () => {
      syncPricePresetsFromInputs();
      updateTargetUrl();
    });
    minPriceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { currentPage = 1; deals = []; executeSearch(false); }
    });
  }
  if (maxPriceInput) {
    maxPriceInput.addEventListener('input', () => {
      syncPricePresetsFromInputs();
      updateTargetUrl();
    });
    maxPriceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { currentPage = 1; deals = []; executeSearch(false); }
    });
  }
  if (conditionSelect) {
    conditionSelect.addEventListener('change', () => {
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      executeSearch(false);
    });
  }
  if (negKeywordsInput) {
    negKeywordsInput.addEventListener('input', () => {
      if (junkBlockerToggleBtn) {
        if (negKeywordsInput.value.trim() === DEFAULT_JUNK_TERMS.trim()) {
          junkBlockerToggleBtn.classList.add('active');
          junkBlockerToggleBtn.textContent = '✓ Junk Accessories Blocked';
        } else if (!negKeywordsInput.value.trim()) {
          junkBlockerToggleBtn.classList.remove('active');
          junkBlockerToggleBtn.textContent = '+ Auto-Block Junk Accessories';
        }
      }
      updateTargetUrl();
    });
    negKeywordsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { currentPage = 1; deals = []; executeSearch(false); }
    });
  }



  // Store selector pills
  storePills.forEach(pill => {
    pill.addEventListener('click', () => {
      storePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      storeType = pill.getAttribute('data-store') || 'warehouse';
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      executeSearch(false);
    });
  });

  // Keyword chip buttons in empty state
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('keyword-chip')) {
      const q = e.target.getAttribute('data-q');
      keywordInput.value = q;
      updateTargetUrl();
      executeSearch();
    }
  });

  // Event Listeners for Filters
  keywordInput.addEventListener('input', updateTargetUrl);
  categorySelect.addEventListener('change', () => {
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    executeSearch(false);
  });
  domainSelect.addEventListener('change', () => {
    syncCurrencyUI();
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    executeSearch(false);
  });
  sortSelect.addEventListener('change', () => {
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    executeSearch(false);
  });
  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      syncCurrencyUI();
      if (deals && deals.length > 0) renderDeals(deals);
      if (savedDeals && savedDeals.length > 0) renderSavedList();
      showToast(`Display currency changed to ${currencySelect.value}`);
    });
  }
  if (pagesSelect) pagesSelect.addEventListener('change', () => {
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    executeSearch(false);
  });
  if (inStockOnly) inStockOnly.addEventListener('change', () => {
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    executeSearch(false);
  });

  // Sliders
  minDiscountSlider.addEventListener('input', () => {
    let minVal = parseInt(minDiscountSlider.value);
    let maxVal = parseInt(maxDiscountSlider.value);
    if (minVal > maxVal) {
      maxDiscountSlider.value = minVal;
    }
    syncDiscountUI();
    updateTargetUrl();
  });

  maxDiscountSlider.addEventListener('input', () => {
    let minVal = parseInt(minDiscountSlider.value);
    let maxVal = parseInt(maxDiscountSlider.value);
    if (maxVal < minVal) {
      minDiscountSlider.value = maxVal;
    }
    syncDiscountUI();
    updateTargetUrl();
  });

  // Preset Pills
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const min = pill.getAttribute('data-min');
      const max = pill.getAttribute('data-max');
      minDiscountSlider.value = min;
      maxDiscountSlider.value = max;
      syncDiscountUI();
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      executeSearch(false);
    });
  });

  function syncDiscountUI() {
    const min = minDiscountSlider.value;
    const max = maxDiscountSlider.value;
    discountDisplay.textContent = `${min}% – ${max}%`;

    // Match preset if applicable
    presetPills.forEach(p => {
      if (p.getAttribute('data-min') === min && p.getAttribute('data-max') === max) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  function getAvailabilityRefinement(domain) {
    if (domain.includes('amazon.com.au')) return '4910513051';
    if (domain.includes('amazon.co.jp')) return '2227307051';
    if (domain.includes('amazon.co.uk')) return '419162031';
    if (domain.includes('amazon.ca')) return '12035748011';
    if (domain.includes('amazon.de')) return '419116031';
    return '2661600011'; // amazon.com (US default)
  }

  // Build Target Amazon URL
  function buildAmazonUrl(overrideStore) {
    const activeStore = overrideStore || storeType;
    const domain = domainSelect.value || 'amazon.com.au';
    const rawCategory = categorySelect.value || 'all';
    const category = (rawCategory === 'sweep_all') ? 'all' : rawCategory;
    const min = minDiscountSlider.value;
    const max = maxDiscountSlider.value;
    const keyword = keywordInput.value.trim();
    const sort = sortSelect.value;
    const onlyInStock = inStockOnly ? inStockOnly.checked : true;
    const minP = minPriceInput ? (parseFloat(minPriceInput.value) || 0) : 0;
    const maxP = maxPriceInput ? (parseFloat(maxPriceInput.value) || 0) : 0;
    const cond = conditionSelect ? conditionSelect.value : 'all';
    const negKw = negKeywordsInput ? negKeywordsInput.value.trim() : '';

    let condTerm = '';
    if (cond === 'like-new') condTerm = 'like new';
    else if (cond === 'very-good') condTerm = 'very good';
    else if (cond === 'good') condTerm = 'good';
    else if (cond === 'acceptable') condTerm = 'acceptable';

    let negTermsStr = '';
    if (negKw) {
      negTermsStr = negKw.split(/[,;]/).map(t => t.trim().replace(/^-/, '')).filter(Boolean).map(t => `-${t}`).join(' ');
    }

    let url = '';

    if (activeStore === 'normal') {
      const iParam = (category === 'all' || category === 'warehouse-deals') ? 'aps' : category;
      url = `https://www.${domain}/s?i=${encodeURIComponent(iParam)}&pct-off=${min}-${max}`;
      let combinedK = keyword || '';
      if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
      if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
      if (combinedK) {
        url += `&k=${encodeURIComponent(combinedK)}`;
      }
    } else {
      // 'warehouse' or 'both' (default direct view to warehouse deals)
      url = `https://www.${domain}/s?i=warehouse-deals&pct-off=${min}-${max}`;
      const catKw = WAREHOUSE_CATEGORY_KEYWORDS[category] || '';
      let combinedK = '';
      if (catKw && keyword) {
        combinedK = `${catKw} ${keyword}`;
      } else if (catKw) {
        combinedK = catKw;
      } else if (keyword) {
        combinedK = keyword;
      }
      if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
      if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
      if (combinedK) {
        url += `&k=${encodeURIComponent(combinedK)}`;
      }
    }

    if (minP > 0) url += `&low-price=${minP}`;
    if (maxP > 0) url += `&high-price=${maxP}`;

    if (sort) {
      url += `&s=${encodeURIComponent(sort)}`;
    }
    if (onlyInStock) {
      const availCode = getAvailabilityRefinement(domain);
      url += `&rh=p_n_availability%3A${availCode}`;
    }
    return url;
  }

  function updateTargetUrl() {
    const url = buildAmazonUrl();
    targetUrlText.textContent = url;
    if (openDirectBtn) {
      openDirectBtn.href = url;
    }
  }

  // Copy URL Button
  copyUrlBtn.addEventListener('click', () => {
    const url = buildAmazonUrl();
    navigator.clipboard.writeText(url).then(() => {
      showToast('Deal URL copied to clipboard!');
    }).catch(() => {
      showToast('Copied!');
    });
  });

  // Open Direct Button
  openDirectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const url = buildAmazonUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Opened Amazon Warehouse search in new tab!');
  });

  // Search Action
  searchBtn.addEventListener('click', () => {
    currentPage = 1;
    deals = [];
    executeSearch(false);
  });

  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentPage = 1;
      deals = [];
      executeSearch(false);
    }
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPage++;
      executeSearch(true);
    });
  }

  async function executeSearch(isLoadMore = false) {
    if (isLoading) return;
    isLoading = true;
    stopRequested = false;
    if (stopScanBtn) stopScanBtn.textContent = '⏹️ Stop Scanning';

    const keyword = keywordInput.value.trim();
    const rawCategory = categorySelect.value;
    const isDeepSweep = (rawCategory === 'sweep_all');
    const category = isDeepSweep ? 'all' : rawCategory;
    const min = minDiscountSlider.value;
    const max = maxDiscountSlider.value;
    const domain = domainSelect.value || 'amazon.com.au';
    const sort = sortSelect.value;
    const pagesSetting = pagesSelect ? pagesSelect.value : 'all';
    const onlyInStock = inStockOnly ? inStockOnly.checked : true;
    const minP = minPriceInput ? (parseFloat(minPriceInput.value) || 0) : 0;
    const maxP = maxPriceInput ? (parseFloat(maxPriceInput.value) || 0) : 0;
    const cond = conditionSelect ? conditionSelect.value : 'all';
    const negKw = negKeywordsInput ? negKeywordsInput.value.trim() : '';

    const isAllPages = (pagesSetting === 'all');
    // Amazon hard caps pagination at 100 pages
    const targetMaxPages = isAllPages ? 100 : parseInt(pagesSetting);

    const inventoryBadge = document.getElementById('inventoryNoteBadge');
    if (inventoryBadge) inventoryBadge.style.display = 'none';

    if (!isLoadMore) {
      deals = [];
      currentPage = 1;
      renderSkeletons();
      resultsMeta.style.display = 'none';
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    } else {
      loadMoreBtn.textContent = '⏳ Loading More Deals...';
    }

    if (scanBanner) {
      scanBanner.style.display = 'flex';
      scanBannerText.textContent = isDeepSweep
        ? '⚡ Initializing Deep Category Sweep...'
        : `🔄 Scanning Page ${currentPage}${isAllPages ? ' (Scanning All Available Pages...)' : ` of ${targetMaxPages}`}...`;
    }

    try {
      const seenAsins = new Set(deals.map(d => d.asin));

      if (isDeepSweep) {
        const DEEP_SWEEP_CATEGORIES = [
          { id: 'pc', name: 'Computers & Tablets' },
          { id: 'electronics', name: 'Electronics & Audio' },
          { id: 'videogames', name: 'Video Games & Consoles' },
          { id: 'kitchen', name: 'Home & Kitchen' },
          { id: 'hi', name: 'Tools & Home Improvement' },
          { id: 'sporting', name: 'Sports & Outdoors' },
          { id: 'toys-and-games', name: 'Toys & Games' },
          { id: 'beauty', name: 'Beauty & Personal Care' },
          { id: 'automotive', name: 'Automotive' }
        ];

        const pagesPerCat = isAllPages ? 10 : Math.min(parseInt(pagesSetting) || 2, 10);
        let categoriesScanned = 0;

        for (let c = 0; c < DEEP_SWEEP_CATEGORIES.length; c++) {
          if (stopRequested) break;
          const currentCat = DEEP_SWEEP_CATEGORIES[c];
          categoriesScanned++;

          for (let p = 1; p <= pagesPerCat; p++) {
            if (stopRequested) break;

            if (scanBanner) {
              scanBannerText.textContent = `⚡ Deep Sweep: ${currentCat.name} (${c + 1}/${DEEP_SWEEP_CATEGORIES.length}) • Page ${p}/${pagesPerCat} • Found ${deals.length} deals...`;
            }

            const apiUrl = `/api/search?storeType=${encodeURIComponent(storeType)}&keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(currentCat.id)}&minDiscount=${min}&maxDiscount=${max}&domain=${encodeURIComponent(domain)}&sort=${encodeURIComponent(sort)}&page=${p}&maxPages=1&availableOnly=${onlyInStock}&minPrice=${minP}&maxPrice=${maxP}&condition=${encodeURIComponent(cond)}&negKeywords=${encodeURIComponent(negKw)}`;

            try {
              const res = await fetch(apiUrl);
              if (!res.ok) break;
              const data = await res.json();
              const newProducts = data.products || [];
              const hasNextPage = (data.hasNextPage !== undefined) ? data.hasNextPage : (newProducts.length > 0);

              if (newProducts.length === 0) break;

              for (const item of newProducts) {
                if (!seenAsins.has(item.asin)) {
                  tagNewDealStatus(item);
                  deals.push(item);
                  seenAsins.add(item.asin);
                }
              }

              localStorage.setItem(HISTORY_KEY, JSON.stringify(dealHistory));
              renderDeals(deals);

              if (hasNextPage === false) break;
            } catch (catErr) {
              console.warn(`Deep sweep error in ${currentCat.id} p.${p}:`, catErr);
              break;
            }
          }
        }

        if (inventoryBadge) {
          inventoryBadge.style.display = 'inline-flex';
          inventoryBadge.textContent = `⚡ Deep Sweep: Scanned across ${categoriesScanned} categories`;
        }

        if (stopRequested) {
          showToast(`Deep Sweep stopped. Found ${deals.length} deals across ${categoriesScanned} departments.`);
        } else {
          showToast(`⚡ Deep Sweep complete! Found ${deals.length} verified deals across ${categoriesScanned} departments!`);
        }

      } else {
        // Standard single category or all
        let pageToFetch = currentPage;
        let pagesScannedInThisRun = 0;
        let consecutiveZeroNewPages = 0;

        while (!stopRequested) {
          pagesScannedInThisRun++;

          const apiUrl = `/api/search?storeType=${encodeURIComponent(storeType)}&keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}&minDiscount=${min}&maxDiscount=${max}&domain=${encodeURIComponent(domain)}&sort=${encodeURIComponent(sort)}&page=${pageToFetch}&maxPages=1&availableOnly=${onlyInStock}&minPrice=${minP}&maxPrice=${maxP}&condition=${encodeURIComponent(cond)}&negKeywords=${encodeURIComponent(negKw)}`;
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error('Backend search error');

          const data = await res.json();
          const newProducts = data.products || [];
          const hasNextPage = (data.hasNextPage !== undefined) ? data.hasNextPage : (newProducts.length > 0);
          const totalPages = data.totalPages || 1;
          const resultInfo = data.resultInfo || '';

          // If Amazon returned 0 products, search is exhausted
          if (newProducts.length === 0) {
            console.log(`[PAGINATION] Page ${pageToFetch} returned 0 products. Amazon results ended.`);
            break;
          }

          let newBatchCount = 0;
          for (const item of newProducts) {
            if (!seenAsins.has(item.asin)) {
              tagNewDealStatus(item);
              deals.push(item);
              seenAsins.add(item.asin);
              newBatchCount++;
            }
          }

          if (newBatchCount === 0) {
            consecutiveZeroNewPages++;
          } else {
            consecutiveZeroNewPages = 0;
          }

          localStorage.setItem(HISTORY_KEY, JSON.stringify(dealHistory));

          // Progressively display deals as each page arrives
          renderDeals(deals);

          if (scanBanner) {
            const pageLimitInfo = isAllPages ? '' : ` of ${targetMaxPages}`;
            const infoSnippet = resultInfo ? ` • ${resultInfo}` : '';
            scanBannerText.textContent = `🔄 Scanned Page ${pageToFetch}${pageLimitInfo} • Found ${deals.length} deals so far${infoSnippet}`;
          }

          // If Amazon indicates no next page exists, end scan
          if (hasNextPage === false) {
            console.log(`[PAGINATION] Amazon reported no next page at page ${pageToFetch}.`);
            break;
          }

          // If 3 consecutive pages yield 0 new deals, Amazon is likely repeating results
          if (consecutiveZeroNewPages >= 3) {
            console.log(`[PAGINATION] 3 consecutive pages yielded no new items. Stopping scan.`);
            break;
          }

          pageToFetch++;
          currentPage = pageToFetch;

          if (isLoadMore) {
            // Manual load more loads 1 page at a time
            break;
          }

          if (!isAllPages && pagesScannedInThisRun >= targetMaxPages) {
            break;
          }

          if (isAllPages && pageToFetch > 100) {
            // Hard safety limit
            break;
          }
        }

        if (stopRequested) {
          showToast(`Scan stopped at page ${pageToFetch}. Displaying ${deals.length} deals.`);
        } else if (isAllPages && deals.length > 0) {
          if (inventoryBadge) {
            inventoryBadge.style.display = 'inline-flex';
            inventoryBadge.textContent = `📦 Scanned all ${pagesScannedInThisRun} available pages (Amazon active stock limit)`;
          }
          showToast(`✅ Scan complete! Scanned all ${pagesScannedInThisRun} active pages on Amazon. Found ${deals.length} deals.`);
        }
      }

    } catch (err) {
      console.warn('Scraping error:', err);
      if (deals.length === 0) {
        renderFallbackState();
      } else {
        showToast(`Scan ended at page ${currentPage}. Showing ${deals.length} deals.`);
      }
    } finally {
      isLoading = false;
      if (scanBanner) scanBanner.style.display = 'none';
      if (loadMoreContainer) {
        loadMoreContainer.style.display = (deals.length > 0 && !isDeepSweep) ? 'block' : 'none';
        loadMoreBtn.textContent = `⬇️ Load Next Page (+24 Deals)`;
      }
    }
  }

  // Render Skeletons
  function renderSkeletons() {
    dealsGrid.innerHTML = Array(8).fill(0).map(() => `
      <div class="skeleton-card"></div>
    `).join('');
  }

  // Render Deals
  function renderDeals(items) {
    if (!items || items.length === 0) {
      dealsGrid.innerHTML = `
        <div class="empty-state card">
          <div class="empty-icon">🔎</div>
          <h3>No Exact Deals Found for This Filter</h3>
          <p>Inventory updates dynamically on Amazon. Try broadening your keywords, changing category, or widening the discount range.</p>
          <button class="btn btn-primary" id="fallbackDirectBtn">Open Filter Directly on Amazon</button>
        </div>
      `;
      document.getElementById('fallbackDirectBtn')?.addEventListener('click', () => {
        window.open(buildAmazonUrl(), '_blank');
      });
      return;
    }

    resultsMeta.style.display = 'flex';
    const pageCountText = currentPage > 1 ? ` across ${currentPage} pages scanned` : '';
    resultsCount.textContent = `Found ${items.length} deals${pageCountText}`;
    const storeLabel = storeType === 'warehouse' ? 'Amazon Warehouse' : (storeType === 'normal' ? 'Normal Amazon' : 'All Stores');
    const catText = categorySelect.options[categorySelect.selectedIndex].text;
    filterSummaryBadge.textContent = `${storeLabel} • ${catText} (${minDiscountSlider.value}%–${maxDiscountSlider.value}% off)`;

    const justListedItems = items.filter(d => d.isJustListed);
    if (countAllDeals) countAllDeals.textContent = items.length;
    if (countJustListed) countJustListed.textContent = justListedItems.length;
    if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;

    let displayedItems = items;
    if (activeFilterTab === 'just_listed') {
      displayedItems = justListedItems;
    } else if (activeFilterTab === 'sniped') {
      displayedItems = snipedDeals;
    }

    if (displayedItems.length === 0 && activeFilterTab === 'sniped') {
      dealsGrid.innerHTML = `
        <div class="empty-state card">
          <div class="empty-icon">🎯</div>
          <h3>No Watchlist Sniped Matches Yet</h3>
          <p>The Watchlist Sniper scans all your active target keywords and collects matching deals here.</p>
          <button class="btn btn-primary" id="openSniperEmptyBtn" style="margin-top: 1rem;">🎯 Open Watchlist & Run Sniper</button>
        </div>
      `;
      document.getElementById('openSniperEmptyBtn')?.addEventListener('click', openWatchlistModal);
      return;
    }

    if (displayedItems.length === 0 && activeFilterTab === 'just_listed') {
      dealsGrid.innerHTML = `
        <div class="empty-state card">
          <div class="empty-icon">✨</div>
          <h3>No "Just Listed" Deals in Current View</h3>
          <p>All ${items.length} deals have already been seen in your scan history. New items that drop during your next scan or auto-refresh will appear here!</p>
          <button class="btn btn-secondary" id="backToAllBtn" style="margin-top: 1rem;">Show All Deals (${items.length})</button>
        </div>
      `;
      document.getElementById('backToAllBtn')?.addEventListener('click', () => {
        tabAllDeals?.click();
      });
      return;
    }

    const activeDomain = domainSelect ? domainSelect.value : 'amazon.com.au';
    const activeCurrency = currencySelect ? currencySelect.value : 'AUD';

    dealsGrid.innerHTML = displayedItems.map(item => {
      const isSaved = savedDeals.some(s => s.asin === item.asin);
      const cleanImg = item.image || 'https://via.placeholder.com/300x200?text=No+Image';
      
      const itemUrl = item.url || item.link || (item.asin ? `https://${activeDomain}/dp/${item.asin}` : '#');
      const itemDomain = itemUrl.startsWith('http') ? (itemUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || activeDomain) : activeDomain;
      const priceObj = formatPriceWithCurrency(item.price, itemDomain, activeCurrency);
      const listPriceObj = formatPriceWithCurrency(item.originalPrice || item.listPrice, itemDomain, activeCurrency);

      const isWarehouse = (item.store !== 'Normal Amazon');
      const storeBadgeClass = isWarehouse ? 'warehouse' : 'normal';
      const storeBadgeText = isWarehouse ? '📦 Warehouse' : '🛒 Brand New';
      const savingsLabelText = isWarehouse ? 'Warehouse Deal' : 'Brand New Deal';

      return `
        <div class="deal-card" data-asin="${item.asin}">
          <div class="card-img-wrap">
            <span class="discount-badge">${item.discountPercent || item.discount || (minDiscountSlider.value + '%+ OFF')}</span>
            <span class="store-badge ${storeBadgeClass}">${storeBadgeText}</span>
            ${item.isJustListed ? '<span class="just-listed-badge">✨ JUST LISTED</span>' : ''}
            ${item.snipedFromTarget ? `<span class="just-listed-badge" style="top: 36px; background: #8b5cf6;">🎯 ${escapeHtml(item.snipedFromTarget)}</span>` : ''}
            ${item.page ? `<span class="page-badge" style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); color: #cbd5e1; font-size: 0.68rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">Pg ${item.page}</span>` : ''}
            <button class="save-btn ${isSaved ? 'active' : ''}" data-asin="${item.asin}" title="Save deal">
              ♥
            </button>
            <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;">
              <img src="${cleanImg}" alt="${escapeHtml(item.title)}" loading="lazy">
            </a>
          </div>
          <div class="card-body">
            <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="card-title" title="${escapeHtml(item.title)}" style="text-decoration: none;">
              ${escapeHtml(item.title)}
            </a>
            ${item.condition ? `<div style="margin: 2px 0 6px 0;"><span class="condition-badge">📦 ${escapeHtml(item.condition)}</span></div>` : ''}
            ${item.rating ? `
              <div class="card-rating">
                <span>★ ${item.rating}</span>
                <span class="reviews-count">(${item.reviews || 'ratings'})</span>
              </div>
            ` : '<div style="height: 18px;"></div>'}
            
            <div class="card-pricing">
              <span class="price-current">${priceObj.display}</span>
              ${listPriceObj.display && listPriceObj.display !== 'See Options' && listPriceObj.display !== priceObj.display ? `<span class="price-original" title="Original Amazon store price">${listPriceObj.display}</span>` : ''}
              <span class="savings-label">${savingsLabelText}</span>
            </div>

            <!-- Verification Badges (CamelCamelCamel, Keepa, OzBargain) -->
            <div class="card-verification-row">
              <a href="${getCamelUrl(item.asin, itemDomain)}" target="_blank" rel="noopener noreferrer" class="verify-pill camel-pill" title="Check price history on CamelCamelCamel">
                📉 Camel³
              </a>
              <a href="${getKeepaUrl(item.asin, itemDomain)}" target="_blank" rel="noopener noreferrer" class="verify-pill keepa-pill" title="View Keepa price tracking graph">
                📊 Keepa
              </a>
              <a href="${getOzBargainUrl(item.title)}" target="_blank" rel="noopener noreferrer" class="verify-pill ozb-pill" title="Search community deals & reviews on OzBargain">
                🦘 OzBargain
              </a>
            </div>

            <div class="card-actions">
              <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-decoration: none; width: 100%;">
                View on Amazon ↗
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card save event listeners
    document.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const asin = e.currentTarget.getAttribute('data-asin');
        toggleSaveDeal(asin);
      });
    });
  }

  // Fallback when backend is unavailable or Amazon blocked headless scraper
  function renderFallbackState() {
    dealsGrid.innerHTML = `
      <div class="empty-state card">
        <div class="empty-icon">🛡️</div>
        <h3>Live Amazon Filter Ready</h3>
        <p>Amazon's anti-bot system occasionally requires direct user verification. You can jump straight into the full, unblocked search page on Amazon with your <strong>${minDiscountSlider.value}%–${maxDiscountSlider.value}%</strong> discount filters applied!</p>
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 1rem;">
          <button class="btn btn-primary" id="fallbackDirectBtn2">
            🚀 Open Filtered Results on Amazon Now
          </button>
        </div>
      </div>
    `;
    document.getElementById('fallbackDirectBtn2')?.addEventListener('click', () => {
      window.open(buildAmazonUrl(), '_blank');
    });
  }

  // Save / Bookmark Management
  function toggleSaveDeal(asin) {
    const existingIndex = savedDeals.findIndex(d => d.asin === asin);
    if (existingIndex >= 0) {
      savedDeals.splice(existingIndex, 1);
      showToast('Removed from saved deals');
      try {
        fetch(`/api/saved/${asin}`, { method: 'DELETE' });
      } catch (err) {}
    } else {
      const deal = deals.find(d => d.asin === asin);
      if (deal) {
        savedDeals.push(deal);
        showToast('Saved to your favorites!');
        try {
          fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deal)
          });
        } catch (err) {}
      }
    }
    localStorage.setItem('saved_warehouse_deals', JSON.stringify(savedDeals));
    updateSavedCount();
    renderDeals(deals);
    renderSavedList();
  }

  function updateSavedCount() {
    savedCount.textContent = savedDeals.length;
  }

  function renderSavedList() {
    if (savedDeals.length === 0) {
      savedList.innerHTML = `<div class="drawer-empty">No saved deals yet. Click the heart icon on any product to save it here!</div>`;
      return;
    }

    const activeDomain = domainSelect ? domainSelect.value : 'amazon.com.au';
    const activeCurrency = currencySelect ? currencySelect.value : 'AUD';

    savedList.innerHTML = savedDeals.map(d => {
      const dUrl = d.url || d.link || (d.asin ? `https://${activeDomain}/dp/${d.asin}` : '#');
      const itemDomain = dUrl.startsWith('http') ? (dUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || activeDomain) : activeDomain;
      const priceObj = formatPriceWithCurrency(d.price, itemDomain, activeCurrency);

      return `
        <div class="saved-item-card">
          <img src="${d.image || 'https://via.placeholder.com/50'}" alt="">
          <div class="saved-item-info">
            <a href="${dUrl}" target="_blank" rel="noopener noreferrer" class="saved-item-title" style="text-decoration:none;color:inherit;display:block;">${escapeHtml(d.title)}</a>
            <div class="saved-item-price">${priceObj.display}</div>
          </div>
          <a href="${dUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="text-decoration:none;">Open ↗</a>
          <button class="btn-icon remove-saved" data-asin="${d.asin}">✕</button>
        </div>
      `;
    }).join('');

    savedList.querySelectorAll('.remove-saved').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const asin = e.currentTarget.getAttribute('data-asin');
        savedDeals = savedDeals.filter(d => d.asin !== asin);
        localStorage.setItem('saved_warehouse_deals', JSON.stringify(savedDeals));
        try {
          fetch(`/api/saved/${asin}`, { method: 'DELETE' });
        } catch (err) {}
        updateSavedCount();
        renderSavedList();
        renderDeals(deals);
      });
    });
  }

  // Drawer Toggles
  savedDrawerBtn.addEventListener('click', () => {
    renderSavedList();
    savedBackdrop.classList.add('open');
  });

  closeDrawerBtn.addEventListener('click', () => {
    savedBackdrop.classList.remove('open');
  });

  savedBackdrop.addEventListener('click', (e) => {
    if (e.target === savedBackdrop) {
      savedBackdrop.classList.remove('open');
    }
  });

  clearSavedBtn.addEventListener('click', () => {
    if (confirm('Clear all saved deals?')) {
      savedDeals = [];
      localStorage.setItem('saved_warehouse_deals', JSON.stringify(savedDeals));
      updateSavedCount();
      renderSavedList();
      renderDeals(deals);
      showToast('All saved deals cleared');
    }
  });

  // Export CSV
  exportCsvBtn.addEventListener('click', () => {
    if (!deals || deals.length === 0) return;
    const header = ['ASIN', 'Title', 'Price', 'List Price', 'Discount', 'Rating', 'Reviews', 'URL'];
    const rows = deals.map(d => [
      `"${d.asin}"`,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${d.price}"`,
      `"${d.listPrice || ''}"`,
      `"${d.discount || ''}"`,
      `"${d.rating || ''}"`,
      `"${d.reviews || ''}"`,
      `"${d.url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `amazon_warehouse_deals_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported deals to CSV!');
  });

  // Backend Health Ping
  async function checkBackendHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        isBackendOnline = true;
        serverStatus.className = 'status-indicator online';
        serverStatusText.textContent = 'Backend Online';
        return;
      }
    } catch {
      // Backend not running (standalone file mode)
    }
    isBackendOnline = false;
    serverStatus.className = 'status-indicator offline';
    serverStatusText.textContent = 'Standalone Mode';
  }

  // Toast Notification
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
