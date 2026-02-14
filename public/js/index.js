/**
 * MuskUnits Index Tab Module
 * Handles the main asset table display and filtering.
 * 
 * @module index
 * @requires core.js
 */

// =============================================================================
// INDEX TAB STATE
// =============================================================================

let currentFilter = 'all';
let currentSort = { field: 'elons', direction: 'desc' };

// =============================================================================
// ASSET LOGO GENERATION
// =============================================================================

/**
 * Generate HTML for asset logo/icon
 * @param {object} asset - Asset object with symbol, name, type, image
 * @returns {string} HTML string for logo element
 */
function getLogoHtml(asset) {
  // Use provided image if available (crypto coins)
  if (asset.image) {
    return `<img src="${asset.image}" alt="">`;
  }
  
  // Emoji for metals
  if (asset.type === 'metal') {
    const emoji = asset.name === 'Gold' ? '🥇' : asset.name === 'Silver' ? '🥈' : '⚪';
    return `<span class="emoji">${emoji}</span>`;
  }
  
  // Company logos via Clearbit
  if (COMPANY_DOMAINS[asset.symbol]) {
    return `<img src="https://logo.clearbit.com/${COMPANY_DOMAINS[asset.symbol]}" onerror="this.outerHTML='<span class=letter>${asset.symbol[0]}</span>'" alt="">`;
  }
  
  // Fallback: first letter
  return `<span class="letter">${asset.symbol[0]}</span>`;
}

// =============================================================================
// TABLE RENDERING
// =============================================================================

/**
 * Render a single table row for an asset
 * @param {object} asset - Asset data object
 * @returns {string} HTML string for table row
 */
function renderAssetRow(asset) {
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

/**
 * Render the full asset table with current filters and sorting
 */
function renderAssetTable() {
  const tbody = document.getElementById('assets-body');
  const searchInput = document.getElementById('search');
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  
  let data = MU.allAssets;
  
  // Filter by asset type
  if (currentFilter !== 'all') {
    data = data.filter(a => a.type === currentFilter);
  }
  
  // Filter by search term
  if (search) {
    data = data.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.symbol.toLowerCase().includes(search)
    );
  }
  
  // Sort data
  data = [...data].sort((a, b) => {
    const aVal = a[currentSort.field] || 0;
    const bVal = b[currentSort.field] || 0;
    return currentSort.direction === 'desc' ? bVal - aVal : aVal - bVal;
  });
  
  // Re-rank after filtering/sorting
  data = data.map((a, i) => ({ ...a, rank: i + 1 }));
  
  // Render rows
  tbody.innerHTML = data.map(renderAssetRow).join('');
  
  // Update summary stats
  updateIndexStats(data);
}

/**
 * Update the summary statistics for the index tab
 * @param {array} data - Filtered/sorted asset data
 */
function updateIndexStats(data) {
  document.getElementById('total-assets').textContent = data.length;
  document.getElementById('total-elons').innerHTML = 
    data.reduce((sum, a) => sum + a.elons, 0).toFixed(0) + ' ' + ELON_FACE;
  
  if (data.length > 0) {
    document.getElementById('biggest-elon').innerHTML = 
      data[0].elons.toFixed(1) + ' ' + ELON_FACE + ' (' + data[0].symbol + ')';
  }
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetch asset data from API and update display
 */
async function fetchAssetData() {
  try {
    const response = await fetch('/api/assets');
    const data = await response.json();
    
    if (data.success) {
      MU.elonNetWorth = data.elonNetWorth;
      MU.allAssets = data.assets;
      
      // Update header display
      document.getElementById('elon-value').textContent = 
        '$' + (MU.elonNetWorth / 1e9).toFixed(0) + 'B';
      
      // Update gold price from assets (used in gold tab calculations)
      const goldAsset = MU.allAssets.find(a => a.symbol === 'GOLD' || a.name === 'Gold');
      if (goldAsset && goldAsset.price) {
        // Price is per oz, convert to per tonne (1 tonne = 32150.7 troy oz)
        MU.goldPricePerTonne = goldAsset.price * 32150.7;
      }
      
      renderAssetTable();
    }
  } catch (err) {
    console.error('Error fetching assets:', err);
    document.getElementById('assets-body').innerHTML = 
      '<tr><td colspan="6" class="loading">Error loading data 😬</td></tr>';
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Initialize index tab event listeners
 */
function initIndexListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAssetTable();
    });
  });
  
  // Sortable column headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
      }
      renderAssetTable();
    });
  });
  
  // Search input
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', renderAssetTable);
  }
}
