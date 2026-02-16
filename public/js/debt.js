/**
 * MuskUnits US Debt Tab Module
 * Bloomberg-style dashboard with fun comparisons.
 * 
 * @module debt
 * @requires core.js
 */

// =============================================================================
// STATE
// =============================================================================

let debtRange = 'max';
let interestRange = 'max';

// =============================================================================
// CHARTS
// =============================================================================

function updateDebtChart() {
  if (!MU.debtRatioData || MU.debtRatioData.length === 0) return;
  
  let filteredData = MU.debtRatioData;
  if (debtRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - debtRange;
    filteredData = MU.debtRatioData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const ctx = document.getElementById('debt-chart').getContext('2d');
  if (MU.charts.debt) MU.charts.debt.destroy();
  
  MU.charts.debt = new Chart(ctx, {
    type: 'line',
    data: {
      labels: filteredData.map(d => d.date),
      datasets: [{
        data: filteredData.map(d => d.value),
        borderColor: CHART_DEFAULTS.colors.red,
        backgroundColor: 'rgba(255, 59, 59, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0
      }]
    },
    options: {
      ...CHART_DEFAULTS.getBaseOptions(CHART_DEFAULTS.colors.red),
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.colors.grid },
          ticks: { 
            color: CHART_DEFAULTS.colors.text,
            maxRotation: 0,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              return label.split('-')[1] === '01' ? label.split('-')[0] : '';
            }
          }
        },
        y: {
          grid: { color: CHART_DEFAULTS.colors.grid },
          ticks: { color: CHART_DEFAULTS.colors.text, callback: v => v + '%' }
        }
      }
    }
  });
}

function updateInterestChart() {
  if (!MU.interestData || MU.interestData.length === 0) return;
  
  let filteredData = MU.interestData;
  if (interestRange !== 'max') {
    const cutoffYear = new Date().getFullYear() - interestRange;
    filteredData = MU.interestData.filter(d => parseInt(d.date.split('-')[0]) >= cutoffYear);
  }
  
  const ctx = document.getElementById('interest-chart').getContext('2d');
  if (MU.charts.interest) MU.charts.interest.destroy();
  
  MU.charts.interest = new Chart(ctx, {
    type: 'line',
    data: {
      labels: filteredData.map(d => d.date),
      datasets: [{
        data: filteredData.map(d => d.value),
        borderColor: CHART_DEFAULTS.colors.orange,
        backgroundColor: 'rgba(255, 102, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0
      }]
    },
    options: {
      ...CHART_DEFAULTS.getBaseOptions(CHART_DEFAULTS.colors.orange),
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.colors.grid },
          ticks: { 
            color: CHART_DEFAULTS.colors.text,
            maxRotation: 0,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              return label.split('-')[1] === '01' ? label.split('-')[0] : '';
            }
          }
        },
        y: {
          grid: { color: CHART_DEFAULTS.colors.grid },
          ticks: { color: CHART_DEFAULTS.colors.text, callback: v => '$' + v }
        }
      }
    }
  });
}

// =============================================================================
// FORMATTING
// =============================================================================

function fmt(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtT(num) {
  return '$' + (num / 1e12).toFixed(2) + 'T';
}

function fmtB(num) {
  return num >= 1000 ? '$' + (num / 1000).toFixed(2) + 'T' : '$' + num.toFixed(0) + 'B';
}

function fmtD(num) {
  return '$' + fmt(Math.round(num));
}

// =============================================================================
// DATA
// =============================================================================

async function fetchDebtData() {
  try {
    const response = await fetch('/api/debt');
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error);
    
    MU.debtRatioData = data.ratioHistory;
    MU.interestData = data.interestHistory;
    
    updateDebtChart();
    updateInterestChart();
    
    if (data.debt) updateDebtDisplay(data);
  } catch (err) {
    console.error('Error fetching debt:', err);
  }
}

function updateDebtDisplay(data) {
  const stats = data.stats;
  const composition = data.composition;
  const growth = data.growth;
  const totalDebt = stats.totalDebt;
  const totalMU = totalDebt / MU.elonNetWorth;
  
  // ==========================================================================
  // HERO CARDS
  // ==========================================================================
  
  document.getElementById('debt-usd-main').textContent = fmtT(totalDebt);
  document.getElementById('debt-musks').textContent = totalMU.toFixed(1);
  document.getElementById('debt-gdp-ratio').textContent = stats.debtToGdpRatio.toFixed(0) + '%';
  document.getElementById('debt-interest').textContent = fmtB(stats.annualInterest);
  
  // Interest per day
  const interestPerDay = (stats.annualInterest * 1e9) / 365;
  document.getElementById('interest-per-day').textContent = '$' + (interestPerDay / 1e9).toFixed(2) + 'B/day';
  
  // Debt growing per second (based on annual increase)
  const perSecond = growth.annualIncrease / (365 * 24 * 60 * 60);
  document.getElementById('debt-per-second').textContent = '$' + fmt(Math.round(perSecond));
  
  // ==========================================================================
  // YOUR SHARE
  // ==========================================================================
  
  document.getElementById('debt-per-person').textContent = fmtD(stats.perPersonDebt);
  document.getElementById('debt-per-household').textContent = fmtD(stats.perHouseholdDebt);
  document.getElementById('debt-per-taxpayer').textContent = fmtD(totalDebt / 150000000);
  
  // ==========================================================================
  // FUN FACTS
  // ==========================================================================
  
  // Years to pay at $1/second
  const secondsToPayOff = totalDebt;
  const yearsAtOneDollar = Math.round(secondsToPayOff / (365 * 24 * 60 * 60));
  document.getElementById('fact-seconds').textContent = fmt(yearsAtOneDollar);
  
  // Miles of stacked $100 bills (a $100 bill is 0.0043 inches thick)
  const numBills = totalDebt / 100;
  const inchesThick = numBills * 0.0043;
  const miles = inchesThick / 63360;
  document.getElementById('fact-bills').textContent = fmt(Math.round(miles));
  
  // Years of NASA funding (~$25B/year)
  const nasaYears = totalDebt / 25e9;
  document.getElementById('fact-nasa').textContent = fmt(Math.round(nasaYears));
  
  // Multiple of UK GDP (~$3.1T)
  const ukMultiple = totalDebt / 3.1e12;
  document.getElementById('fact-uk').textContent = ukMultiple.toFixed(1) + 'x';
  
  // ==========================================================================
  // COMPOSITION TABLE
  // ==========================================================================
  
  const privateDomestic = composition.publicDebt - composition.foreignEstimate;
  
  document.getElementById('comp-private-amt').textContent = fmtT(privateDomestic);
  document.getElementById('comp-private').textContent = composition.privatePercent.toFixed(0) + '%';
  document.getElementById('comp-private-mu').textContent = (privateDomestic / MU.elonNetWorth).toFixed(1);
  
  document.getElementById('comp-foreign-amt').textContent = fmtT(composition.foreignEstimate);
  document.getElementById('comp-foreign').textContent = composition.foreignPercent.toFixed(0) + '%';
  document.getElementById('comp-foreign-mu').textContent = (composition.foreignEstimate / MU.elonNetWorth).toFixed(1);
  
  document.getElementById('comp-trust-amt').textContent = fmtT(composition.intragovDebt);
  document.getElementById('comp-trust').textContent = composition.intragovPercent.toFixed(0) + '%';
  document.getElementById('comp-trust-mu').textContent = (composition.intragovDebt / MU.elonNetWorth).toFixed(1);
  
  document.getElementById('comp-total-amt').textContent = fmtT(totalDebt);
  document.getElementById('comp-total-mu').textContent = totalMU.toFixed(1);
}

// =============================================================================
// INIT
// =============================================================================

function initDebtTab() {
  fetchDebtData();
}

function initDebtListeners() {
  document.querySelectorAll('.debt-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.debt-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      debtRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateDebtChart();
    });
  });
  
  document.querySelectorAll('.interest-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interest-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      interestRange = btn.dataset.range === 'max' ? 'max' : parseInt(btn.dataset.range);
      updateInterestChart();
    });
  });
}
