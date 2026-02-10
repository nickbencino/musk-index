// State
let allAssets = [];
let elonNetWorth = 0;
let currentFilter = 'all';
let currentSort = { field: 'elons', direction: 'desc' };

// Elon face image
const ELON_FACE = '<img class="elon-icon" src="img/elon.png" alt="Elon">';

// Format Elons
function formatElons(num) {
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + ELON_FACE;
  if (num >= 100) return num.toFixed(1) + ' ' + ELON_FACE;
  if (num >= 10) return num.toFixed(2) + ' ' + ELON_FACE;
  if (num >= 1) return num.toFixed(2) + ' ' + ELON_FACE;
  if (num >= 0.01) return num.toFixed(3) + ' ' + ELON_FACE;
  return num.toFixed(4) + ' ' + ELON_FACE;
}

// Format currency
function formatCurrency(num) {
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(0) + 'M';
  return '$' + num.toLocaleString();
}

// Format price
function formatPrice(num) {
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
      
      renderTable();
    }
  } catch (err) {
    console.error('Error:', err);
    document.getElementById('assets-body').innerHTML = 
      '<tr><td colspan="6" class="loading">Error loading data 😬</td></tr>';
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setInterval(fetchData, 5 * 60 * 1000);
  
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
});
