/**
 * MuskUnits Core Module
 * Shared state, utilities, and formatting functions used across all tabs.
 * 
 * @module core
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================

/**
 * Application state object - shared across all modules
 */
const MU = {
  // Data
  elonNetWorth: 0,
  allAssets: [],
  holdersData: null,
  goldData: null,
  debtRatioData: null,
  interestData: null,
  
  // Gold price (updated from API, default ~$95M per tonne)
  goldPricePerTonne: 95000000,
  
  // Chart instances (for cleanup)
  charts: {
    holders: null,
    gold: null,
    debt: null,
    interest: null
  }
};

// Elon face image HTML
const ELON_FACE = '<img class="elon-icon" src="img/elon.png" alt="Elon">';

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format a number as Musk Units with Elon face icon
 * @param {number} num - Value in Musk Units
 * @returns {string} Formatted MU string with icon
 */
function formatElons(num) {
  if (num === null || num === undefined) return '-';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + ELON_FACE;
  if (num >= 100) return num.toFixed(1) + ' ' + ELON_FACE;
  if (num >= 10) return num.toFixed(2) + ' ' + ELON_FACE;
  if (num >= 1) return num.toFixed(2) + ' ' + ELON_FACE;
  if (num >= 0.01) return num.toFixed(3) + ' ' + ELON_FACE;
  return num.toFixed(4) + ' ' + ELON_FACE;
}

/**
 * Format a number as USD currency (compact: T/B/M)
 * @param {number} num - Value in USD
 * @returns {string} Formatted currency string
 */
function formatCurrency(num) {
  if (num === null || num === undefined) return '-';
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(0) + 'M';
  return '$' + num.toLocaleString();
}

/**
 * Format a price value with appropriate decimal places
 * @param {number} num - Price in USD
 * @returns {string} Formatted price string
 */
function formatPrice(num) {
  if (num === null || num === undefined || num === 0) return '-';
  if (num >= 1000) return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (num >= 1) return '$' + num.toFixed(2);
  if (num >= 0.01) return '$' + num.toFixed(4);
  return '$' + num.toFixed(6);
}

/**
 * Format a number as percentage with sign
 * @param {number} num - Percentage value
 * @returns {string} Formatted percentage string
 */
function formatPercent(num) {
  if (num === null || num === undefined) return '-';
  const sign = num > 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

/**
 * Format Musk Units (plain text, no icon)
 * @param {number} mu - Value in Musk Units
 * @returns {string} Formatted MU string
 */
function formatMU(mu) {
  if (mu >= 1000) return mu.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (mu >= 1) return mu.toFixed(2);
  if (mu >= 0.001) return mu.toFixed(5);
  if (mu >= 0.0000001) return mu.toFixed(8);
  return mu.toExponential(2);
}

// =============================================================================
// TAB NAVIGATION
// =============================================================================

/**
 * Valid tab names for URL routing
 */
const VALID_TABS = ['index', 'debt', 'holders', 'gold', 'calculator'];

/**
 * Switch to a specific tab
 * @param {string} tabName - Name of tab to switch to
 * @param {boolean} [updateHash=true] - Whether to update URL hash
 */
function switchTab(tabName, updateHash = true) {
  // Update button states
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update URL hash for shareable links
  if (updateHash) {
    history.pushState(null, '', '#' + tabName);
  }
  
  // Show/hide tab content
  document.getElementById('index-tab').style.display = tabName === 'index' ? 'block' : 'none';
  document.getElementById('holders-tab').style.display = tabName === 'holders' ? 'block' : 'none';
  document.getElementById('gold-tab').style.display = tabName === 'gold' ? 'block' : 'none';
  document.getElementById('debt-tab').style.display = tabName === 'debt' ? 'block' : 'none';
  document.getElementById('calculator-tab').style.display = tabName === 'calculator' ? 'block' : 'none';
  
  // Trigger tab-specific initialization
  if (tabName === 'calculator' && typeof initCalculatorTab === 'function') {
    initCalculatorTab();
  }
  if (tabName === 'debt' && typeof initDebtTab === 'function') {
    initDebtTab();
  }
  if (tabName === 'holders' && typeof initHoldersTab === 'function') {
    initHoldersTab();
  }
  if (tabName === 'gold' && typeof initGoldTab === 'function') {
    initGoldTab();
  }
}

/**
 * Get tab name from current URL hash
 * @returns {string} Valid tab name (defaults to 'index')
 */
function getTabFromHash() {
  const hash = window.location.hash.slice(1);
  return VALID_TABS.includes(hash) ? hash : 'index';
}

// =============================================================================
// CHART UTILITIES
// =============================================================================

/**
 * Common Chart.js options for consistent styling
 */
const CHART_DEFAULTS = {
  colors: {
    orange: '#ff6600',
    amber: '#ffb000',
    red: '#ff3b3b',
    green: '#00ff41',
    blue: '#4da6ff',
    gold: '#ffd700',
    grid: '#2a2a2a',
    text: '#737373',
    bg: '#1a1a1a'
  },
  
  /**
   * Get base chart options
   * @param {string} accentColor - Primary color for the chart
   * @returns {object} Chart.js options object
   */
  getBaseOptions(accentColor) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: this.colors.bg,
          titleColor: accentColor,
          bodyColor: '#f5f5f5',
          borderColor: accentColor,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: this.colors.grid, drawBorder: false },
          ticks: { 
            color: this.colors.text, 
            font: { size: 10 },
            maxRotation: 0
          }
        },
        y: {
          grid: { color: this.colors.grid, drawBorder: false },
          ticks: { color: this.colors.text }
        }
      }
    };
  }
};

// =============================================================================
// DATA MAPPINGS
// =============================================================================

/**
 * Map gold country names to Treasury country names
 * Used for overlaying Treasury holdings on Gold chart
 */
const GOLD_TO_TREASURY_MAP = {
  'China': 'China, Mainland',
  'Russian Federation': 'Russia',
  'India': 'India',
  'Brazil': 'Brazil',
  'South Africa': 'South Africa',
  'Saudi Arabia': 'Saudi Arabia',
  'United Arab Emirates': 'United Arab Emirates',
  'Egypt': 'Egypt',
  'United States of America': null, // US doesn't hold its own treasuries
  'Germany': 'Germany',
  'France': 'France',
  'Italy': 'Italy',
  'Switzerland': 'Switzerland',
  'Japan': 'Japan',
  'Netherlands': 'Netherlands',
  'Turkey': 'Turkey',
  'Poland': 'Poland',
  'United Kingdom': 'United Kingdom',
  'Taiwan, China': 'Taiwan'
};

/**
 * BRICS+ member countries (gold data naming)
 */
const BRICS_COUNTRIES = [
  'Brazil', 'Russian Federation', 'India', 'China', 'South Africa',
  'Egypt', 'United Arab Emirates', 'Saudi Arabia'
];

/**
 * BRICS+ member countries (Treasury data naming)
 */
const BRICS_TREASURY_COUNTRIES = [
  'Brazil', 'Russia', 'India', 'China, Mainland', 'South Africa',
  'Egypt', 'United Arab Emirates', 'Saudi Arabia'
];

/**
 * Company domain mappings for Clearbit logo API
 */
const COMPANY_DOMAINS = {
  'AAPL': 'apple.com', 'MSFT': 'microsoft.com', 'NVDA': 'nvidia.com',
  'GOOG': 'google.com', 'AMZN': 'amazon.com', 'META': 'meta.com',
  'TSLA': 'tesla.com', 'TSM': 'tsmc.com', 'JPM': 'jpmorganchase.com',
  'V': 'visa.com', 'MA': 'mastercard.com', 'WMT': 'walmart.com',
  'XOM': 'exxonmobil.com', 'UNH': 'unitedhealthgroup.com', 'HD': 'homedepot.com',
  'PG': 'pg.com', 'JNJ': 'jnj.com', 'COST': 'costco.com', 'KO': 'coca-cola.com',
  'PEP': 'pepsico.com', 'NFLX': 'netflix.com', 'DIS': 'disney.com',
  'ADBE': 'adobe.com', 'CRM': 'salesforce.com', 'AMD': 'amd.com',
  'INTC': 'intel.com', 'CSCO': 'cisco.com', 'ORCL': 'oracle.com',
  'NKE': 'nike.com', 'MCD': 'mcdonalds.com', 'BA': 'boeing.com',
  'IBM': 'ibm.com', 'GE': 'ge.com', 'CAT': 'caterpillar.com',
  'BRK-B': 'berkshirehathaway.com', 'LLY': 'lilly.com', 'AVGO': 'broadcom.com',
  'SPY': 'ssga.com', 'QQQ': 'invesco.com', 'VOO': 'vanguard.com',
  'VTI': 'vanguard.com', 'IVV': 'ishares.com', 'GLD': 'spdrgoldshares.com'
};
