// State
let allAssets = [];
let elonNetWorth = 0;
let currentFilter = 'all';
let currentSort = { field: 'elons', direction: 'desc' };

// Elon face image
const ELON_FACE = '<img class="elon-icon" src="img/elon.png" alt="Elon">';

// Format Elons
function formatElons(num) {
  if (num === null || num === undefined) return '-';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + ELON_FACE;
  if (num >= 100) return num.toFixed(1) + ' ' + ELON_FACE;
  if (num >= 10) return num.toFixed(2) + ' ' + ELON_FACE;
  if (num >= 1) return num.toFixed(2) + ' ' + ELON_FACE;
  if (num >= 0.01) return num.toFixed(3) + ' ' + ELON_FACE;
  return num.toFixed(4) + ' ' + ELON_FACE;
}

// Format currency
function formatCurrency(num) {
  if (num === null || num === undefined) return '-';
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(0) + 'M';
  return '$' + num.toLocaleString();
}

// Format price
function formatPrice(num) {
  if (num === null || num === undefined || num === 0) return '-';
  if (num >= 1000) return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (num >= 1) return '$' + num.toFixed(2);
  if (num >= 0.01) return '$' + num.toFixed(4);
  return '$' + num.toFixed(6);
}

// Format percent
function formatPercent(num) {
  if (num === null || num === undefined) return '-';
  const sign = num > 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

// Get logo for asset
function getLogoHtml(asset) {
  if (asset.image) {
    return `<img src="${asset.image}" alt="">`;
  }
  
  if (asset.type === 'metal') {
    const emoji = asset.name === 'Gold' ? '🥇' : asset.name === 'Silver' ? '🥈' : '⚪';
    return `<span class="emoji">${emoji}</span>`;
  }
  
  // Company logos via Clearbit
  const domains = {
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
  
  if (domains[asset.symbol]) {
    return `<img src="https://logo.clearbit.com/${domains[asset.symbol]}" onerror="this.outerHTML='<span class=letter>${asset.symbol[0]}</span>'" alt="">`;
  }
  
  return `<span class="letter">${asset.symbol[0]}</span>`;
}

// Render row
function renderRow(asset) {
  const changeClass = asset.change >= 0 ? 'positive' : 'negative';
  
  return `
    <tr data-type="${asset.type}">
      <td class="rank">${asset.rank}</td>
      <td>
        <div class="asset-cell">
          <div class="asset-logo">${getLogoHtml(asset)}</div>
          <div class="asset-info">
            <div class="name">${asset.name} <span class="type-tag ${asset.type}">${asset.type}</span></div>
            <div class="symbol">${asset.symbol}</div>
          </div>
        </div>
      </td>
      <td class="elons-value">${formatElons(asset.elons)}</td>
      <td class="mcap-value">${formatCurrency(asset.marketCap)}</td>
      <td class="price-value">${formatPrice(asset.price)}</td>
      <td class="change-value ${changeClass}">${formatPercent(asset.change)}</td>
    </tr>
  `;
}

// Render table
function renderTable() {
  const tbody = document.getElementById('assets-body');
  const search = document.getElementById('search').value.toLowerCase();
  
  let data = allAssets;
  
  // Filter by type
  if (currentFilter !== 'all') {
    data = data.filter(a => a.type === currentFilter);
  }
  
  // Filter by search
  if (search) {
    data = data.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.symbol.toLowerCase().includes(search)
    );
  }
  
  // Sort
  data = [...data].sort((a, b) => {
    const aVal = a[currentSort.field] || 0;
    const bVal = b[currentSort.field] || 0;
    return currentSort.direction === 'desc' ? bVal - aVal : aVal - bVal;
  });
  
  // Re-rank
  data = data.map((a, i) => ({ ...a, rank: i + 1 }));
  
  tbody.innerHTML = data.map(renderRow).join('');
  
  // Update stats
  document.getElementById('total-assets').textContent = data.length;
  document.getElementById('total-elons').innerHTML = 
    data.reduce((sum, a) => sum + a.elons, 0).toFixed(0) + ' ' + ELON_FACE;
  
  if (data.length > 0) {
    document.getElementById('biggest-elon').innerHTML = 
      data[0].elons.toFixed(1) + ' ' + ELON_FACE + ' (' + data[0].symbol + ')';
  }
}

// Fetch data
async function fetchData() {
  try {
    const response = await fetch('/api/assets');
    const data = await response.json();
    
    if (data.success) {
      elonNetWorth = data.elonNetWorth;
      allAssets = data.assets;
      
      // Update header
      document.getElementById('elon-value').textContent = 
        '$' + (elonNetWorth / 1e9).toFixed(0) + 'B';
      
      // Update gold price from assets (Gold is in the metals)
      const goldAsset = allAssets.find(a => a.symbol === 'GOLD' || a.name === 'Gold');
      if (goldAsset && goldAsset.price) {
        // Price is per oz, convert to per tonne (1 tonne = 32150.7 troy oz)
        goldPricePerTonne = goldAsset.price * 32150.7;
      }
      
      renderTable();
    }
  } catch (err) {
    console.error('Error:', err);
    document.getElementById('assets-body').innerHTML = 
      '<tr><td colspan="6" class="loading">Error loading data 😬</td></tr>';
  }
}

// Calculator
function updateCalculator() {
  const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
  const multiplier = parseFloat(document.getElementById('calc-unit').value) || 1;
  const totalUsd = amount * multiplier;
  const mu = totalUsd / elonNetWorth;
  
  // Format MU result
  let muStr;
  if (mu >= 1000) muStr = mu.toLocaleString(undefined, { maximumFractionDigits: 0 });
  else if (mu >= 1) muStr = mu.toFixed(2);
  else if (mu >= 0.001) muStr = mu.toFixed(5);
  else if (mu >= 0.0000001) muStr = mu.toFixed(8);
  else muStr = mu.toExponential(2);
  
  document.getElementById('calc-result').textContent = muStr;
  
  // Format input description
  let amountStr;
  if (totalUsd >= 1e12) amountStr = '$' + (totalUsd / 1e12).toFixed(2) + 'T';
  else if (totalUsd >= 1e9) amountStr = '$' + (totalUsd / 1e9).toFixed(2) + 'B';
  else if (totalUsd >= 1e6) amountStr = '$' + (totalUsd / 1e6).toFixed(2) + 'M';
  else if (totalUsd >= 1e3) amountStr = '$' + (totalUsd / 1e3).toFixed(2) + 'K';
  else amountStr = '$' + totalUsd.toFixed(2);
  
  document.getElementById('calc-result-text').textContent = amountStr + ' = ' + muStr + ' MU';
}

function updateQuickReference() {
  if (!elonNetWorth) return;
  
  const refs = [
    { id: 'ref-1m', val: 1e6 },
    { id: 'ref-1b', val: 1e9 },
    { id: 'ref-100b', val: 100e9 },
    { id: 'ref-1t', val: 1e12 }
  ];
  
  refs.forEach(r => {
    const mu = r.val / elonNetWorth;
    let muStr;
    if (mu >= 1) muStr = mu.toFixed(2);
    else if (mu >= 0.001) muStr = mu.toFixed(5);
    else muStr = mu.toFixed(8);
    document.getElementById(r.id).textContent = '= ' + muStr + ' MU';
  });
}

// Debt data
async function fetchDebtData() {
  try {
    // Use proxied API to avoid CORS issues with FRED
    const response = await fetch('/api/debt');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch debt data');
    }
    
    const debt = data.debt;
    const gdp = data.gdp;
    debtRatioData = data.ratioHistory;
    interestData = data.interestHistory;
    
    // Render the charts
    updateDebtChart();
    updateInterestChart();
    
    if (debt) {
      const totalDebt = parseFloat(debt.tot_pub_debt_out_amt);
      const publicDebt = parseFloat(debt.debt_held_public_amt);
      const intragovDebt = parseFloat(debt.intragov_hold_amt);
      const recordDate = debt.record_date;
      
      // Calculate Musk Units
      const totalMU = totalDebt / elonNetWorth;
      const publicMU = publicDebt / elonNetWorth;
      const intragovMU = intragovDebt / elonNetWorth;
      
      // Update display
      document.getElementById('debt-usd-main').textContent = '$' + (totalDebt / 1e12).toFixed(2) + 'T';
      document.getElementById('debt-musks').textContent = totalMU.toFixed(1);
      document.getElementById('debt-date').textContent = recordDate;
      document.getElementById('debt-per-musk').textContent = '$' + (elonNetWorth / 1e9).toFixed(0) + 'B';
      
      // Debt to GDP ratio
      if (gdp > 0) {
        const debtToGdp = (totalDebt / gdp) * 100;
        document.getElementById('debt-gdp-ratio').textContent = debtToGdp.toFixed(1) + '%';
      }
      
      // Interest payments
      const interestBillions = data.interestPayments || 0;
      if (interestBillions > 0) {
        if (interestBillions >= 1000) {
          document.getElementById('debt-interest').textContent = '$' + (interestBillions / 1000).toFixed(2) + 'T/yr';
        } else {
          document.getElementById('debt-interest').textContent = '$' + interestBillions.toFixed(0) + 'B/yr';
        }
      }
      
      document.getElementById('debt-public').textContent = '$' + (publicDebt / 1e12).toFixed(2) + 'T';
      document.getElementById('debt-public-mu').textContent = publicMU.toFixed(1) + ' MU';
      document.getElementById('debt-intragov').textContent = '$' + (intragovDebt / 1e12).toFixed(2) + 'T';
      document.getElementById('debt-intragov-mu').textContent = intragovMU.toFixed(1) + ' MU';
      
      // Context
      document.getElementById('context-text').innerHTML = 
        `The US national debt is equivalent to <strong>${totalMU.toFixed(1)} Elon Musks</strong>. ` +
        `To pay off the debt, you would need to liquidate Elon's entire net worth <strong>${totalMU.toFixed(0)} times</strong>. ` +
        `Every American citizen's share of the debt is approximately <strong>$${(totalDebt / 335000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong>.`;
    }
  } catch (err) {
    console.error('Error fetching debt:', err);
  }
}

function updateDebtChart() {
  if (!debtRatioData || debtRatioData.length === 0) return;
  
  // Filter by range
  let filteredData = debtRatioData;
  if (debtRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - debtRange;
    filteredData = debtRatioData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const values = filteredData.map(d => d.value);
  
  const ctx = document.getElementById('debt-chart').getContext('2d');
  
  if (debtChart) {
    debtChart.destroy();
  }
  
  // Color gradient based on value (green < 60%, yellow 60-100%, red > 100%)
  const getColor = (val) => {
    if (val < 60) return '#00ff41';
    if (val < 100) return '#ffb000';
    return '#ff3b3b';
  };
  
  debtChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        borderColor: '#ff3b3b',
        backgroundColor: 'rgba(255, 59, 59, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ff3b3b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#ff3b3b',
          bodyColor: '#f5f5f5',
          borderColor: '#ff3b3b',
          borderWidth: 1,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => `Debt/GDP: ${item.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2a2a2a', drawBorder: false },
          ticks: { 
            color: '#737373', 
            font: { size: 10 },
            maxRotation: 0,
            callback: function(value, index) {
              const label = this.getLabelForValue(value);
              const month = label.split('-')[1];
              return month === '01' ? label.split('-')[0] : '';
            }
          }
        },
        y: {
          grid: { color: '#2a2a2a', drawBorder: false },
          ticks: { 
            color: '#737373',
            callback: (val) => val + '%'
          },
          title: {
            display: true,
            text: 'Debt / GDP (%)',
            color: '#737373'
          }
        }
      }
    }
  });
}

function updateInterestChart() {
  if (!interestData || interestData.length === 0) return;
  
  // Filter by range
  let filteredData = interestData;
  if (interestRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - interestRange;
    filteredData = interestData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const values = filteredData.map(d => d.value);
  
  const ctx = document.getElementById('interest-chart').getContext('2d');
  
  if (interestChart) {
    interestChart.destroy();
  }
  
  interestChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        borderColor: '#ff6600',
        backgroundColor: 'rgba(255, 102, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ff6600'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#ff6600',
          bodyColor: '#f5f5f5',
          borderColor: '#ff6600',
          borderWidth: 1,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => `Interest: $${item.raw.toFixed(0)}B/year`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2a2a2a', drawBorder: false },
          ticks: { 
            color: '#737373', 
            font: { size: 10 },
            maxRotation: 0,
            callback: function(value, index) {
              const label = this.getLabelForValue(value);
              const month = label.split('-')[1];
              return month === '01' ? label.split('-')[0] : '';
            }
          }
        },
        y: {
          grid: { color: '#2a2a2a', drawBorder: false },
          ticks: { 
            color: '#737373',
            callback: (val) => '$' + val + 'B'
          },
          title: {
            display: true,
            text: 'Annual Interest ($ Billions)',
            color: '#737373'
          }
        }
      }
    }
  });
}

// Holders data and chart
let holdersData = null;
let holdersChart = null;
let currentRange = 10;

// Debt chart
let debtRatioData = null;
let debtChart = null;
let debtRange = 'max';

// Interest chart
let interestData = null;
let interestChart = null;
let interestRange = 'max';

// Gold data and chart
let goldData = null;
let goldChart = null;
let goldRange = 10;
let treasuryOverlay = false;
let goldDisplayMode = 'tonnes'; // 'tonnes' or 'usd'
let goldPricePerTonne = 95000000; // Default ~$95M per tonne, updated from API

// Map gold country names to Treasury country names
const goldToTreasuryMap = {
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

// BRICS+ member countries for combined total
const bricsCountries = [
  'Brazil', 'Russian Federation', 'India', 'China', 'South Africa',
  'Egypt', 'United Arab Emirates', 'Saudi Arabia'
];
const bricsTreasuryCountries = [
  'Brazil', 'Russia', 'India', 'China, Mainland', 'South Africa',
  'Egypt', 'United Arab Emirates', 'Saudi Arabia'
];

async function fetchHoldersData() {
  try {
    const response = await fetch('/api/holders');
    const data = await response.json();
    if (data.success) {
      holdersData = data.data;
      updateHoldersChart();
    }
  } catch (err) {
    console.error('Error fetching holders data:', err);
  }
}

function updateHoldersChart() {
  if (!holdersData) return;
  
  const country = document.getElementById('country-select').value;
  let countryData;
  
  if (country === '__TOTAL__') {
    // Calculate total across all countries
    const dateMap = new Map();
    for (const [countryName, data] of Object.entries(holdersData)) {
      for (const item of data) {
        const current = dateMap.get(item.date) || 0;
        dateMap.set(item.date, current + item.value);
      }
    }
    countryData = Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } else if (country === '__BRICS_TOTAL__') {
    // Calculate total across BRICS+ countries
    const dateMap = new Map();
    for (const tc of bricsTreasuryCountries) {
      const data = holdersData[tc];
      if (!data) continue;
      for (const item of data) {
        const current = dateMap.get(item.date) || 0;
        dateMap.set(item.date, current + item.value);
      }
    }
    countryData = Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } else {
    countryData = holdersData[country] || [];
  }
  
  if (countryData.length === 0) return;
  
  // Filter by range
  let filteredData = countryData;
  if (currentRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - currentRange;
    filteredData = countryData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  // Show all data points
  let displayData = filteredData;
  
  const labels = displayData.map(d => d.date);
  const values = displayData.map(d => d.value);
  
  // Update stats based on filtered range (not all-time)
  const current = filteredData[filteredData.length - 1]?.value || 0;
  const peak = Math.max(...filteredData.map(d => d.value));
  const minVal = Math.min(...filteredData.map(d => d.value));
  const changeFromPeak = ((current - peak) / peak) * 100;
  
  // Calculate y-axis range with padding (show changes more dramatically)
  const dataRange = peak - minVal;
  const padding = dataRange * 0.1; // 10% padding
  const yMin = Math.max(0, minVal - padding);
  const yMax = peak + padding;
  
  document.getElementById('holder-current').textContent = '$' + current.toFixed(0) + 'B';
  document.getElementById('holder-mu').textContent = (current * 1e9 / elonNetWorth).toFixed(2) + ' MU';
  document.getElementById('holder-peak').textContent = '$' + peak.toFixed(0) + 'B';
  
  const changeEl = document.getElementById('holder-change');
  changeEl.textContent = changeFromPeak.toFixed(1) + '%';
  changeEl.className = 'holder-stat-value ' + (changeFromPeak >= 0 ? 'positive' : 'negative');
  
  // Create/update chart
  const ctx = document.getElementById('holders-chart').getContext('2d');
  
  if (holdersChart) {
    holdersChart.destroy();
  }
  
  holdersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: '#ff6600',
        borderColor: '#ff6600',
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#ff6600',
          bodyColor: '#f5f5f5',
          borderColor: '#ff6600',
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              return items[0]?.label || '';
            },
            label: (item) => {
              const val = item.raw;
              const mu = (val * 1e9 / elonNetWorth).toFixed(3);
              return `$${val.toFixed(0)}B (${mu} MU)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2a2a2a', drawBorder: false },
          ticks: { 
            color: '#737373', 
            font: { size: 10 },
            maxRotation: 0,
            callback: function(value, index) {
              const label = this.getLabelForValue(value);
              const month = label.split('-')[1];
              // Only show label on January
              return month === '01' ? label.split('-')[0] : '';
            }
          }
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { color: '#2a2a2a', drawBorder: false },
          ticks: { 
            color: '#737373',
            callback: (val) => '$' + Math.round(val) + 'B'
          },
          title: {
            display: true,
            text: 'USD Billion',
            color: '#737373'
          }
        }
      }
    }
  });
}

// Gold data and chart
async function fetchGoldData() {
  try {
    const response = await fetch('/api/gold');
    const data = await response.json();
    if (data.countries) {
      goldData = data;
      updateGoldChart();
    }
  } catch (err) {
    console.error('Error fetching gold data:', err);
  }
}

function updateGoldChart() {
  if (!goldData) return;
  
  const country = document.getElementById('gold-country-select').value;
  const quarters = goldData.quarters;
  
  // Handle BRICS+ Total
  let countryHoldings;
  let isBricsTotal = country === '__BRICS_TOTAL__';
  
  if (isBricsTotal) {
    // Sum all BRICS countries' holdings by quarter
    // Track last known value per country to carry forward if AWAITED
    const lastKnown = {};
    countryHoldings = quarters.map((_, i) => {
      let total = 0;
      let hasData = false;
      for (const bc of bricsCountries) {
        const holdings = goldData.countries[bc];
        if (holdings && holdings[i] !== null && holdings[i] !== undefined) {
          total += holdings[i];
          lastKnown[bc] = holdings[i];
          hasData = true;
        } else if (lastKnown[bc]) {
          // Carry forward last known value
          total += lastKnown[bc];
          hasData = true;
        }
      }
      return hasData ? total : null;
    });
  } else {
    // For individual countries, carry forward last known value
    const rawHoldings = goldData.countries[country] || [];
    countryHoldings = [];
    let lastKnown = null;
    for (let i = 0; i < rawHoldings.length; i++) {
      if (rawHoldings[i] !== null && rawHoldings[i] !== undefined) {
        lastKnown = rawHoldings[i];
        countryHoldings[i] = rawHoldings[i];
      } else if (lastKnown !== null) {
        countryHoldings[i] = lastKnown; // Carry forward
      } else {
        countryHoldings[i] = null;
      }
    }
  }
  
  if (countryHoldings.length === 0) return;
  
  // Build data with dates
  const fullData = [];
  for (let i = 0; i < quarters.length; i++) {
    if (countryHoldings[i] !== null) {
      // Convert Q4 00 -> 2000-12
      const match = quarters[i].match(/Q(\d)\s*(\d{2})/);
      if (match) {
        const quarter = parseInt(match[1]);
        const year = parseInt(match[2]);
        const fullYear = year >= 90 ? 1900 + year : 2000 + year;
        const month = String(quarter * 3).padStart(2, '0');
        fullData.push({
          date: `${fullYear}-${month}`,
          tonnes: countryHoldings[i]
        });
      }
    }
  }
  
  // Filter by range
  let filteredData = fullData;
  if (goldRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - goldRange;
    filteredData = fullData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const tonnesValues = filteredData.map(d => d.tonnes);
  // Convert to USD billions if display mode is USD
  const values = goldDisplayMode === 'usd' 
    ? tonnesValues.map(t => (t * goldPricePerTonne) / 1e9) 
    : tonnesValues;
  
  // Update stats
  const current = fullData[fullData.length - 1]?.tonnes || 0;
  const first = fullData[0]?.tonnes || 0;
  const change25y = first > 0 ? ((current - first) / first) * 100 : 0;
  const usdValue = current * goldPricePerTonne;
  const muValue = usdValue / elonNetWorth;
  
  document.getElementById('gold-current').textContent = current.toFixed(0) + ' tonnes';
  document.getElementById('gold-usd').textContent = '$' + (usdValue / 1e9).toFixed(1) + 'B';
  document.getElementById('gold-mu').textContent = muValue.toFixed(3) + ' MU';
  
  const changeEl = document.getElementById('gold-change');
  const sign = change25y >= 0 ? '+' : '';
  changeEl.textContent = sign + change25y.toFixed(1) + '%';
  changeEl.className = 'holder-stat-value ' + (change25y >= 0 ? 'positive' : 'negative');
  
  // Build datasets
  const isUsdMode = goldDisplayMode === 'usd';
  const datasets = [{
    label: isUsdMode ? 'Gold Value ($B)' : 'Gold (tonnes)',
    data: values,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    fill: true,
    tension: 0.1,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: '#ffd700',
    yAxisID: 'y'
  }];
  
  // Add Treasury overlay if enabled
  let treasuryValues = [];
  if (treasuryOverlay && holdersData) {
    if (isBricsTotal) {
      // Sum all BRICS countries' Treasury holdings
      treasuryValues = labels.map(goldDate => {
        const [year, month] = goldDate.split('-');
        let total = 0;
        let hasData = false;
        for (const tc of bricsTreasuryCountries) {
          const treasuryData = holdersData[tc];
          if (!treasuryData) continue;
          for (let offset = 0; offset <= 2; offset++) {
            const tryMonth = String(parseInt(month) - offset).padStart(2, '0');
            const match = treasuryData.find(t => t.date === `${year}-${tryMonth}`);
            if (match) {
              total += match.value;
              hasData = true;
              break;
            }
          }
        }
        return hasData ? total : null;
      });
    } else {
      const treasuryCountry = goldToTreasuryMap[country];
      if (treasuryCountry && holdersData[treasuryCountry]) {
        const treasuryData = holdersData[treasuryCountry];
        // Map treasury data to gold dates (quarterly)
        treasuryValues = labels.map(goldDate => {
          // Find closest treasury data point
          const [year, month] = goldDate.split('-');
          // Try exact match first, then nearby months
          for (let offset = 0; offset <= 2; offset++) {
            const tryMonth = String(parseInt(month) - offset).padStart(2, '0');
            const match = treasuryData.find(t => t.date === `${year}-${tryMonth}`);
            if (match) return match.value;
          }
          return null;
        });
      }
    }
    
    if (treasuryValues.some(v => v !== null)) {
      datasets.push({
        label: 'Treasury Holdings ($B)',
        data: treasuryValues,
        borderColor: '#4da6ff',
        backgroundColor: 'rgba(77, 166, 255, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#4da6ff',
        yAxisID: 'y1'
      });
    }
  }
  
  // Create/update chart
  const ctx = document.getElementById('gold-chart').getContext('2d');
  
  if (goldChart) {
    goldChart.destroy();
  }
  
  const scales = {
    x: {
      grid: { color: '#2a2a2a', drawBorder: false },
      ticks: { 
        color: '#737373', 
        font: { size: 10 },
        maxRotation: 0,
        callback: function(value, index) {
          const label = this.getLabelForValue(value);
          const parts = label.split('-');
          return parts[1] === '03' ? parts[0] : '';
        }
      }
    },
    y: {
      type: 'linear',
      position: 'left',
      grid: { color: '#2a2a2a', drawBorder: false },
      ticks: { 
        color: '#ffd700',
        callback: isUsdMode 
          ? (val) => '$' + val.toLocaleString() + 'B'
          : (val) => val.toLocaleString() + 't'
      },
      title: {
        display: true,
        text: isUsdMode ? 'USD (Billions)' : 'Gold (tonnes)',
        color: '#ffd700'
      }
    }
  };
  
  // Add right axis for Treasury if overlay enabled
  if (treasuryOverlay && treasuryValues.some(v => v !== null)) {
    scales.y1 = {
      type: 'linear',
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { 
        color: '#4da6ff',
        callback: (val) => '$' + val + 'B'
      },
      title: {
        display: true,
        text: 'Treasury ($B)',
        color: '#4da6ff'
      }
    };
  }
  
  goldChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { 
          display: treasuryOverlay && treasuryValues.some(v => v !== null),
          labels: { color: '#f5f5f5' }
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#ffd700',
          bodyColor: '#f5f5f5',
          borderColor: '#ffd700',
          borderWidth: 1,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => {
              if (item.datasetIndex === 0) {
                if (isUsdMode) {
                  const usdB = item.raw;
                  const tonnes = usdB * 1e9 / goldPricePerTonne;
                  return `Gold: $${usdB.toFixed(1)}B (${tonnes.toFixed(0)}t)`;
                } else {
                  const tonnes = item.raw;
                  const usd = tonnes * goldPricePerTonne;
                  return `Gold: ${tonnes.toFixed(1)}t ($${(usd / 1e9).toFixed(1)}B)`;
                }
              } else {
                return `Treasury: $${item.raw?.toFixed(1) || '--'}B`;
              }
            }
          }
        }
      },
      scales
    }
  });
}

// Tab switching
function switchTab(tabName, updateHash = true) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update URL hash for shareable links
  if (updateHash) {
    history.pushState(null, '', '#' + tabName);
  }
  
  document.getElementById('index-tab').style.display = tabName === 'index' ? 'block' : 'none';
  document.getElementById('holders-tab').style.display = tabName === 'holders' ? 'block' : 'none';
  document.getElementById('gold-tab').style.display = tabName === 'gold' ? 'block' : 'none';
  document.getElementById('debt-tab').style.display = tabName === 'debt' ? 'block' : 'none';
  document.getElementById('calculator-tab').style.display = tabName === 'calculator' ? 'block' : 'none';
  
  if (tabName === 'calculator') {
    updateQuickReference();
    updateCalculator();
  }
  
  if (tabName === 'debt') {
    fetchDebtData();
  }
  
  if (tabName === 'holders') {
    if (!holdersData) {
      fetchHoldersData();
    } else {
      updateHoldersChart();
    }
  }
  
  if (tabName === 'gold') {
    // Fetch both gold data and holders data for overlay
    const promises = [];
    if (!goldData) promises.push(fetchGoldData());
    if (!holdersData) promises.push(fetchHoldersData());
    
    if (promises.length > 0) {
      Promise.all(promises).then(() => updateGoldChart());
    } else {
      updateGoldChart();
    }
  }
}

// Get tab from URL hash
function getTabFromHash() {
  const hash = window.location.hash.slice(1); // Remove #
  const validTabs = ['index', 'debt', 'holders', 'gold', 'calculator'];
  return validTabs.includes(hash) ? hash : 'index';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setInterval(fetchData, 5 * 60 * 1000);
  
  // Load tab from URL hash (or default to index)
  const initialTab = getTabFromHash();
  switchTab(initialTab, false);
  
  // Handle back/forward buttons
  window.addEventListener('hashchange', () => {
    const tab = getTabFromHash();
    switchTab(tab, false);
  });
  
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });
  
  // Sort headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
      }
      renderTable();
    });
  });
  
  // Search
  document.getElementById('search').addEventListener('input', renderTable);
  
  // Calculator
  document.getElementById('calc-amount').addEventListener('input', updateCalculator);
  document.getElementById('calc-unit').addEventListener('change', updateCalculator);
  document.getElementById('calc-btn').addEventListener('click', updateCalculator);
  
  // Holders
  document.getElementById('country-select').addEventListener('change', updateHoldersChart);
  document.querySelectorAll('.range-btn:not(.gold-range)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn:not(.gold-range)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateHoldersChart();
    });
  });
  
  // Gold
  document.getElementById('gold-country-select').addEventListener('change', updateGoldChart);
  document.getElementById('gold-display-mode').addEventListener('change', (e) => {
    goldDisplayMode = e.target.value;
    updateGoldChart();
  });
  document.querySelectorAll('.range-btn.gold-range').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn.gold-range').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      goldRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateGoldChart();
    });
  });
  
  // Treasury overlay toggle
  document.getElementById('treasury-overlay').addEventListener('change', (e) => {
    treasuryOverlay = e.target.checked;
    if (treasuryOverlay && !holdersData) {
      fetchHoldersData().then(() => updateGoldChart());
    } else {
      updateGoldChart();
    }
  });
  
  // Debt chart range
  document.querySelectorAll('.debt-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.debt-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      debtRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateDebtChart();
    });
  });
  
  // Interest chart range
  document.querySelectorAll('.interest-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interest-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      interestRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateInterestChart();
    });
  });
});
