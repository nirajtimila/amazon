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
  const loadAllDbDealsBtn = document.getElementById('loadAllDbDealsBtn');
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
  const tabTopBrands = document.getElementById('tabTopBrands');
  const tabJustListed = document.getElementById('tabJustListed');
  const tabSnipedDeals = document.getElementById('tabSnipedDeals');
  const tabPriceErrors = document.getElementById('tabPriceErrors');
  const countAllDeals = document.getElementById('countAllDeals');
  const countTopBrands = document.getElementById('countTopBrands');
  const countJustListed = document.getElementById('countJustListed');
  const countSnipedDeals = document.getElementById('countSnipedDeals');
  const countPriceErrors = document.getElementById('countPriceErrors');
  const hideAccessoriesToggleBtn = document.getElementById('hideAccessoriesToggleBtn');
  const hideAccessoriesLabel = document.getElementById('hideAccessoriesLabel');
  let hideAccessories = true;

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

  // Database Deal Radar & Time Filter Elements
  const dbStatusBar = document.getElementById('dbStatusBar');
  const dbPulseDot = document.getElementById('dbPulseDot');
  const dbTotalDealsCount = document.getElementById('dbTotalDealsCount');
  const dbLastScanText = document.getElementById('dbLastScanText');
  const dbNextScanText = document.getElementById('dbNextScanText');
  const dbScanNowBtn = document.getElementById('dbScanNowBtn');
  const dbScanIcon = document.getElementById('dbScanIcon');
  const dbScanLabel = document.getElementById('dbScanLabel');
  const timeFilterRow = document.getElementById('timeFilterRow');
  const timePills = document.querySelectorAll('.time-pill');
  const count1h = document.getElementById('count1h');
  const count2h = document.getElementById('count2h');
  const count6h = document.getElementById('count6h');
  const count12h = document.getElementById('count12h');
  const count24h = document.getElementById('count24h');
  let activeTimeWindow = '24h';

  // Excluded Categories Engine (Deep Sweep & Database Radar)
  const EXCLUDE_STORAGE_KEY = 'wh_excluded_categories';
  const EXCLUDABLE_DEPARTMENTS = [
    { id: 'stripbooks', name: 'Books', icon: '📚' },
    { id: 'pets', name: 'Pet Supplies', icon: '🐾' },
    { id: 'baby', name: 'Baby Products', icon: '🍼' },
    { id: 'beauty', name: 'Beauty', icon: '💄' },
    { id: 'toys-and-games', name: 'Toys & Games', icon: '🧸' },
    { id: 'videogames', name: 'Video Games', icon: '🎮' },
    { id: 'automotive', name: 'Automotive', icon: '🚗' },
    { id: 'garden', name: 'Garden & Outdoor', icon: '🌱' },
    { id: 'office-products', name: 'Office', icon: '📎' },
    { id: 'mi', name: 'Musical Instruments', icon: '🎸' },
    { id: 'luggage', name: 'Luggage & Travel', icon: '🧳' },
    { id: 'hpc', name: 'Health & Household', icon: '💊' },
    { id: 'hi', name: 'Tools & Home', icon: '🔧' },
    { id: 'sporting', name: 'Sports & Outdoors', icon: '⚽' },
    { id: 'kitchen', name: 'Home & Kitchen', icon: '🍳' },
    { id: 'pc', name: 'Computers & Tablets', icon: '💻' },
    { id: 'electronics', name: 'Electronics', icon: '🎧' }
  ];

  let excludedCategories = new Set(JSON.parse(localStorage.getItem(EXCLUDE_STORAGE_KEY) || '["stripbooks", "pets"]'));

  function isCategoryExcluded(catId, title, asin) {
    if (excludedCategories.size === 0) return false;
    if ((excludedCategories.has('books') || excludedCategories.has('stripbooks')) && asin && /^\d{9}[\dX]$/i.test(asin)) {
      return true;
    }
    if (catId) {
      const c = catId.toLowerCase();
      if (excludedCategories.has(c)) return true;
      if (excludedCategories.has('stripbooks') && (c === 'stripbooks' || c === 'books')) return true;
      if (excludedCategories.has('books') && (c === 'stripbooks' || c === 'books')) return true;
      if (excludedCategories.has('pets') && (c === 'pets' || c === 'pet-supplies')) return true;
      if (excludedCategories.has('pet-supplies') && (c === 'pets' || c === 'pet-supplies')) return true;
      if (excludedCategories.has('baby') && (c === 'baby' || c === 'baby-products')) return true;
      if (excludedCategories.has('toys-and-games') && (c === 'toys' || c === 'toys-and-games')) return true;
      if (excludedCategories.has('mi') && (c === 'mi' || c === 'music' || c === 'musical-instruments')) return true;
    }
    if ((excludedCategories.has('books') || excludedCategories.has('stripbooks')) && title) {
      if (/\b(paperback|hardcover|memoir|study\s+guide|bestseller|novel|thriller|biography|handbook)\b/i.test(title)) return true;
    }
    return false;
  }

  function renderExcludePills() {
    const wrap = document.getElementById('excludePillsWrap');
    if (!wrap) return;
    wrap.innerHTML = EXCLUDABLE_DEPARTMENTS.map(dept => {
      const isEx = isCategoryExcluded(dept.id);
      return `<button type="button" class="exclude-pill ${isEx ? 'excluded' : ''}" data-cat="${dept.id}" title="${isEx ? 'Click to re-include ' + dept.name : 'Click to exclude ' + dept.name}">${dept.icon} ${dept.name}</button>`;
    }).join('');

    wrap.querySelectorAll('.exclude-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        if (isCategoryExcluded(cat)) {
          excludedCategories.delete(cat);
          if (cat === 'stripbooks') excludedCategories.delete('books');
          if (cat === 'pets') excludedCategories.delete('pet-supplies');
        } else {
          excludedCategories.add(cat);
        }
        localStorage.setItem(EXCLUDE_STORAGE_KEY, JSON.stringify(Array.from(excludedCategories)));
        renderExcludePills();
        currentPage = 1;
        deals = [];
        loadDatabaseDeals(false);
      });
    });
  }

  function updateExcludePanelVisibility() {
    const panel = document.getElementById('excludeCategoriesPanel');
    if (!panel || !categorySelect) return;
    const isMultiCat = categorySelect.value === 'sweep_all' || categorySelect.value === 'all';
    panel.style.display = isMultiCat ? 'block' : 'none';
  }

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
    if (!priceStr || priceStr === 'See Options' || priceStr === 'Check Site' || priceStr.toLowerCase().includes('unavailable')) {
      return { display: 'See Options', original: '', numVal: null };
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
    'office-products': 'office products',
    'baby': 'baby',
    'garden': 'garden',
    'hpc': 'health personal care',
    'mi': 'musical instruments',
    'luggage': 'luggage'
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

    // Prioritize firstSeenAt from server database so original listed hour is preserved
    if (item.firstSeenAt) {
      dealHistory[item.asin] = item.firstSeenAt;
    } else if (dealHistory[item.asin]) {
      item.firstSeenAt = dealHistory[item.asin];
    } else {
      dealHistory[item.asin] = now;
      item.firstSeenAt = now;
    }

    const age = now - item.firstSeenAt;
    item.isJustListed = (age < TWENTY_FOUR_HOURS);
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
  let storeType = 'both'; // 'both', 'warehouse', or 'normal'
  let deals = [];
  let savedDeals = JSON.parse(localStorage.getItem('saved_warehouse_deals') || '[]');
  let isBackendOnline = false;
  let currentPage = 1;
  let isLoading = false;
  let dbCurrentPage = 1;
  const DB_PAGE_SIZE = 250;
  let dbTotalMatches = 0;

  // Initialize
  updateSavedCount();
  fetchLiveExchangeRates();
  renderExcludePills();
  updateExcludePanelVisibility();
  checkBackendHealth().then(async () => {
    updateDatabaseStatus();
    await loadDatabaseDeals();
    if (!deals || deals.length === 0) {
      executeSearch();
    }
  });
  updateTargetUrl();

  // Reset view back to All Deals
  function resetToAllDealsTab() {
    activeFilterTab = 'all';
    if (tabAllDeals) tabAllDeals.classList.add('active');
    if (tabTopBrands) tabTopBrands.classList.remove('active');
    if (tabJustListed) tabJustListed.classList.remove('active');
    if (tabSnipedDeals) tabSnipedDeals.classList.remove('active');
    if (tabPriceErrors) tabPriceErrors.classList.remove('active');
    if (timeFilterRow) timeFilterRow.style.display = 'none';
  }

  // Filter Tabs (All Deals vs Top Brands vs Just Listed vs Sniped Deals vs Price Errors)
  if (tabAllDeals) {
    tabAllDeals.addEventListener('click', () => {
      resetToAllDealsTab();
      loadDatabaseDeals(false);
    });
  }

  if (tabTopBrands) {
    tabTopBrands.addEventListener('click', () => {
      activeFilterTab = 'top_brands';
      tabTopBrands.classList.add('active');
      if (tabAllDeals) tabAllDeals.classList.remove('active');
      if (tabJustListed) tabJustListed.classList.remove('active');
      if (tabSnipedDeals) tabSnipedDeals.classList.remove('active');
      if (tabPriceErrors) tabPriceErrors.classList.remove('active');
      if (timeFilterRow) timeFilterRow.style.display = 'none';

      loadDatabaseDeals(true);
    });
  }

  if (hideAccessoriesToggleBtn) {
    hideAccessoriesToggleBtn.addEventListener('click', () => {
      hideAccessories = !hideAccessories;
      if (hideAccessories) {
        hideAccessoriesToggleBtn.classList.add('active');
        if (hideAccessoriesLabel) hideAccessoriesLabel.textContent = 'Clean Feed (No Cases/Parts)';
        showToast('🛡️ Clean Feed enabled: Cases, covers, & replacement parts hidden');
      } else {
        hideAccessoriesToggleBtn.classList.remove('active');
        if (hideAccessoriesLabel) hideAccessoriesLabel.textContent = 'Show All (Including Parts)';
        showToast('🔓 Clean Feed disabled: Showing all items');
      }
      loadDatabaseDeals(false);
    });
  }

  if (tabPriceErrors) {
    tabPriceErrors.addEventListener('click', () => {
      activeFilterTab = 'price_errors';
      tabPriceErrors.classList.add('active');
      if (tabAllDeals) tabAllDeals.classList.remove('active');
      if (tabTopBrands) tabTopBrands.classList.remove('active');
      if (tabJustListed) tabJustListed.classList.remove('active');
      if (tabSnipedDeals) tabSnipedDeals.classList.remove('active');
      if (timeFilterRow) timeFilterRow.style.display = 'none';

      // Set min discount slider to 80%
      if (minDiscountSlider) {
        minDiscountSlider.value = 80;
        syncDiscountUI();
      }
      presetPills.forEach(p => {
        if (p.getAttribute('data-min') === '80') p.classList.add('active');
        else p.classList.remove('active');
      });

      loadDatabaseDeals(true);
    });
  }

  if (tabJustListed) {
    tabJustListed.addEventListener('click', () => {
      activeFilterTab = 'just_listed';
      tabJustListed.classList.add('active');
      if (tabAllDeals) tabAllDeals.classList.remove('active');
      if (tabTopBrands) tabTopBrands.classList.remove('active');
      if (tabSnipedDeals) tabSnipedDeals.classList.remove('active');
      if (tabPriceErrors) tabPriceErrors.classList.remove('active');
      if (timeFilterRow) timeFilterRow.style.display = 'flex';

      // Smart selection: if the currently selected window has 0 deals, auto-select a window that has deals
      const c1 = parseInt(count1h?.textContent || '0', 10);
      const c2 = parseInt(count2h?.textContent || '0', 10);
      const c6 = parseInt(count6h?.textContent || '0', 10);
      const c12 = parseInt(count12h?.textContent || '0', 10);
      const c24 = parseInt(count24h?.textContent || '0', 10);

      const counts = { '1h': c1, '2h': c2, '6h': c6, '12h': c12, '24h': c24 };
      if (!counts[activeTimeWindow] || counts[activeTimeWindow] === 0) {
        if (c24 > 0) activeTimeWindow = '24h';
        else if (c12 > 0) activeTimeWindow = '12h';
        else if (c6 > 0) activeTimeWindow = '6h';
        else if (c2 > 0) activeTimeWindow = '2h';
        else if (c1 > 0) activeTimeWindow = '1h';
        else activeTimeWindow = '24h';
      }

      timePills.forEach(p => {
        if (p.getAttribute('data-time') === activeTimeWindow) p.classList.add('active');
        else p.classList.remove('active');
      });

      loadDatabaseDeals(true);
    });
  }

  if (tabSnipedDeals) {
    tabSnipedDeals.addEventListener('click', async () => {
      activeFilterTab = 'sniped';
      tabSnipedDeals.classList.add('active');
      if (tabAllDeals) tabAllDeals.classList.remove('active');
      if (tabTopBrands) tabTopBrands.classList.remove('active');
      if (tabJustListed) tabJustListed.classList.remove('active');
      if (tabPriceErrors) tabPriceErrors.classList.remove('active');
      if (timeFilterRow) timeFilterRow.style.display = 'none';

      // Always fetch fresh sniped matches from backend and merge
      try {
        const res = await fetch('/api/sniped');
        if (res.ok) {
          const fresh = await res.json();
          if (Array.isArray(fresh) && fresh.length > 0) {
            for (const item of fresh) {
              if (!snipedDeals.some(d => d.asin === item.asin)) {
                snipedDeals.push(item);
              }
            }
          }
        }
      } catch (err) {}

      // If local has sniped deals, ensure backend has them too
      if (snipedDeals.length > 0) {
        fetch('/api/sniped', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snipedDeals)
        }).catch(() => {});
      }

      if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;
      renderDeals(snipedDeals);
    });
  }

  // Time Filter Pills for Just Listed
  timePills.forEach(pill => {
    pill.addEventListener('click', () => {
      timePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeTimeWindow = pill.getAttribute('data-time') || '1h';
      loadDatabaseDeals(true);
    });
  });

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
        } else if (Array.isArray(watchlist) && watchlist.length > 0) {
          fetch('/api/watchlist/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(watchlist)
          }).catch(() => {});
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
          if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;
          if (tabSnipedDeals) tabSnipedDeals.style.display = 'inline-flex';
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
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const target = watchlist.find(w => w.id === id);
        if (target) {
          closeWatchlistModal();
          showToast(`🎯 Sniping "${target.keyword}" across database and live stores...`);
          await runWatchlistSniperForTarget(target);
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
      const minD = (watchMinDiscountInput && watchMinDiscountInput.value !== '' && !isNaN(parseInt(watchMinDiscountInput.value, 10)))
        ? Math.max(0, parseInt(watchMinDiscountInput.value, 10))
        : 0;
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
        const resp = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTarget)
        });
        if (resp.ok) {
          const created = await resp.json();
          if (created && created.id) {
            newTarget.id = created.id;
            saveWatchlist();
          }
        }
      } catch (err) {}
      watchKeywordInput.value = '';
      watchMaxPriceInput.value = '';
      if (watchMinDiscountInput) watchMinDiscountInput.value = '0';
      showToast(`Added "${kw}" to Watchlist! (Min: ${minD}% off, Max: $${maxP || 'Any'})`);

      // Immediately run sniper for newly added target
      runWatchlistSniperForTarget(newTarget);
    });
  }

  if (runSniperScanBtn) {
    runSniperScanBtn.addEventListener('click', runWatchlistSniper);
  }

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

    // 4. Accessory & Junk Filter
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

    // 6. Discount threshold check (only if target explicitly specified minDiscount > 0)
    const targetMinDisc = parseInt(target.minDiscount, 10) || 0;
    if (targetMinDisc > 0) {
      const disc = parseInt(item.discountPercent, 10) || 0;
      if (disc < targetMinDisc) return false;
    }

    return true;
  }

  async function runWatchlistSniperForTarget(target) {
    if (!target) return;
    if (scanBanner) {
      scanBanner.style.display = 'flex';
      scanBannerText.textContent = `🎯 Sniper scanning target: "${target.keyword}" across database & live stores...`;
    }

    const domain = domainSelect ? domainSelect.value : 'amazon.com.au';
    const onlyInStock = inStockOnly ? inStockOnly.checked : true;
    let foundHits = 0;

    // 1. Check existing database deals first
    try {
      const targetMinDisc = parseInt(target.minDiscount, 10) || 0;
      const targetMaxP = parseFloat(target.maxPrice) || 0;
      const dbUrl = `/api/db/deals?keyword=${encodeURIComponent(target.keyword)}&category=${encodeURIComponent(target.category || 'all')}&minDiscount=${targetMinDisc}&maxPrice=${targetMaxP}&timeWindow=all&limit=100`;
      const dbRes = await fetch(dbUrl);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        for (const item of (dbData.products || [])) {
          if (!isWatchlistMatch(item, target)) continue;
          item.snipedFromTarget = target.keyword;
          tagNewDealStatus(item);
          if (!snipedDeals.some(d => d.asin === item.asin)) {
            snipedDeals.unshift(item);
            foundHits++;
          }
        }
      }
    } catch (e) {}

    // 2. Query live store
    try {
      const targetMinDisc = parseInt(target.minDiscount, 10) || 0;
      const apiUrl = `/api/search?storeType=both&keyword=${encodeURIComponent(target.keyword)}&category=${encodeURIComponent(target.category || 'all')}&minDiscount=${targetMinDisc}&maxDiscount=99&domain=${encodeURIComponent(domain)}&sort=price-asc-rank&page=1&maxPages=1&availableOnly=${onlyInStock}&maxPrice=${target.maxPrice || 0}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.products || [])) {
          if (!isWatchlistMatch(item, target)) continue;
          item.snipedFromTarget = target.keyword;
          tagNewDealStatus(item);
          if (!snipedDeals.some(d => d.asin === item.asin)) {
            snipedDeals.unshift(item);
            foundHits++;
          }
        }
      }
    } catch (e) {}

    if (scanBanner) scanBanner.style.display = 'none';
    if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;

    if (snipedDeals.length > 0) {
      // Sync sniped deals to backend so they persist
      fetch('/api/sniped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snipedDeals)
      }).catch(() => {});

      playNotificationChime();
      showToast(`🎯 Found ${foundHits > 0 ? foundHits : snipedDeals.length} match(es) for "${target.keyword}"!`);
      if (tabSnipedDeals) tabSnipedDeals.click();
    } else {
      showToast(`🎯 Scanned "${target.keyword}". 0 matching deals right now. Tip: Set Min Off to 0% or raise Max Price.`);
    }
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

    showToast(`🎯 Running Watchlist Sniper for ${activeTargets.length} target(s)...`);

    // Trigger backend autonomous scan as well
    fetch('/api/watchlist/scan', { method: 'POST' }).catch(() => {});

    for (let i = 0; i < activeTargets.length; i++) {
      const target = activeTargets[i];
      if (scanBannerText) {
        scanBannerText.textContent = `🎯 Sniper scanning target ${i + 1}/${activeTargets.length}: "${target.keyword}"...`;
      }
      await runWatchlistSniperForTarget(target);
    }

    // Refresh sniped deals from backend
    try {
      const sRes = await fetch('/api/sniped');
      if (sRes.ok) {
        const fresh = await sRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) {
          for (const item of fresh) {
            if (!snipedDeals.some(d => d.asin === item.asin)) {
              snipedDeals.unshift(item);
            }
          }
        }
      }
    } catch (e) {}

    if (scanBanner) scanBanner.style.display = 'none';
    if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;

    if (snipedDeals.length > 0) {
      // Sync full set to backend
      fetch('/api/sniped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snipedDeals)
      }).catch(() => {});

      playNotificationChime();
      showToast(`🎯 SNIPER SUCCESS! ${snipedDeals.length} match(es) in your sniped list!`);
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
      resetToAllDealsTab();
      loadDatabaseDeals();
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
      resetToAllDealsTab();
      loadDatabaseDeals();
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
      resetToAllDealsTab();
      loadDatabaseDeals();
      showToast('Cleared price filter');
    });
  }

  // Price Inputs & Condition Event Listeners
  if (minPriceInput) {
    minPriceInput.addEventListener('input', () => {
      syncPricePresetsFromInputs();
      updateTargetUrl();
    });
    minPriceInput.addEventListener('change', () => {
      currentPage = 1; deals = []; resetToAllDealsTab(); loadDatabaseDeals();
    });
    minPriceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { currentPage = 1; deals = []; resetToAllDealsTab(); loadDatabaseDeals(); }
    });
  }
  if (maxPriceInput) {
    maxPriceInput.addEventListener('input', () => {
      syncPricePresetsFromInputs();
      updateTargetUrl();
    });
    maxPriceInput.addEventListener('change', () => {
      currentPage = 1; deals = []; resetToAllDealsTab(); loadDatabaseDeals();
    });
    maxPriceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { currentPage = 1; deals = []; resetToAllDealsTab(); loadDatabaseDeals(); }
    });
  }
  if (conditionSelect) {
    conditionSelect.addEventListener('change', () => {
      updateTargetUrl();
      currentPage = 1;
      deals = [];
      resetToAllDealsTab();
      loadDatabaseDeals();
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
    negKeywordsInput.addEventListener('change', () => {
      currentPage = 1; deals = []; resetToAllDealsTab(); loadDatabaseDeals();
    });
    negKeywordsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { currentPage = 1; deals = []; resetToAllDealsTab(); loadDatabaseDeals(); }
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
      resetToAllDealsTab();
      loadDatabaseDeals();
    });
  });

  // Keyword chip buttons in empty state
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('keyword-chip')) {
      const q = e.target.getAttribute('data-q');
      keywordInput.value = q;
      updateTargetUrl();
      resetToAllDealsTab();
      loadDatabaseDeals();
    }
  });

  // Event Listeners for Filters
  keywordInput.addEventListener('input', updateTargetUrl);
  categorySelect.addEventListener('change', () => {
    updateExcludePanelVisibility();
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals();
  });

  // Exclude Categories Shortcut Buttons
  document.getElementById('quickExcludeBooksPetsBtn')?.addEventListener('click', () => {
    excludedCategories.add('stripbooks');
    excludedCategories.add('pets');
    localStorage.setItem(EXCLUDE_STORAGE_KEY, JSON.stringify(Array.from(excludedCategories)));
    renderExcludePills();
    showToast('🚫 Excluded Books & Pet Supplies from Sweep & Radar');
    currentPage = 1;
    deals = [];
    loadDatabaseDeals(false);
  });

  document.getElementById('resetExcludedCatsBtn')?.addEventListener('click', () => {
    excludedCategories.clear();
    localStorage.removeItem(EXCLUDE_STORAGE_KEY);
    renderExcludePills();
    showToast('✅ All categories included in Sweep & Radar');
    currentPage = 1;
    deals = [];
    loadDatabaseDeals(false);
  });
  domainSelect.addEventListener('change', () => {
    syncCurrencyUI();
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals();
  });
  sortSelect.addEventListener('change', () => {
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals();
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
    resetToAllDealsTab();
    loadDatabaseDeals();
  });
  if (inStockOnly) inStockOnly.addEventListener('change', () => {
    updateTargetUrl();
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals();
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
  minDiscountSlider.addEventListener('change', () => {
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals();
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
  maxDiscountSlider.addEventListener('change', () => {
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals();
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
      resetToAllDealsTab();
      loadDatabaseDeals();
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
    const dept = AMAZON_DEPARTMENTS[category];

    if (activeStore === 'normal' || activeStore === 'both') {
      const iParam = dept || (category === 'all' || category === 'warehouse-deals' ? 'aps' : category);
      url = `https://www.${domain}/s?i=${encodeURIComponent(iParam)}&pct-off=${min}-${max}`;
      let combinedK = keyword || '';
      if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
      if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
      if (combinedK) url += `&k=${encodeURIComponent(combinedK)}`;
    } else {
      // Warehouse deals: always search inside i=warehouse-deals so it stays in Amazon Warehouse
      url = `https://www.${domain}/s?i=warehouse-deals&pct-off=${min}-${max}`;
      const catKw = (category && category !== 'all' && category !== 'sweep_all') ? (WAREHOUSE_CATEGORY_KEYWORDS[category] || category) : '';
      let combinedK = keyword || catKw || '';
      if (condTerm) combinedK = combinedK ? `${combinedK} ${condTerm}` : condTerm;
      if (negTermsStr) combinedK = combinedK ? `${combinedK} ${negTermsStr}` : negTermsStr;
      if (combinedK) url += `&k=${encodeURIComponent(combinedK)}`;
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

  // Search Action (Hunts from local database - instant & offline)
  searchBtn.addEventListener('click', () => {
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals(false);
  });

  keywordInput.addEventListener('change', () => {
    currentPage = 1;
    deals = [];
    resetToAllDealsTab();
    loadDatabaseDeals(false);
  });

  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentPage = 1;
      deals = [];
      resetToAllDealsTab();
      loadDatabaseDeals(false);
    }
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      dbCurrentPage++;
      loadDatabaseDeals(true, true, false);
    });
  }

  if (loadAllDbDealsBtn) {
    loadAllDbDealsBtn.addEventListener('click', () => {
      loadDatabaseDeals(true, false, true);
    });
  }

  async function executeSearch(isLoadMore = false) {
    if (isLoading) return;
    isLoading = true;
    stopRequested = false;
    if (stopScanBtn) stopScanBtn.textContent = '⏹️ Stop Scanning';
    if (!isLoadMore) {
      resetToAllDealsTab();
    }

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

        const pagesPerCat = isAllPages ? 20 : Math.min(parseInt(pagesSetting) || 2, 20);
        let categoriesScanned = 0;

        for (let c = 0; c < DEEP_SWEEP_CATEGORIES.length; c++) {
          if (stopRequested) break;
          const currentCat = DEEP_SWEEP_CATEGORIES[c];
          if (isCategoryExcluded(currentCat.id)) {
            console.log(`[DEEP SWEEP] ⏭️ Skipping excluded department: ${currentCat.name}`);
            continue;
          }
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

  function formatCurrencyAmount(num, targetCurrency) {
    if (num === null || num === undefined || isNaN(num)) return '';
    const curr = targetCurrency || (currencySelect ? currencySelect.value : 'AUD');
    const symbol = CURRENCY_SYMBOLS[curr] || '$';
    const decimals = (curr === 'JPY') ? 0 : 2;
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  // Render Deals
  function renderDeals(items, totalMatches = 0, stats = null) {
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
    const pageCountText = currentPage > 1 ? ` (${currentPage} pgs)` : '';
    const storeLabel = storeType === 'warehouse' ? '📦 Warehouse' : (storeType === 'normal' ? '🛒 Normal Amazon' : '⚡ All Stores');
    let catClean = categorySelect.options[categorySelect.selectedIndex]?.text || 'All';
    if (categorySelect.value === 'sweep_all' || categorySelect.value === 'all') {
      const exCount = excludedCategories ? excludedCategories.size : 0;
      catClean = exCount > 0 ? `All Categories (${exCount} Excluded)` : 'All Categories';
    } else {
      catClean = catClean.replace(/\s*\(.*?\)/, '');
    }

    const now = Date.now();
    if (stats) {
      if (count1h) count1h.textContent = stats.last1h || 0;
      if (count2h) count2h.textContent = stats.last2h || 0;
      if (count6h) count6h.textContent = stats.last6h || 0;
      if (count12h) count12h.textContent = stats.last12h || 0;
      if (count24h) count24h.textContent = stats.last24h || 0;
      if (countPriceErrors) countPriceErrors.textContent = stats.priceErrors !== undefined ? stats.priceErrors : 0;
      if (countTopBrands) countTopBrands.textContent = stats.topBrands !== undefined ? stats.topBrands.toLocaleString() : 0;
      if (countJustListed) countJustListed.textContent = stats.last24h || stats.last6h || 0;
      if (countAllDeals) countAllDeals.textContent = (stats.totalInDb ? (storeType === 'warehouse' ? stats.warehouseDeals : (storeType === 'normal' ? stats.normalDeals : stats.totalInDb)).toLocaleString() : (totalMatches ? totalMatches.toLocaleString() : items.length.toLocaleString()));
    } else {
      let c1h = 0, c2h = 0, c6h = 0, c12h = 0, c24h = 0, cPriceErrors = 0, cTopBrands = 0;
      for (const d of items) {
        if (d.isBrandDeal || d.brand) cTopBrands++;
        const disc = parseInt(d.discountPercent, 10) || 0;
        if (disc >= 80 || d.isPriceError) cPriceErrors++;
        const ts = Math.max(d.firstSeenAt || 0, d.priceDropAt || 0) || dealHistory[d.asin] || 0;
        if (!ts) {
          if (d.isJustListed) { c24h++; }
          continue;
        }
        const age = now - ts;
        if (age <= 1 * 3600000) c1h++;
        if (age <= 2 * 3600000) c2h++;
        if (age <= 6 * 3600000) c6h++;
        if (age <= 12 * 3600000) c12h++;
        if (age <= 24 * 3600000) c24h++;
      }
      if (count1h) count1h.textContent = c1h;
      if (count2h) count2h.textContent = c2h;
      if (count6h) count6h.textContent = c6h;
      if (count12h) count12h.textContent = c12h;
      if (count24h) count24h.textContent = c24h;
      if (countPriceErrors) countPriceErrors.textContent = cPriceErrors;
      if (countTopBrands) countTopBrands.textContent = cTopBrands.toLocaleString();
      if (countJustListed) countJustListed.textContent = c24h;
      if (countAllDeals) countAllDeals.textContent = items.length.toLocaleString();
    }
    if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;

    const justListedItems = items.filter(d => {
      const ts = Math.max(d.firstSeenAt || 0, d.priceDropAt || 0) || dealHistory[d.asin] || 0;
      if (!ts) return d.isJustListed;
      const age = now - ts;
      if (activeTimeWindow === '1h') return age <= 1 * 3600000;
      if (activeTimeWindow === '2h') return age <= 2 * 3600000;
      if (activeTimeWindow === '6h') return age <= 6 * 3600000;
      if (activeTimeWindow === '12h') return age <= 12 * 3600000;
      if (activeTimeWindow === '24h') return age <= 24 * 3600000;
      return true;
    });

    let displayedItems = items;
    if (activeFilterTab === 'just_listed') {
      displayedItems = justListedItems;
    } else if (activeFilterTab === 'sniped') {
      displayedItems = snipedDeals;
    } else if (activeFilterTab === 'price_errors') {
      displayedItems = items.filter(d => (parseInt(d.discountPercent, 10) || 0) >= 80 || d.isPriceError);
    } else if (activeFilterTab === 'top_brands') {
      displayedItems = items.filter(d => d.isBrandDeal || d.brand);
    }

    const windowLabels = { '1h': 'Last 1 Hour', '2h': 'Last 2 Hours', '6h': 'Last 6 Hours', '12h': 'Last 12 Hours', '24h': 'Last 24 Hours', 'all': 'History' };
    const winLabel = windowLabels[activeTimeWindow] || 'Current Window';

    if (activeFilterTab === 'sniped') {
      resultsCount.textContent = `${displayedItems.length.toLocaleString()} Watchlist Sniped Matches`;
      filterSummaryBadge.textContent = '🎯 Watchlist Sniper Target Hits';
    } else if (activeFilterTab === 'price_errors') {
      resultsCount.textContent = `${displayedItems.length.toLocaleString()} Price Errors & Glitches (80%+ Off)`;
      filterSummaryBadge.textContent = `🔥 Price Errors & Glitches • ${storeLabel}`;
    } else if (activeFilterTab === 'top_brands') {
      resultsCount.textContent = `${displayedItems.length.toLocaleString()} Premier Brand Deals (Apple, Sony, Bose, etc.)`;
      filterSummaryBadge.textContent = `⭐ Premier Brand Deals • ${storeLabel}`;
    } else {
      const matchTotal = totalMatches || dbTotalMatches || items.length;
      let countExtraHtml = '';
      if (storeType === 'warehouse' && stats && stats.normalDeals > 0) {
        countExtraHtml = ` <span style="font-weight: 500; font-size: 0.85em; opacity: 0.8; margin-left: 8px;">(${stats.normalDeals.toLocaleString()} Normal Deals also in DB • <a href="#" id="quickSwitchBothStores" style="color: #38bdf8; text-decoration: underline; font-weight: 700;">View Both</a>)</span>`;
      } else if (storeType === 'normal' && stats && stats.warehouseDeals > 0) {
        countExtraHtml = ` <span style="font-weight: 500; font-size: 0.85em; opacity: 0.8; margin-left: 8px;">(${stats.warehouseDeals.toLocaleString()} Warehouse Deals also in DB • <a href="#" id="quickSwitchBothStores" style="color: #38bdf8; text-decoration: underline; font-weight: 700;">View Both</a>)</span>`;
      }

      if (activeFilterTab === 'just_listed') {
        if (displayedItems.length < matchTotal) {
          resultsCount.innerHTML = `Showing ${displayedItems.length.toLocaleString()} of ${matchTotal.toLocaleString()} Deals Discovered (${winLabel})${countExtraHtml}`;
        } else {
          resultsCount.innerHTML = `${displayedItems.length.toLocaleString()} Deals Discovered (${winLabel})${countExtraHtml}`;
        }
        filterSummaryBadge.textContent = `✨ Just Listed (${winLabel}) • ${storeLabel}`;
      } else {
        if (matchTotal > displayedItems.length) {
          resultsCount.innerHTML = `Showing ${displayedItems.length.toLocaleString()} of ${matchTotal.toLocaleString()} Deals in Database${pageCountText}${countExtraHtml}`;
        } else {
          resultsCount.innerHTML = `${matchTotal.toLocaleString()} Deals Found in Database${pageCountText}${countExtraHtml}`;
        }
        filterSummaryBadge.textContent = `${storeLabel} • ${catClean} (${minDiscountSlider.value}%–${maxDiscountSlider.value}% off)`;
      }

      document.getElementById('quickSwitchBothStores')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.store-pill[data-store="both"]')?.click();
      });
    }

    if (displayedItems.length === 0 && activeFilterTab === 'price_errors') {
      dealsGrid.innerHTML = `
        <div class="empty-state card" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔥</div>
          <h3>No 80%+ Price Errors Found For Current Filter</h3>
          <p>Price error and 80%+ discount clearance glitches update dynamically. Try switching to "All Categories" or adjusting store type.</p>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1rem; flex-wrap: wrap;">
            <button class="btn btn-primary" id="exitGlitchEmptyBtn" style="background: linear-gradient(135deg, #dc2626, #ea580c); border: none;">Show All Deals (${items.length})</button>
          </div>
        </div>
      `;
      document.getElementById('exitGlitchEmptyBtn')?.addEventListener('click', () => {
        tabAllDeals?.click();
      });
      return;
    }

    if (displayedItems.length === 0 && activeFilterTab === 'top_brands') {
      dealsGrid.innerHTML = `
        <div class="empty-state card" style="grid-column: 1 / -1;">
          <div class="empty-icon">⭐</div>
          <h3>No Premier Brand Deals Found For Current Filter</h3>
          <p>We're actively indexing deals for Sony, Apple, Bose, Dyson, Nintendo, ASUS, and 30+ top brands. Try clearing category or price restrictions, or click below to view all deals.</p>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1rem; flex-wrap: wrap;">
            <button class="btn btn-primary" id="exitBrandsEmptyBtn" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none;">Show All Deals (${items.length})</button>
          </div>
        </div>
      `;
      document.getElementById('exitBrandsEmptyBtn')?.addEventListener('click', () => {
        tabAllDeals?.click();
      });
      return;
    }

    if (displayedItems.length === 0 && activeFilterTab === 'sniped') {
      dealsGrid.innerHTML = `
        <div class="empty-state card" style="grid-column: 1 / -1;">
          <div class="empty-icon">🎯</div>
          <h3>No Watchlist Sniped Matches Yet</h3>
          <p>The Watchlist Sniper scans all your active target keywords every 2 hours and collects matching deals here.</p>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap;">
            <button class="btn btn-primary" id="openSniperEmptyBtn">🎯 Open Watchlist & Run Sniper</button>
            <button class="btn btn-secondary" id="exitSniperEmptyBtn">📦 View All Normal Deals (${items.length || deals.length})</button>
          </div>
        </div>
      `;
      document.getElementById('openSniperEmptyBtn')?.addEventListener('click', openWatchlistModal);
      document.getElementById('exitSniperEmptyBtn')?.addEventListener('click', () => {
        tabAllDeals?.click();
      });
      return;
    }

    if (displayedItems.length === 0 && activeFilterTab === 'just_listed') {
      dealsGrid.innerHTML = `
        <div class="empty-state card" style="grid-column: 1 / -1;">
          <div class="empty-icon">✨</div>
          <h3>No Deals Discovered in ${winLabel}</h3>
          <p>No new warehouse deals were indexed within this specific time window. Select a wider window (e.g. 6h, 12h, 24h) or trigger a fresh background scan.</p>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1rem; flex-wrap: wrap;">
            <button class="btn btn-secondary" id="backTo24hBtn">Show Last 24 Hours</button>
            <button class="btn btn-primary" id="backToAllBtn">Show All Deals (${items.length})</button>
          </div>
        </div>
      `;
      document.getElementById('backTo24hBtn')?.addEventListener('click', () => {
        const p24 = document.querySelector('.time-pill[data-time="24h"]');
        if (p24) p24.click();
      });
      document.getElementById('backToAllBtn')?.addEventListener('click', () => {
        tabAllDeals?.click();
      });
      return;
    }

    const activeDomain = domainSelect ? domainSelect.value : 'amazon.com.au';
    const activeCurrency = currencySelect ? currencySelect.value : 'AUD';

    let contextBannerHtml = '';
    if (activeFilterTab === 'sniped') {
      contextBannerHtml = `
        <div class="sniped-context-banner" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.4); padding: 12px 18px; border-radius: 8px; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; color: #d8b4fe;">
            <span style="font-size: 1.15rem;">🎯</span>
            <span style="font-size: 0.92rem;">Currently viewing <strong>Watchlist Sniped Deals</strong> (${displayedItems.length} items).</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary" id="exitSniperBannerBtn" style="font-weight: 700; padding: 6px 14px; font-size: 0.82rem;">
            📦 View All Normal Deals (${items.length || deals.length})
          </button>
        </div>
      `;
    } else if (activeFilterTab === 'price_errors') {
      contextBannerHtml = `
        <div class="glitch-context-banner">
          <div style="display: flex; align-items: center; gap: 8px; color: #fca5a5;">
            <span style="font-size: 1.25rem;">🔥</span>
            <span style="font-size: 0.95rem;">Currently viewing <strong>Price Error & Clearance Glitches (80%+ Off)</strong> (${displayedItems.length} deals found).</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary" id="exitGlitchBannerBtn" style="font-weight: 700; padding: 6px 14px; font-size: 0.82rem; background: linear-gradient(135deg, #dc2626, #ea580c); border: none;">
            📦 View All Normal Deals (${items.length || deals.length})
          </button>
        </div>
      `;
    }

    dealsGrid.innerHTML = contextBannerHtml + displayedItems.map(item => {
      const isSaved = savedDeals.some(s => s.asin === item.asin);
      const cleanImg = item.image || 'https://via.placeholder.com/300x200?text=No+Image';
      
      let itemUrl = item.url || item.link || (item.asin ? `https://${activeDomain}/dp/${item.asin}` : '#');
      const itemDomain = itemUrl.startsWith('http') ? (itemUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || activeDomain) : activeDomain;
      const priceObj = formatPriceWithCurrency(item.price, itemDomain, activeCurrency);
      const listPriceObj = formatPriceWithCurrency(item.originalPrice || item.listPrice, itemDomain, activeCurrency);

      const isUsedCondition = item.condition && /used|open box|like new/i.test(item.condition);
      const isWarehouse = (item.store !== 'Normal Amazon') || isUsedCondition;
      // Direct warehouse link to Amazon's All Offers Display so the discounted used offer is opened automatically
      if (isWarehouse && item.asin && !itemUrl.includes('aod=1')) {
        itemUrl += (itemUrl.includes('?') ? '&' : '?') + 'aod=1';
      }
      const storeBadgeClass = isWarehouse ? 'warehouse' : 'normal';
      const storeBadgeText = isWarehouse ? '📦 Warehouse' : '🛒 Brand New';
      const savingsLabelText = isWarehouse ? 'Warehouse Deal' : 'Brand New Deal';

      // Relative timestamp badge (evaluates first listed or price drop date)
      const ts = Math.max(item.firstSeenAt || 0, item.priceDropAt || 0) || dealHistory[item.asin];
      let timeBadgeHtml = '';
      if (ts) {
        const ageMs = now - ts;
        const isDrop = item.priceDropAt && (now - item.priceDropAt <= 86400000);
        const actionPrefix = isDrop ? '🔥 Price Drop' : '🟢 Listed';
        const relText = formatRelativeTime(ts);
        const lastSeen = item.lastSeenAt;
        const scannedText = (lastSeen && (now - lastSeen < ageMs - 300000)) ? ` • Scanned ${formatRelativeTime(lastSeen)}` : '';
        if (ageMs <= 3600000) {
          timeBadgeHtml = `<span class="deal-time-badge fresh-1h" title="${isDrop ? 'Price dropped' : 'First listed'}: ${relText}${scannedText}">${actionPrefix} ${relText}${scannedText}</span>`;
        } else if (ageMs <= 7200000) {
          timeBadgeHtml = `<span class="deal-time-badge recent-2h" title="${isDrop ? 'Price dropped' : 'First listed'}: ${relText}${scannedText}">${isDrop ? '🔥 Price Drop' : '🟡 Listed'} ${relText}${scannedText}</span>`;
        } else if (ageMs <= 86400000) {
          timeBadgeHtml = `<span class="deal-time-badge older" title="${isDrop ? 'Price dropped' : 'First listed'}: ${relText}${scannedText}">${isDrop ? '🔥 Price Drop' : '🕒 Listed'} ${relText}${scannedText}</span>`;
        } else {
          timeBadgeHtml = `<span class="deal-time-badge older" title="${isDrop ? 'Price dropped' : 'First listed'}: ${relText}${scannedText}">${isDrop ? '🔥 Price Drop' : '📦 Listed'} ${relText}${scannedText}</span>`;
        }
      }

      // Price Drop badge
      let priceDropHtml = '';
      if (item.previousPrice) {
        priceDropHtml = `<div class="deal-price-drop-badge">🔥 Price cut from ${escapeHtml(item.previousPrice)}</div>`;
      }

      const discNum = parseInt(item.discountPercent, 10) || 0;
      const isGlitch = discNum >= 80 || item.isPriceError;

      // Dollar savings calculation
      let savingsFormatted = item.savings;
      if (!savingsFormatted && priceObj.numVal && listPriceObj.numVal && listPriceObj.numVal > priceObj.numVal) {
        savingsFormatted = formatCurrencyAmount(listPriceObj.numVal - priceObj.numVal, activeCurrency);
      }

      return `
        <div class="deal-card ${isGlitch ? 'is-glitch' : ''}" data-asin="${item.asin}">
          <div class="card-img-wrap">
            <span class="discount-badge">${item.discountPercent || item.discount || (minDiscountSlider.value + '%+ OFF')}</span>
            <span class="store-badge ${storeBadgeClass}">${storeBadgeText}</span>
            ${isGlitch ? '<span class="badge-glitch-error">🔥 PRICE ERROR</span>' : ''}
            ${item.isJustListed ? '<span class="just-listed-badge">✨ JUST LISTED</span>' : ''}
            ${item.snipedFromTarget ? `<span class="sniper-match-badge" title="Matched Watchlist: ${escapeHtml(item.snipedFromTarget)}">🎯 ${escapeHtml(item.snipedFromTarget)}</span>` : ''}
            ${item.page ? `<span class="page-badge" style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); color: #cbd5e1; font-size: 0.68rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">Pg ${item.page}</span>` : ''}
            <button class="save-btn ${isSaved ? 'active' : ''}" data-asin="${item.asin}" title="Save deal">
              ♥
            </button>
            <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;">
              <img src="${cleanImg}" alt="${escapeHtml(item.title)}" loading="lazy">
            </a>
          </div>
          <div class="card-body">
            ${item.brand ? `<div class="card-brand-header"><span class="badge-brand">⭐ ${escapeHtml(item.brand.toUpperCase())}</span></div>` : ''}
            <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="card-title" title="${escapeHtml(item.title)}" style="text-decoration: none;">
              ${escapeHtml(item.title)}
            </a>
            ${item.condition ? `<div><span class="condition-badge">📦 ${escapeHtml(item.condition)}</span></div>` : ''}
            ${isWarehouse ? `<div class="warehouse-direct-hint" title="Amazon defaults to the brand-new Buy Box. Clicking opens the used/warehouse offers panel.">📦 Direct Link to Warehouse Offer</div>` : ''}
            ${timeBadgeHtml ? `<div>${timeBadgeHtml}</div>` : ''}
            ${priceDropHtml ? `<div>${priceDropHtml}</div>` : ''}
            ${item.rating ? `
              <div class="card-rating">
                <span>★ ${item.rating}</span>
                <span class="reviews-count">(${item.reviews || 'ratings'})</span>
              </div>
            ` : '<div style="height: 18px;"></div>'}
            
            <!-- Hero Pricing Block with Dynamic Slashing Gauge -->
            <div class="card-pricing-block">
              <div class="card-price-row">
                ${(!priceObj.numVal || priceObj.display === 'See Options' || priceObj.display === 'Check Site') ? `
                  <span class="price-options-pill" title="Amazon requires selecting your variant, size, or used buying option on the listing page to see the exact price.">⚡ See Options on Amazon</span>
                ` : `
                  <span class="price-current">${priceObj.display}</span>
                  <div class="price-original-wrap">
                    ${listPriceObj.display && listPriceObj.display !== 'See Options' && listPriceObj.display !== priceObj.display ? `
                      <span class="price-retail-strike">${listPriceObj.display}</span>
                    ` : ''}
                    ${savingsFormatted ? `<span class="price-save-tag">Save ${savingsFormatted}</span>` : ''}
                  </div>
                `}
              </div>

              <!-- Visual Discount Slashing Gauge -->
              ${(discNum > 0 && priceObj.numVal > 0) ? `
                <div class="card-discount-meter" title="${discNum}% Off Retail • Save ${savingsFormatted || ''}">
                  <div class="meter-bar-track">
                    <div class="meter-bar-fill ${discNum >= 80 ? 'glitch-glow' : (discNum >= 50 ? 'deep-glow' : '')}" style="width: ${Math.min(100, Math.max(10, discNum))}%;"></div>
                  </div>
                  <div class="meter-bar-labels">
                    <span class="meter-save">${savingsFormatted ? `Save ${savingsFormatted}` : savingsLabelText}</span>
                    <span class="meter-pct">${discNum}% OFF</span>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Price History Trigger Row -->
            <div class="card-chart-trigger-row">
              <button type="button" class="btn-inspect-chart" data-asin="${item.asin}" title="Inspect Keepa Price History Graph & Historic Lows">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>Price History Graph</span>
              </button>
              <div class="card-verifiers-inline">
                <a href="${getKeepaUrl(item.asin, itemDomain)}" target="_blank" rel="noopener noreferrer" class="micro-verify-link" title="Open Keepa">Keepa ↗</a>
                <a href="${getCamelUrl(item.asin, itemDomain)}" target="_blank" rel="noopener noreferrer" class="micro-verify-link" title="Open CamelCamelCamel">Camel³ ↗</a>
              </div>
            </div>

            <div class="card-actions">
              <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-deal-cta" style="text-decoration: none; flex: 1;">
                <span>View Deal on Amazon ↗</span>
              </a>
              <button type="button" class="btn-card-chart-icon" data-asin="${item.asin}" title="Open Keepa Price History Chart">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </button>
              ${activeFilterTab === 'sniped' ? `
                <button type="button" class="btn btn-sm btn-ghost remove-sniped-btn" data-asin="${item.asin}" title="Dismiss deal from sniped matches" style="color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); padding: 7px 12px;">
                  ✕
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach exit sniper banner listener
    document.getElementById('exitSniperBannerBtn')?.addEventListener('click', () => {
      tabAllDeals?.click();
    });

    // Attach exit price error banner listener
    document.getElementById('exitGlitchBannerBtn')?.addEventListener('click', () => {
      tabAllDeals?.click();
    });

    // Attach card save event listeners
    document.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const asin = e.currentTarget.getAttribute('data-asin');
        toggleSaveDeal(asin);
      });
    });

    // Attach inspect price chart listeners
    document.querySelectorAll('.btn-inspect-chart, .btn-card-chart-icon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const asin = e.currentTarget.getAttribute('data-asin');
        openPriceHistoryModal(asin);
      });
    });

    // Attach dismiss sniped deal listeners
    document.querySelectorAll('.remove-sniped-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const asin = e.currentTarget.getAttribute('data-asin');
        snipedDeals = snipedDeals.filter(d => d.asin !== asin);
        if (countSnipedDeals) countSnipedDeals.textContent = snipedDeals.length;
        renderDeals(snipedDeals);
        try {
          await fetch(`/api/sniped/${asin}`, { method: 'DELETE' });
        } catch (err) {}
        showToast('Dismissed deal from sniped matches');
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

  // -------------------------------------------------------------
  // DATABASE & HOURLY CRAWLER CLIENT FUNCTIONS
  // -------------------------------------------------------------
  function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diffMs = now - timestamp;
    if (diffMs < 0) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async function updateDatabaseStatus() {
    try {
      const res = await fetch('/api/db/status');
      if (!res.ok) return;
      const data = await res.json();
      const crawler = data.crawler || {};
      const totalDeals = data.totalDeals || 0;

      if (dbTotalDealsCount) {
        const wh = data.warehouseDeals || 0;
        const norm = data.normalDeals || 0;
        dbTotalDealsCount.textContent = `${totalDeals.toLocaleString()} (${wh.toLocaleString()} Warehouse • ${norm.toLocaleString()} Normal Retail)`;
        const cStoreWh = document.getElementById('countStoreWarehouse');
        const cStoreNorm = document.getElementById('countStoreNormal');
        const cStoreBoth = document.getElementById('countStoreBoth');
        if (cStoreWh) cStoreWh.textContent = `(${wh.toLocaleString()})`;
        if (cStoreNorm) cStoreNorm.textContent = `(${norm.toLocaleString()})`;
        if (cStoreBoth) cStoreBoth.textContent = `(${totalDeals.toLocaleString()})`;
      }

      if (crawler.isRunning) {
        if (dbPulseDot) {
          dbPulseDot.style.background = '#f59e0b';
          dbPulseDot.style.boxShadow = '0 0 8px #f59e0b';
        }
        if (dbLastScanText) dbLastScanText.textContent = `⚡ Running: ${crawler.currentStep || 'Scanning...'}`;
        if (dbNextScanText) dbNextScanText.textContent = 'In progress';
        if (dbScanNowBtn) {
          dbScanNowBtn.classList.add('scanning');
          if (dbScanLabel) dbScanLabel.textContent = 'Scanning...';
        }
      } else {
        if (dbPulseDot) {
          dbPulseDot.style.background = '#10b981';
          dbPulseDot.style.boxShadow = '0 0 8px #10b981';
        }
        if (dbLastScanText) {
          const stats = crawler.lastRunStats || {};
          let scanDetails = '';
          if (stats.pagesScanned || stats.totalScanned) {
            const pCount = stats.pagesScanned || Math.round((stats.totalScanned || 0) / 28);
            scanDetails = ` (${pCount} pages • ${(stats.totalScanned || 0).toLocaleString()} items scanned across 12 depts)`;
          }
          dbLastScanText.textContent = crawler.lastRunAt
            ? `Last Auto-Scan: ${formatRelativeTime(crawler.lastRunAt)}${scanDetails}`
            : 'Last Auto-Scan: initializing...';
        }
        if (dbNextScanText) {
          if (crawler.nextRunAt) {
            const minsLeft = Math.max(0, Math.round((crawler.nextRunAt - Date.now()) / 60000));
            dbNextScanText.textContent = `Next scan in: ${minsLeft}m`;
          } else {
            dbNextScanText.textContent = 'Next scan in: 60m';
          }
        }
        if (dbScanNowBtn) {
          dbScanNowBtn.classList.remove('scanning');
          if (dbScanLabel) dbScanLabel.textContent = 'Quick Scan (50+ Pgs)';
        }
        if (dbDeepScanBtn) {
          dbDeepScanBtn.style.opacity = '1';
          if (dbDeepScanLabel) dbDeepScanLabel.textContent = 'Deep Search to Database (70+ Pages)';
        }
      }
    } catch (e) {}
  }

  async function loadDatabaseDeals(keepCurrentTab = false, isLoadMore = false, isLoadAll = false) {
    try {
      if (!isLoadMore) {
        dbCurrentPage = 1;
        if (!keepCurrentTab) {
          resetToAllDealsTab();
        }
        renderSkeletons();
        if (searchBtn) {
          searchBtn.disabled = true;
          searchBtn.style.opacity = '0.75';
        }
      }
      const activeStore = storeType || 'both';
      const rawCategory = categorySelect ? categorySelect.value : 'all';
      const categoryParam = (rawCategory === 'sweep_all') ? 'sweep_all' : rawCategory;
      const kw = keywordInput ? keywordInput.value.trim() : '';
      const minDisc = minDiscountSlider ? minDiscountSlider.value : 0;
      const maxDisc = maxDiscountSlider ? maxDiscountSlider.value : 100;
      const minP = minPriceInput ? (parseFloat(minPriceInput.value) || 0) : 0;
      const maxP = maxPriceInput ? (parseFloat(maxPriceInput.value) || 0) : 0;
      const cond = conditionSelect ? conditionSelect.value : 'all';
      const negKw = negKeywordsInput ? negKeywordsInput.value.trim() : '';
      const sort = sortSelect ? sortSelect.value : 'date-desc-rank';

      if (isLoadMore && loadMoreBtn) {
        loadMoreBtn.textContent = '⏳ Loading More Deals...';
      }
      if (isLoadAll && loadAllDbDealsBtn) {
        loadAllDbDealsBtn.textContent = '⏳ Loading All Deals...';
      }

      const queryLimit = isLoadAll ? '10000' : DB_PAGE_SIZE.toString();
      const queryPage = isLoadAll ? '1' : dbCurrentPage.toString();

      const inStock = inStockOnly ? inStockOnly.checked : true;
      const timeWin = (activeFilterTab === 'just_listed') ? (activeTimeWindow || '24h') : 'all';

      const isMultiCat = (categoryParam === 'sweep_all' || categoryParam === 'all');

      const queryParams = new URLSearchParams({
        timeWindow: timeWin,
        page: queryPage,
        limit: queryLimit,
        storeType: activeStore,
        category: categoryParam,
        keyword: kw,
        minDiscount: minDisc,
        maxDiscount: maxDisc,
        minPrice: minP,
        maxPrice: maxP,
        condition: cond,
        negKeywords: negKw,
        sort: sort,
        availableOnly: inStock.toString()
      });

      if (isMultiCat && excludedCategories && excludedCategories.size > 0) {
        queryParams.set('excludeCategories', Array.from(excludedCategories).join(','));
      }

      if (activeFilterTab === 'price_errors') {
        queryParams.set('priceErrorsOnly', 'true');
        queryParams.set('minDiscount', Math.max(80, parseInt(minDisc, 10) || 80).toString());
      } else if (activeFilterTab === 'top_brands') {
        queryParams.set('brandsOnly', 'true');
      }

      if (hideAccessories) {
        queryParams.set('hideAccessories', 'true');
      }

      const res = await fetch(`/api/db/deals?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        dbTotalMatches = data.total || 0;
        let newProducts = data.products || [];
        // Strictly filter out any items with no confirmed price
        newProducts = newProducts.filter(d => d.numericPrice && d.numericPrice > 0 && d.price !== 'See Options' && d.price !== 'Check Site');
        if (isMultiCat && excludedCategories && excludedCategories.size > 0) {
          newProducts = newProducts.filter(d => !isCategoryExcluded(d.category, d.title, d.asin));
        }

        if (isLoadMore) {
          const seen = new Set(deals.map(d => d.asin));
          for (const d of newProducts) {
            if (!seen.has(d.asin)) {
              tagNewDealStatus(d);
              deals.push(d);
              seen.add(d.asin);
            }
          }
        } else {
          deals = newProducts;
          for (const d of deals) {
            tagNewDealStatus(d);
          }
        }
        localStorage.setItem(HISTORY_KEY, JSON.stringify(dealHistory));

        if (deals.length > 0) {
          renderDeals(deals, dbTotalMatches, data.stats);
          if (loadMoreContainer) {
            const hasMore = deals.length < dbTotalMatches && !isLoadAll;
            loadMoreContainer.style.display = hasMore ? 'flex' : 'none';
            if (hasMore) {
              const remaining = dbTotalMatches - deals.length;
              if (loadMoreBtn) {
                loadMoreBtn.textContent = `⬇️ Load More Deals (${deals.length.toLocaleString()} of ${dbTotalMatches.toLocaleString()} displayed • +${Math.min(remaining, DB_PAGE_SIZE)} more)`;
              }
              if (loadAllDbDealsBtn) {
                loadAllDbDealsBtn.textContent = `⚡ Load All ${dbTotalMatches.toLocaleString()} Deals Into View`;
              }
            }
          }
        } else {
          // Update live stat numbers across all pills from backend database stats
          if (data.stats) {
            if (count1h) count1h.textContent = data.stats.last1h || 0;
            if (count2h) count2h.textContent = data.stats.last2h || 0;
            if (count6h) count6h.textContent = data.stats.last6h || 0;
            if (count12h) count12h.textContent = data.stats.last12h || 0;
            if (count24h) count24h.textContent = data.stats.last24h || 0;
            if (countPriceErrors) countPriceErrors.textContent = data.stats.priceErrors !== undefined ? data.stats.priceErrors : 0;
            if (countTopBrands) countTopBrands.textContent = (data.stats.topBrands || 0).toLocaleString();
            if (countJustListed) countJustListed.textContent = data.stats.last24h || data.stats.last6h || 0;
            if (countAllDeals) countAllDeals.textContent = (storeType === 'warehouse' ? data.stats.warehouseDeals : (storeType === 'normal' ? data.stats.normalDeals : data.stats.totalInDb)) || 0;
          }
          if (activeFilterTab === 'just_listed') {
            renderJustListedEmptyState(timeWin, data.stats?.totalInDb || 0);
          } else {
            renderDatabaseEmptyState(kw, data.stats?.totalInDb || 0);
          }
          if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        }
      } else {
        console.error('Database query returned non-200 status:', res.status);
        showToast('⚠️ Could not load database deals');
      }
    } catch (e) {
      console.warn('Error loading database deals:', e);
      showToast('⚠️ Could not load database deals');
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.style.opacity = '1';
      }
      updateDatabaseStatus();
    }
  }

  function renderJustListedEmptyState(timeWindow, totalInDb) {
    resultsMeta.style.display = 'flex';
    const windowLabels = { '1h': 'Last 1 Hour', '2h': 'Last 2 Hours', '6h': 'Last 6 Hours', '12h': 'Last 12 Hours', '24h': 'Last 24 Hours', 'all': 'History' };
    const winLabel = windowLabels[timeWindow] || timeWindow;
    resultsCount.textContent = `0 Deals Discovered (${winLabel})`;
    filterSummaryBadge.textContent = `✨ Just Listed (${winLabel})`;

    dealsGrid.innerHTML = `
      <div class="empty-state card" style="grid-column: 1 / -1;">
        <div class="empty-icon">✨</div>
        <h3>No Deals Discovered in ${winLabel}</h3>
        <p>No new deals were discovered in this specific time window. The database currently contains <strong>${totalInDb.toLocaleString()} indexed deals</strong> across all categories.</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="switchTo24hBtn">🕒 Show Last 24 Hours</button>
          <button class="btn btn-primary" id="switchToAllDbDealsBtn">📦 View All ${totalInDb.toLocaleString()} Deals in Database</button>
        </div>
      </div>
    `;
    document.getElementById('switchTo24hBtn')?.addEventListener('click', () => {
      const p24 = document.querySelector('.time-pill[data-time="24h"]');
      if (p24) p24.click();
    });
    document.getElementById('switchToAllDbDealsBtn')?.addEventListener('click', () => {
      tabAllDeals?.click();
    });
  }

  function renderDatabaseEmptyState(keyword, totalInDb) {
    resultsMeta.style.display = 'flex';
    const storeLabel = storeType === 'warehouse' ? '📦 Warehouse' : (storeType === 'normal' ? '🛒 Normal Amazon' : '⚡ All Stores');
    let catClean = categorySelect.options[categorySelect.selectedIndex]?.text || 'All';
    if (categorySelect.value === 'sweep_all' || categorySelect.value === 'all') {
      const exCount = excludedCategories ? excludedCategories.size : 0;
      catClean = exCount > 0 ? `All Categories (${exCount} Excluded)` : 'All Categories';
    } else {
      catClean = catClean.replace(/\s*\(.*?\)/, '');
    }

    resultsCount.textContent = `0 Deals Found in Database`;
    filterSummaryBadge.textContent = `${storeLabel} • ${catClean} (${minDiscountSlider.value}%–${maxDiscountSlider.value}% off)`;

    dealsGrid.innerHTML = `
      <div class="empty-state card" style="grid-column: 1 / -1;">
        <div class="empty-icon">🔎</div>
        <h3>No Deals Match Current Filters</h3>
        <p>No indexed deals matched this specific filter (${storeLabel} • ${catClean} • ${minDiscountSlider.value}%–${maxDiscountSlider.value}% off${keyword ? ` • "${escapeHtml(keyword)}"` : ''}).<br>
        The database currently contains <strong>${totalInDb.toLocaleString()} active deals</strong> across all categories!</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap;">
          <button class="btn btn-primary" id="resetDbFiltersBtn">⚡ View All Deals in Database (${totalInDb.toLocaleString()})</button>
          <button class="btn btn-secondary" id="widenDiscountBtn">🏷️ Broaden Discount to 20%–99%</button>
          <button class="btn btn-ghost" id="runLiveScrapeFallbackBtn">🌐 Search Live Online (Amazon)</button>
        </div>
      </div>
    `;
    document.getElementById('resetDbFiltersBtn')?.addEventListener('click', () => {
      if (keywordInput) keywordInput.value = '';
      if (minDiscountSlider) minDiscountSlider.value = 20;
      if (maxDiscountSlider) maxDiscountSlider.value = 99;
      syncDiscountUI();
      if (categorySelect) categorySelect.value = 'sweep_all';
      storeType = 'both';
      storePills.forEach(p => {
        if (p.getAttribute('data-store') === 'both') p.classList.add('active');
        else p.classList.remove('active');
      });
      updateTargetUrl();
      resetToAllDealsTab();
      loadDatabaseDeals(false);
    });
    document.getElementById('widenDiscountBtn')?.addEventListener('click', () => {
      if (minDiscountSlider) minDiscountSlider.value = 20;
      if (maxDiscountSlider) maxDiscountSlider.value = 99;
      syncDiscountUI();
      updateTargetUrl();
      resetToAllDealsTab();
      loadDatabaseDeals(false);
    });
    document.getElementById('runLiveScrapeFallbackBtn')?.addEventListener('click', () => {
      executeSearch(false);
    });
  }

  // Deep Scan Button Handler (150+ Pages into database)
  const dbDeepScanBtn = document.getElementById('dbDeepScanBtn');
  const dbDeepScanLabel = document.getElementById('dbDeepScanLabel');
  if (dbDeepScanBtn) {
    dbDeepScanBtn.addEventListener('click', async () => {
      resetToAllDealsTab();
      showToast('⚡ Starting full DEEP SEARCH across all 18 departments (150+ pages directly into database)...');
      if (dbDeepScanBtn) dbDeepScanBtn.style.opacity = '0.6';
      if (dbDeepScanLabel) dbDeepScanLabel.textContent = 'Deep Sweeping 150+ Pgs...';
      try {
        const res = await fetch('/api/db/scan?deep=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deep: true, pages: 8 })
        });
        const data = await res.json();
        if (data.message) showToast(data.message);
        updateDatabaseStatus();
        setTimeout(loadDatabaseDeals, 4000);
      } catch (e) {
        showToast('Error triggering deep scan');
      }
    });
  }

  // Scan Now Button Handler
  if (dbScanNowBtn) {
    dbScanNowBtn.addEventListener('click', async () => {
      resetToAllDealsTab();
      if (dbScanNowBtn) dbScanNowBtn.classList.add('scanning');
      if (dbScanLabel) dbScanLabel.textContent = 'Starting...';
      try {
        const res = await fetch('/api/db/scan', { method: 'POST' });
        const data = await res.json();
        if (data.message) showToast(data.message);
        updateDatabaseStatus();
        setTimeout(loadDatabaseDeals, 4000);
      } catch (e) {
        showToast('Error triggering scan');
      }
    });
  }

  // ========================================================
  // 📈 PRICE HISTORY & KEEPA TRACKER MODAL
  // ========================================================
  const priceHistoryModal = document.getElementById('priceHistoryModal');
  const closePriceHistoryModalBtn = document.getElementById('closePriceHistoryModalBtn');

  function openPriceHistoryModal(asin) {
    if (!asin) return;
    const item = (deals || []).find(d => d.asin === asin) ||
                 (snipedDeals || []).find(d => d.asin === asin) ||
                 (savedDeals || []).find(d => d.asin === asin);
    if (!item || !priceHistoryModal) return;

    const activeDomain = domainSelect ? domainSelect.value : 'amazon.com.au';
    const activeCurrency = currencySelect ? currencySelect.value : 'AUD';
    let itemUrl = item.url || item.link || (item.asin ? `https://${activeDomain}/dp/${item.asin}` : '#');
    const itemDomain = itemUrl.startsWith('http') ? (itemUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || activeDomain) : activeDomain;

    const priceObj = formatPriceWithCurrency(item.price, itemDomain, activeCurrency);
    const listPriceObj = formatPriceWithCurrency(item.originalPrice || item.listPrice, itemDomain, activeCurrency);
    const discNum = parseInt(item.discountPercent, 10) || 0;

    let savingsText = item.savings;
    if (!savingsText && priceObj.numVal && listPriceObj.numVal && listPriceObj.numVal > priceObj.numVal) {
      savingsText = formatCurrencyAmount(listPriceObj.numVal - priceObj.numVal, activeCurrency);
    }

    const isUsed = item.condition && /used|open box|like new/i.test(item.condition);
    const isWarehouse = (item.store !== 'Normal Amazon') || isUsed;
    if (isWarehouse && item.asin && !itemUrl.includes('aod=1')) {
      itemUrl += (itemUrl.includes('?') ? '&' : '?') + 'aod=1';
    }

    // Populate modal DOM
    const pmTitle = document.getElementById('pmTitle');
    if (pmTitle) pmTitle.textContent = item.title;

    const pmImage = document.getElementById('pmImage');
    if (pmImage) pmImage.src = item.image || 'https://via.placeholder.com/300x200?text=No+Image';

    const pmStoreBadge = document.getElementById('pmStoreBadge');
    if (pmStoreBadge) {
      pmStoreBadge.textContent = isWarehouse ? '📦 Amazon Warehouse' : '🛒 Normal Amazon';
      pmStoreBadge.className = `pm-badge ${isWarehouse ? 'warehouse' : 'normal'}`;
    }

    const pmConditionBadge = document.getElementById('pmConditionBadge');
    if (pmConditionBadge) {
      pmConditionBadge.textContent = item.condition || (isWarehouse ? 'Open-Box / Used' : 'Brand New Clearance');
    }

    const pmDiscountBadge = document.getElementById('pmDiscountBadge');
    if (pmDiscountBadge) {
      pmDiscountBadge.textContent = discNum > 0 ? `${discNum}% OFF` : (item.discountPercent || 'DEAL');
    }

    const pmPrice = document.getElementById('pmPrice');
    if (pmPrice) pmPrice.textContent = priceObj.display;

    const pmRetail = document.getElementById('pmRetail');
    if (pmRetail) pmRetail.textContent = (listPriceObj.display && listPriceObj.display !== 'See Options') ? listPriceObj.display : 'Unknown Retail';

    const pmSavings = document.getElementById('pmSavings');
    if (pmSavings) pmSavings.textContent = savingsText ? `Save ${savingsText}` : (discNum > 0 ? `${discNum}% Slashed` : 'Clearance Deal');

    const pmGaugeBar = document.getElementById('pmGaugeBar');
    if (pmGaugeBar) pmGaugeBar.style.width = `${Math.min(100, Math.max(10, discNum))}%`;

    const pmGaugeText = document.getElementById('pmGaugeText');
    if (pmGaugeText) pmGaugeText.textContent = `${discNum}% Slashed Below Retail ${savingsText ? `• Save ${savingsText}` : ''}`;

    // Keepa graph
    const tldMap = {
      'amazon.com.au': 'com.au',
      'amazon.com': 'com',
      'amazon.co.uk': 'co.uk',
      'amazon.de': 'de',
      'amazon.ca': 'ca',
      'amazon.co.jp': 'co.jp'
    };
    const tld = tldMap[itemDomain] || 'com.au';
    const keepaGraphUrl = `https://graph.keepa.com/pricehistory.png?asin=${item.asin}&domain=${tld}&amazon=1&new=1&used=1`;

    const pmKeepaGraph = document.getElementById('pmKeepaGraph');
    const pmGraphLoader = document.getElementById('pmGraphLoader');
    const pmGraphFallback = document.getElementById('pmGraphFallback');

    if (pmGraphFallback) pmGraphFallback.style.display = 'none';
    if (pmGraphLoader) pmGraphLoader.style.display = 'flex';
    if (pmKeepaGraph) {
      pmKeepaGraph.style.display = 'none';
      pmKeepaGraph.onload = () => {
        if (pmGraphLoader) pmGraphLoader.style.display = 'none';
        pmKeepaGraph.style.display = 'block';
      };
      pmKeepaGraph.onerror = () => {
        if (pmGraphLoader) pmGraphLoader.style.display = 'none';
        if (pmGraphFallback) pmGraphFallback.style.display = 'block';
      };
      pmKeepaGraph.src = keepaGraphUrl;
    }

    // Verifiers
    const pmCamelLink = document.getElementById('pmCamelLink');
    if (pmCamelLink) pmCamelLink.href = getCamelUrl(item.asin, itemDomain);

    const pmKeepaLink = document.getElementById('pmKeepaLink');
    if (pmKeepaLink) pmKeepaLink.href = getKeepaUrl(item.asin, itemDomain);

    const pmOzBargainLink = document.getElementById('pmOzBargainLink');
    if (pmOzBargainLink) pmOzBargainLink.href = getOzBargainUrl(item.title);

    const pmAmazonDirectBtn = document.getElementById('pmAmazonDirectBtn');
    if (pmAmazonDirectBtn) pmAmazonDirectBtn.href = itemUrl;

    priceHistoryModal.style.display = 'flex';
  }

  function closePriceHistoryModal() {
    if (priceHistoryModal) priceHistoryModal.style.display = 'none';
  }

  if (closePriceHistoryModalBtn) {
    closePriceHistoryModalBtn.addEventListener('click', closePriceHistoryModal);
  }

  if (priceHistoryModal) {
    priceHistoryModal.addEventListener('click', (e) => {
      if (e.target === priceHistoryModal) closePriceHistoryModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePriceHistoryModal();
      const analyticsPanel = document.getElementById('analyticsDashboard');
      if (analyticsPanel && analyticsPanel.style.display !== 'none') {
        analyticsPanel.style.display = 'none';
      }
    }
  });

  // ========================================================
  // 📊 MARKET INTELLIGENCE & CHARTS DASHBOARD
  // ========================================================
  let marketAnalyticsData = null;
  let discountChartInstance = null;
  let categoryChartInstance = null;
  let storeSplitChartInstance = null;

  async function fetchMarketAnalytics() {
    try {
      const res = await fetch('/api/db/analytics');
      if (!res.ok) return null;
      marketAnalyticsData = await res.json();
      return marketAnalyticsData;
    } catch (e) {
      console.warn('[Analytics] Error:', e);
      return null;
    }
  }

  function updateKpiCards(data) {
    if (!data) return;
    const kpiTotalDeals = document.getElementById('kpiTotalDeals');
    const kpiStoreSplit = document.getElementById('kpiStoreSplit');
    const kpiAvgDiscount = document.getElementById('kpiAvgDiscount');
    const kpiPriceErrors = document.getElementById('kpiPriceErrors');
    const kpiMaxSavings = document.getElementById('kpiMaxSavings');
    const kpiMaxSavingsSub = document.getElementById('kpiMaxSavingsSub');

    if (kpiTotalDeals) kpiTotalDeals.textContent = (data.totalDeals || 0).toLocaleString();
    if (kpiStoreSplit) kpiStoreSplit.textContent = `${(data.warehouseDeals || 0).toLocaleString()} Warehouse • ${(data.normalDeals || 0).toLocaleString()} Normal`;
    if (kpiAvgDiscount) kpiAvgDiscount.textContent = `${data.avgDiscount || 0}% OFF`;
    if (kpiPriceErrors) kpiPriceErrors.textContent = `${data.priceErrors || 0} Glitches`;
    if (kpiMaxSavings) kpiMaxSavings.textContent = `$${(data.maxSavings || 0).toLocaleString()}`;
    if (kpiMaxSavingsSub && data.maxSavingsDeal) {
      kpiMaxSavingsSub.textContent = `On ${data.maxSavingsDeal.title.substring(0, 32)}...`;
    }
  }

  function renderAnalyticsCharts(data) {
    if (!data) return;
    updateKpiCards(data);

    if (typeof Chart === 'undefined') {
      console.warn('[Chart.js] Chart library not loaded yet');
      return;
    }

    // 1. Discount Depth Histogram
    const discountCanvas = document.getElementById('discountChart');
    if (discountCanvas) {
      const tiers = data.discountTiers || {};
      const labels = Object.keys(tiers);
      const counts = Object.values(tiers);

      if (discountChartInstance) discountChartInstance.destroy();

      const ctx = discountCanvas.getContext('2d');
      const gradEmerald = ctx.createLinearGradient(0, 0, 0, 200);
      gradEmerald.addColorStop(0, '#10b981');
      gradEmerald.addColorStop(1, '#059669');

      const gradAmber = ctx.createLinearGradient(0, 0, 0, 200);
      gradAmber.addColorStop(0, '#f59e0b');
      gradAmber.addColorStop(1, '#d97706');

      const gradOrange = ctx.createLinearGradient(0, 0, 0, 200);
      gradOrange.addColorStop(0, '#ea580c');
      gradOrange.addColorStop(1, '#c2410c');

      const gradRed = ctx.createLinearGradient(0, 0, 0, 200);
      gradRed.addColorStop(0, '#f43f5e');
      gradRed.addColorStop(1, '#be123c');

      discountChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Deals Count',
            data: counts,
            backgroundColor: [gradEmerald, gradAmber, gradOrange, gradRed],
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              titleFont: { family: "'Plus Jakarta Sans', sans-serif", weight: 'bold' },
              bodyFont: { family: "'JetBrains Mono', monospace" },
              callbacks: {
                label: (item) => ` ${item.formattedValue} deals available (Click to filter)`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace" } }
            }
          },
          onClick: (evt, elements) => {
            if (!elements || elements.length === 0) return;
            const idx = elements[0].index;
            const clickedLabel = labels[idx];
            if (clickedLabel.includes('20-39')) {
              minDiscountSlider.value = 20;
              maxDiscountSlider.value = 39;
            } else if (clickedLabel.includes('40-59')) {
              minDiscountSlider.value = 40;
              maxDiscountSlider.value = 59;
            } else if (clickedLabel.includes('60-79')) {
              minDiscountSlider.value = 60;
              maxDiscountSlider.value = 79;
            } else if (clickedLabel.includes('80%+')) {
              tabPriceErrors?.click();
              return;
            }
            syncDiscountUI();
            resetToAllDealsTab();
            loadDatabaseDeals(true);
            document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    // 2. Top Clearance Departments
    const categoryCanvas = document.getElementById('categoryChart');
    if (categoryCanvas) {
      const cats = data.categories || {};
      const sortedCats = Object.entries(cats)
        .filter(([k]) => k !== 'all' && k !== 'sweep_all')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

      const catLabels = sortedCats.map(([k]) => {
        const opt = Array.from(categorySelect.options).find(o => o.value === k);
        return opt ? opt.text.replace(/\s*\(.*?\)/, '').trim() : k;
      });
      const catKeys = sortedCats.map(([k]) => k);
      const catCounts = sortedCats.map(([, v]) => v);

      if (categoryChartInstance) categoryChartInstance.destroy();

      const ctx = categoryCanvas.getContext('2d');
      categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: catLabels,
          datasets: [{
            data: catCounts,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            hoverBackgroundColor: '#60a5fa',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              titleFont: { family: "'Plus Jakarta Sans', sans-serif" },
              bodyFont: { family: "'JetBrains Mono', monospace" },
              callbacks: {
                label: (item) => ` ${item.formattedValue} deals in department (Click to select)`
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace" } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#cbd5e1', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' } }
            }
          },
          onClick: (evt, elements) => {
            if (!elements || elements.length === 0) return;
            const idx = elements[0].index;
            const clickedKey = catKeys[idx];
            if (clickedKey && categorySelect) {
              categorySelect.value = clickedKey;
              syncFormStateToUrl();
              resetToAllDealsTab();
              loadDatabaseDeals(true);
              document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      });
    }

    // 3. Store Split Chart (Donut)
    const storeCanvas = document.getElementById('storeSplitChart');
    if (storeCanvas) {
      if (storeSplitChartInstance) storeSplitChartInstance.destroy();

      const ctx = storeCanvas.getContext('2d');
      storeSplitChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Warehouse (Open-Box)', 'Normal Amazon (Clearance)'],
          datasets: [{
            data: [data.warehouseDeals || 0, data.normalDeals || 0],
            backgroundColor: ['#10b981', '#8b5cf6'],
            hoverBackgroundColor: ['#34d399', '#a78bfa'],
            borderWidth: 2,
            borderColor: '#0e1320'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#cbd5e1', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' }, boxWidth: 12 }
            },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              callbacks: {
                label: (item) => ` ${item.label}: ${item.formattedValue} deals`
              }
            }
          }
        }
      });
    }
  }

  async function toggleAnalyticsDashboard(forceOpen = null) {
    const panel = document.getElementById('analyticsDashboard');
    if (!panel) return;
    const isCurrentlyOpen = panel.style.display !== 'none';
    const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

    if (shouldOpen) {
      panel.style.display = 'block';
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const data = await fetchMarketAnalytics();
      if (data) renderAnalyticsCharts(data);
    } else {
      panel.style.display = 'none';
    }
  }

  // Attach Analytics Toggles
  const toggleAnalyticsBtn = document.getElementById('toggleAnalyticsBtn');
  if (toggleAnalyticsBtn) {
    toggleAnalyticsBtn.addEventListener('click', () => toggleAnalyticsDashboard());
  }

  const dbAnalyticsBtn = document.getElementById('dbAnalyticsBtn');
  if (dbAnalyticsBtn) {
    dbAnalyticsBtn.addEventListener('click', () => toggleAnalyticsDashboard(true));
  }

  const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
  if (closeAnalyticsBtn) {
    closeAnalyticsBtn.addEventListener('click', () => toggleAnalyticsDashboard(false));
  }

  // Poll database status every 15 seconds
  setInterval(updateDatabaseStatus, 15000);
});
