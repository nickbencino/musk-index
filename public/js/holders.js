/**
 * MuskUnits Treasury Holdings Tab Module
 * Displays foreign holdings of US Treasury securities by country.
 * 
 * @module holders
 * @requires core.js
 */

// =============================================================================
// HOLDERS TAB STATE
// =============================================================================

let holdersRange = 10;

// =============================================================================
// CHART RENDERING
// =============================================================================

/**
 * Update the Treasury holdings chart for selected country
 */
function updateHoldersChart() {
  if (!MU.holdersData) return;
  
  const countrySelect = document.getElementById('country-select');
  const country = countrySelect ? countrySelect.value : '__TOTAL__';
  let countryData;
  
  if (country === '__TOTAL__') {
    // Calculate total across all countries
    countryData = aggregateHoldersData(Object.keys(MU.holdersData));
  } else if (country === '__BRICS_TOTAL__') {
    // Calculate total across BRICS+ countries
    countryData = aggregateHoldersData(BRICS_TREASURY_COUNTRIES);
  } else {
    countryData = MU.holdersData[country] || [];
  }
  
  if (countryData.length === 0) return;
  
  // Filter by range
  let filteredData = countryData;
  if (holdersRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - holdersRange;
    filteredData = countryData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const values = filteredData.map(d => d.value);
  
  // Calculate stats
  const current = filteredData[filteredData.length - 1]?.value || 0;
  const peak = Math.max(...filteredData.map(d => d.value));
  const minVal = Math.min(...filteredData.map(d => d.value));
  const changeFromPeak = ((current - peak) / peak) * 100;
  
  // Calculate y-axis range with padding
  const dataRange = peak - minVal;
  const padding = dataRange * 0.1;
  const yMin = Math.max(0, minVal - padding);
  const yMax = peak + padding;
  
  // Update stats display
  document.getElementById('holder-current').textContent = '$' + current.toFixed(0) + 'B';
  document.getElementById('holder-mu').textContent = (current * 1e9 / MU.elonNetWorth).toFixed(2) + ' MU';
  document.getElementById('holder-peak').textContent = '$' + peak.toFixed(0) + 'B';
  
  const changeEl = document.getElementById('holder-change');
  changeEl.textContent = changeFromPeak.toFixed(1) + '%';
  changeEl.className = 'holder-stat-value ' + (changeFromPeak >= 0 ? 'positive' : 'negative');
  
  // Create chart
  const ctx = document.getElementById('holders-chart').getContext('2d');
  
  if (MU.charts.holders) {
    MU.charts.holders.destroy();
  }
  
  MU.charts.holders = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_DEFAULTS.colors.orange,
        borderColor: CHART_DEFAULTS.colors.orange,
        borderWidth: 0
      }]
    },
    options: {
      ...CHART_DEFAULTS.getBaseOptions(CHART_DEFAULTS.colors.orange),
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.getBaseOptions(CHART_DEFAULTS.colors.orange).plugins.tooltip,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => {
              const val = item.raw;
              const mu = (val * 1e9 / MU.elonNetWorth).toFixed(3);
              return `$${val.toFixed(0)}B (${mu} MU)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.colors.grid, drawBorder: false },
          ticks: { 
            color: CHART_DEFAULTS.colors.text, 
            font: { size: 10 },
            maxRotation: 0,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              const month = label.split('-')[1];
              return month === '01' ? label.split('-')[0] : '';
            }
          }
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { color: CHART_DEFAULTS.colors.grid, drawBorder: false },
          ticks: { 
            color: CHART_DEFAULTS.colors.text,
            callback: (val) => '$' + Math.round(val) + 'B'
          },
          title: {
            display: true,
            text: 'USD Billion',
            color: CHART_DEFAULTS.colors.text
          }
        }
      }
    }
  });
}

/**
 * Aggregate holdings data across multiple countries
 * @param {array} countries - List of country names to aggregate
 * @returns {array} Aggregated data sorted by date
 */
function aggregateHoldersData(countries) {
  const dateMap = new Map();
  
  for (const countryName of countries) {
    const data = MU.holdersData[countryName];
    if (!data) continue;
    
    for (const item of data) {
      const current = dateMap.get(item.date) || 0;
      dateMap.set(item.date, current + item.value);
    }
  }
  
  return Array.from(dateMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetch Treasury holders data from API
 */
async function fetchHoldersData() {
  try {
    const response = await fetch('/api/holders');
    const data = await response.json();
    
    if (data.success) {
      MU.holdersData = data.data;
      updateHoldersChart();
    }
  } catch (err) {
    console.error('Error fetching holders data:', err);
  }
}

// =============================================================================
// TAB INITIALIZATION
// =============================================================================

/**
 * Initialize the holders tab (called when tab is shown)
 */
function initHoldersTab() {
  if (!MU.holdersData) {
    fetchHoldersData();
  } else {
    updateHoldersChart();
  }
}

/**
 * Initialize holders tab event listeners (called once on page load)
 */
function initHoldersListeners() {
  // Country selector
  const countrySelect = document.getElementById('country-select');
  if (countrySelect) {
    countrySelect.addEventListener('change', updateHoldersChart);
  }
  
  // Range buttons (exclude gold range buttons)
  document.querySelectorAll('.range-btn:not(.gold-range)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn:not(.gold-range)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      holdersRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateHoldersChart();
    });
  });
}
