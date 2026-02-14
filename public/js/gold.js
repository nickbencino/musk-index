/**
 * MuskUnits Gold Reserves Tab Module
 * Displays central bank gold holdings by country with optional Treasury overlay.
 * 
 * @module gold
 * @requires core.js
 * @requires holders.js (for Treasury data)
 */

// =============================================================================
// GOLD TAB STATE
// =============================================================================

let goldRange = 10;
let treasuryOverlay = false;
let goldDisplayMode = 'tonnes'; // 'tonnes' or 'usd'

// =============================================================================
// CHART RENDERING
// =============================================================================

/**
 * Update the gold reserves chart for selected country
 */
function updateGoldChart() {
  if (!MU.goldData) return;
  
  const countrySelect = document.getElementById('gold-country-select');
  const country = countrySelect ? countrySelect.value : '__BRICS_TOTAL__';
  const quarters = MU.goldData.quarters;
  
  // Get country holdings data
  let countryHoldings;
  const isBricsTotal = country === '__BRICS_TOTAL__';
  
  if (isBricsTotal) {
    countryHoldings = aggregateGoldData(quarters);
  } else {
    countryHoldings = getCountryGoldData(country, MU.goldData.countries[country] || []);
  }
  
  if (countryHoldings.length === 0) return;
  
  // Build data with dates
  const fullData = buildGoldTimeSeriesData(quarters, countryHoldings);
  
  // Filter by range
  let filteredData = fullData;
  if (goldRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - goldRange;
    filteredData = fullData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const tonnesValues = filteredData.map(d => d.tonnes);
  
  // Convert to USD billions if display mode is USD
  const isUsdMode = goldDisplayMode === 'usd';
  const values = isUsdMode 
    ? tonnesValues.map(t => (t * MU.goldPricePerTonne) / 1e9) 
    : tonnesValues;
  
  // Update stats
  updateGoldStats(fullData);
  
  // Build datasets
  const datasets = buildGoldDatasets(labels, values, isUsdMode, country, isBricsTotal);
  
  // Build scales
  const scales = buildGoldScales(isUsdMode, datasets.length > 1);
  
  // Create chart
  renderGoldChart(labels, datasets, scales);
}

/**
 * Aggregate gold data across BRICS+ countries
 * @param {array} quarters - Quarter labels from API
 * @returns {array} Aggregated holdings by quarter
 */
function aggregateGoldData(quarters) {
  const lastKnown = {};
  
  return quarters.map((_, i) => {
    let total = 0;
    let hasData = false;
    
    for (const bc of BRICS_COUNTRIES) {
      const holdings = MU.goldData.countries[bc];
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
}

/**
 * Get gold data for a single country, carrying forward missing values
 * @param {string} country - Country name
 * @param {array} rawHoldings - Raw holdings data
 * @returns {array} Holdings with carried-forward values
 */
function getCountryGoldData(country, rawHoldings) {
  const result = [];
  let lastKnown = null;
  
  for (let i = 0; i < rawHoldings.length; i++) {
    if (rawHoldings[i] !== null && rawHoldings[i] !== undefined) {
      lastKnown = rawHoldings[i];
      result[i] = rawHoldings[i];
    } else if (lastKnown !== null) {
      result[i] = lastKnown;
    } else {
      result[i] = null;
    }
  }
  
  return result;
}

/**
 * Build time series data from quarters and holdings
 * @param {array} quarters - Quarter labels (e.g., "Q4 00")
 * @param {array} holdings - Holdings values
 * @returns {array} Array of {date, tonnes} objects
 */
function buildGoldTimeSeriesData(quarters, holdings) {
  const data = [];
  
  for (let i = 0; i < quarters.length; i++) {
    if (holdings[i] === null) continue;
    
    // Convert Q4 00 -> 2000-12
    const match = quarters[i].match(/Q(\d)\s*(\d{2})/);
    if (match) {
      const quarter = parseInt(match[1]);
      const year = parseInt(match[2]);
      const fullYear = year >= 90 ? 1900 + year : 2000 + year;
      const month = String(quarter * 3).padStart(2, '0');
      data.push({
        date: `${fullYear}-${month}`,
        tonnes: holdings[i]
      });
    }
  }
  
  return data;
}

/**
 * Update gold stats display
 * @param {array} fullData - Complete (unfiltered) gold data
 */
function updateGoldStats(fullData) {
  const current = fullData[fullData.length - 1]?.tonnes || 0;
  const first = fullData[0]?.tonnes || 0;
  const change25y = first > 0 ? ((current - first) / first) * 100 : 0;
  const usdValue = current * MU.goldPricePerTonne;
  const muValue = usdValue / MU.elonNetWorth;
  
  document.getElementById('gold-current').textContent = current.toFixed(0) + ' tonnes';
  document.getElementById('gold-usd').textContent = '$' + (usdValue / 1e9).toFixed(1) + 'B';
  document.getElementById('gold-mu').textContent = muValue.toFixed(3) + ' MU';
  
  const changeEl = document.getElementById('gold-change');
  const sign = change25y >= 0 ? '+' : '';
  changeEl.textContent = sign + change25y.toFixed(1) + '%';
  changeEl.className = 'holder-stat-value ' + (change25y >= 0 ? 'positive' : 'negative');
}

/**
 * Build chart datasets including optional Treasury overlay
 * @param {array} labels - Date labels
 * @param {array} values - Gold values (tonnes or USD)
 * @param {boolean} isUsdMode - Whether displaying in USD
 * @param {string} country - Selected country
 * @param {boolean} isBricsTotal - Whether showing BRICS+ total
 * @returns {array} Chart.js datasets
 */
function buildGoldDatasets(labels, values, isUsdMode, country, isBricsTotal) {
  const datasets = [{
    label: isUsdMode ? 'Gold Value ($B)' : 'Gold (tonnes)',
    data: values,
    borderColor: CHART_DEFAULTS.colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    fill: true,
    tension: 0.1,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: CHART_DEFAULTS.colors.gold,
    yAxisID: 'y'
  }];
  
  // Add Treasury overlay if enabled
  if (treasuryOverlay && MU.holdersData) {
    const treasuryValues = getTreasuryOverlayData(labels, country, isBricsTotal);
    
    if (treasuryValues.some(v => v !== null)) {
      datasets.push({
        label: 'Treasury Holdings ($B)',
        data: treasuryValues,
        borderColor: CHART_DEFAULTS.colors.blue,
        backgroundColor: 'rgba(77, 166, 255, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: CHART_DEFAULTS.colors.blue,
        yAxisID: 'y1'
      });
    }
  }
  
  return datasets;
}

/**
 * Get Treasury data matched to gold chart dates
 * @param {array} labels - Gold chart date labels
 * @param {string} country - Selected country
 * @param {boolean} isBricsTotal - Whether showing BRICS+ total
 * @returns {array} Treasury values aligned to gold dates
 */
function getTreasuryOverlayData(labels, country, isBricsTotal) {
  if (isBricsTotal) {
    return labels.map(goldDate => {
      const [year, month] = goldDate.split('-');
      let total = 0;
      let hasData = false;
      
      for (const tc of BRICS_TREASURY_COUNTRIES) {
        const treasuryData = MU.holdersData[tc];
        if (!treasuryData) continue;
        
        // Try exact match first, then nearby months
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
  }
  
  // Single country
  const treasuryCountry = GOLD_TO_TREASURY_MAP[country];
  if (!treasuryCountry || !MU.holdersData[treasuryCountry]) {
    return labels.map(() => null);
  }
  
  const treasuryData = MU.holdersData[treasuryCountry];
  return labels.map(goldDate => {
    const [year, month] = goldDate.split('-');
    
    for (let offset = 0; offset <= 2; offset++) {
      const tryMonth = String(parseInt(month) - offset).padStart(2, '0');
      const match = treasuryData.find(t => t.date === `${year}-${tryMonth}`);
      if (match) return match.value;
    }
    
    return null;
  });
}

/**
 * Build chart scales configuration
 * @param {boolean} isUsdMode - Whether displaying in USD
 * @param {boolean} showTreasury - Whether Treasury overlay is shown
 * @returns {object} Chart.js scales config
 */
function buildGoldScales(isUsdMode, showTreasury) {
  const scales = {
    x: {
      grid: { color: CHART_DEFAULTS.colors.grid, drawBorder: false },
      ticks: { 
        color: CHART_DEFAULTS.colors.text, 
        font: { size: 10 },
        maxRotation: 0,
        callback: function(value) {
          const label = this.getLabelForValue(value);
          const parts = label.split('-');
          return parts[1] === '03' ? parts[0] : '';
        }
      }
    },
    y: {
      type: 'linear',
      position: 'left',
      grid: { color: CHART_DEFAULTS.colors.grid, drawBorder: false },
      ticks: { 
        color: CHART_DEFAULTS.colors.gold,
        callback: isUsdMode 
          ? (val) => '$' + val.toLocaleString() + 'B'
          : (val) => val.toLocaleString() + 't'
      },
      title: {
        display: true,
        text: isUsdMode ? 'USD (Billions)' : 'Gold (tonnes)',
        color: CHART_DEFAULTS.colors.gold
      }
    }
  };
  
  // Add right axis for Treasury if overlay enabled
  if (showTreasury) {
    scales.y1 = {
      type: 'linear',
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { 
        color: CHART_DEFAULTS.colors.blue,
        callback: (val) => '$' + val + 'B'
      },
      title: {
        display: true,
        text: 'Treasury ($B)',
        color: CHART_DEFAULTS.colors.blue
      }
    };
  }
  
  return scales;
}

/**
 * Render the gold chart
 * @param {array} labels - Date labels
 * @param {array} datasets - Chart.js datasets
 * @param {object} scales - Chart.js scales config
 */
function renderGoldChart(labels, datasets, scales) {
  const ctx = document.getElementById('gold-chart').getContext('2d');
  
  if (MU.charts.gold) {
    MU.charts.gold.destroy();
  }
  
  const showLegend = datasets.length > 1;
  
  MU.charts.gold = new Chart(ctx, {
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
          display: showLegend,
          labels: { color: '#f5f5f5' }
        },
        tooltip: {
          backgroundColor: CHART_DEFAULTS.colors.bg,
          titleColor: CHART_DEFAULTS.colors.gold,
          bodyColor: '#f5f5f5',
          borderColor: CHART_DEFAULTS.colors.gold,
          borderWidth: 1,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => {
              if (item.datasetIndex === 0) {
                if (goldDisplayMode === 'usd') {
                  const usdB = item.raw;
                  const tonnes = usdB * 1e9 / MU.goldPricePerTonne;
                  return `Gold: $${usdB.toFixed(1)}B (${tonnes.toFixed(0)}t)`;
                } else {
                  const tonnes = item.raw;
                  const usd = tonnes * MU.goldPricePerTonne;
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

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetch gold reserves data from API
 */
async function fetchGoldData() {
  try {
    const response = await fetch('/api/gold');
    const data = await response.json();
    
    if (data.countries) {
      MU.goldData = data;
      updateGoldChart();
    }
  } catch (err) {
    console.error('Error fetching gold data:', err);
  }
}

// =============================================================================
// TAB INITIALIZATION
// =============================================================================

/**
 * Initialize the gold tab (called when tab is shown)
 */
function initGoldTab() {
  // Fetch both gold data and holders data for overlay
  const promises = [];
  
  if (!MU.goldData) {
    promises.push(fetchGoldData());
  }
  if (!MU.holdersData) {
    promises.push(fetchHoldersData());
  }
  
  if (promises.length > 0) {
    Promise.all(promises).then(() => updateGoldChart());
  } else {
    updateGoldChart();
  }
}

/**
 * Initialize gold tab event listeners (called once on page load)
 */
function initGoldListeners() {
  // Country selector
  const countrySelect = document.getElementById('gold-country-select');
  if (countrySelect) {
    countrySelect.addEventListener('change', updateGoldChart);
  }
  
  // Display mode selector
  const displayMode = document.getElementById('gold-display-mode');
  if (displayMode) {
    displayMode.addEventListener('change', (e) => {
      goldDisplayMode = e.target.value;
      updateGoldChart();
    });
  }
  
  // Range buttons
  document.querySelectorAll('.range-btn.gold-range').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn.gold-range').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      goldRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateGoldChart();
    });
  });
  
  // Treasury overlay toggle
  const overlayToggle = document.getElementById('treasury-overlay');
  if (overlayToggle) {
    overlayToggle.addEventListener('change', (e) => {
      treasuryOverlay = e.target.checked;
      
      if (treasuryOverlay && !MU.holdersData) {
        fetchHoldersData().then(() => updateGoldChart());
      } else {
        updateGoldChart();
      }
    });
  }
}
