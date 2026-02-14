/**
 * MuskUnits US Debt Tab Module
 * Displays US national debt data with charts and MU conversion.
 * 
 * @module debt
 * @requires core.js
 */

// =============================================================================
// DEBT TAB STATE
// =============================================================================

let debtRange = 'max';
let interestRange = 'max';

// =============================================================================
// CHART RENDERING
// =============================================================================

/**
 * Update the Debt-to-GDP ratio chart
 */
function updateDebtChart() {
  if (!MU.debtRatioData || MU.debtRatioData.length === 0) return;
  
  // Filter by selected range
  let filteredData = MU.debtRatioData;
  if (debtRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - debtRange;
    filteredData = MU.debtRatioData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const values = filteredData.map(d => d.value);
  
  const ctx = document.getElementById('debt-chart').getContext('2d');
  
  // Destroy existing chart if present
  if (MU.charts.debt) {
    MU.charts.debt.destroy();
  }
  
  MU.charts.debt = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        borderColor: CHART_DEFAULTS.colors.red,
        backgroundColor: 'rgba(255, 59, 59, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: CHART_DEFAULTS.colors.red
      }]
    },
    options: {
      ...CHART_DEFAULTS.getBaseOptions(CHART_DEFAULTS.colors.red),
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.getBaseOptions(CHART_DEFAULTS.colors.red).plugins.tooltip,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => `Debt/GDP: ${item.raw.toFixed(1)}%`
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
          grid: { color: CHART_DEFAULTS.colors.grid, drawBorder: false },
          ticks: { 
            color: CHART_DEFAULTS.colors.text,
            callback: (val) => val + '%'
          },
          title: {
            display: true,
            text: 'Debt / GDP (%)',
            color: CHART_DEFAULTS.colors.text
          }
        }
      }
    }
  });
}

/**
 * Update the annual interest payments chart
 */
function updateInterestChart() {
  if (!MU.interestData || MU.interestData.length === 0) return;
  
  // Filter by selected range
  let filteredData = MU.interestData;
  if (interestRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - interestRange;
    filteredData = MU.interestData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const labels = filteredData.map(d => d.date);
  const values = filteredData.map(d => d.value);
  
  const ctx = document.getElementById('interest-chart').getContext('2d');
  
  // Destroy existing chart if present
  if (MU.charts.interest) {
    MU.charts.interest.destroy();
  }
  
  MU.charts.interest = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        borderColor: CHART_DEFAULTS.colors.orange,
        backgroundColor: 'rgba(255, 102, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: CHART_DEFAULTS.colors.orange
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
            label: (item) => `Interest: $${item.raw.toFixed(0)}B/year`
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
          grid: { color: CHART_DEFAULTS.colors.grid, drawBorder: false },
          ticks: { 
            color: CHART_DEFAULTS.colors.text,
            callback: (val) => '$' + val + 'B'
          },
          title: {
            display: true,
            text: 'Annual Interest ($ Billions)',
            color: CHART_DEFAULTS.colors.text
          }
        }
      }
    }
  });
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetch debt data from API and update display
 */
async function fetchDebtData() {
  try {
    const response = await fetch('/api/debt');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch debt data');
    }
    
    const debt = data.debt;
    const gdp = data.gdp;
    MU.debtRatioData = data.ratioHistory;
    MU.interestData = data.interestHistory;
    
    // Render charts
    updateDebtChart();
    updateInterestChart();
    
    if (debt) {
      updateDebtDisplay(debt, gdp, data.interestPayments);
    }
  } catch (err) {
    console.error('Error fetching debt:', err);
  }
}

/**
 * Update the debt display with fetched data
 * @param {object} debt - Debt data object from Treasury API
 * @param {number} gdp - Current GDP value
 * @param {number} interestPayments - Annual interest payments in billions
 */
function updateDebtDisplay(debt, gdp, interestPayments) {
  const totalDebt = parseFloat(debt.tot_pub_debt_out_amt);
  const publicDebt = parseFloat(debt.debt_held_public_amt);
  const intragovDebt = parseFloat(debt.intragov_hold_amt);
  const recordDate = debt.record_date;
  
  // Calculate Musk Units
  const totalMU = totalDebt / MU.elonNetWorth;
  const publicMU = publicDebt / MU.elonNetWorth;
  const intragovMU = intragovDebt / MU.elonNetWorth;
  
  // Update main display
  document.getElementById('debt-usd-main').textContent = '$' + (totalDebt / 1e12).toFixed(2) + 'T';
  document.getElementById('debt-musks').textContent = totalMU.toFixed(1);
  document.getElementById('debt-date').textContent = recordDate;
  document.getElementById('debt-per-musk').textContent = '$' + (MU.elonNetWorth / 1e9).toFixed(0) + 'B';
  
  // Debt to GDP ratio
  if (gdp > 0) {
    const debtToGdp = (totalDebt / gdp) * 100;
    document.getElementById('debt-gdp-ratio').textContent = debtToGdp.toFixed(1) + '%';
  }
  
  // Interest payments
  if (interestPayments > 0) {
    const interestDisplay = interestPayments >= 1000 
      ? '$' + (interestPayments / 1000).toFixed(2) + 'T/yr'
      : '$' + interestPayments.toFixed(0) + 'B/yr';
    document.getElementById('debt-interest').textContent = interestDisplay;
  }
  
  // Breakdown
  document.getElementById('debt-public').textContent = '$' + (publicDebt / 1e12).toFixed(2) + 'T';
  document.getElementById('debt-public-mu').textContent = publicMU.toFixed(1) + ' MU';
  document.getElementById('debt-intragov').textContent = '$' + (intragovDebt / 1e12).toFixed(2) + 'T';
  document.getElementById('debt-intragov-mu').textContent = intragovMU.toFixed(1) + ' MU';
  
  // Context text
  document.getElementById('context-text').innerHTML = 
    `The US national debt is equivalent to <strong>${totalMU.toFixed(1)} Elon Musks</strong>. ` +
    `To pay off the debt, you would need to liquidate Elon's entire net worth <strong>${totalMU.toFixed(0)} times</strong>. ` +
    `Every American citizen's share of the debt is approximately <strong>$${(totalDebt / 335000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong>.`;
}

// =============================================================================
// TAB INITIALIZATION
// =============================================================================

/**
 * Initialize the debt tab (called when tab is shown)
 */
function initDebtTab() {
  fetchDebtData();
}

/**
 * Initialize debt tab event listeners (called once on page load)
 */
function initDebtListeners() {
  // Debt chart range buttons
  document.querySelectorAll('.debt-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.debt-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      debtRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateDebtChart();
    });
  });
  
  // Interest chart range buttons
  document.querySelectorAll('.interest-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interest-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      interestRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateInterestChart();
    });
  });
}
