/**
 * MuskUnits Calculator Tab Module
 * Converts USD values to Musk Units.
 * 
 * @module calculator
 * @requires core.js
 */

// =============================================================================
// CALCULATOR FUNCTIONS
// =============================================================================

/**
 * Update the calculator result based on current input
 */
function updateCalculator() {
  const amountInput = document.getElementById('calc-amount');
  const unitSelect = document.getElementById('calc-unit');
  
  const amount = parseFloat(amountInput.value) || 0;
  const multiplier = parseFloat(unitSelect.value) || 1;
  const totalUsd = amount * multiplier;
  const mu = totalUsd / MU.elonNetWorth;
  
  // Format MU result with appropriate precision
  const muStr = formatMU(mu);
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

/**
 * Update the quick reference table with current Elon net worth
 */
function updateQuickReference() {
  if (!MU.elonNetWorth) return;
  
  const refs = [
    { id: 'ref-1m', val: 1e6 },
    { id: 'ref-1b', val: 1e9 },
    { id: 'ref-100b', val: 100e9 },
    { id: 'ref-1t', val: 1e12 }
  ];
  
  refs.forEach(r => {
    const mu = r.val / MU.elonNetWorth;
    const muStr = formatMU(mu);
    const el = document.getElementById(r.id);
    if (el) {
      el.textContent = '= ' + muStr + ' MU';
    }
  });
}

// =============================================================================
// TAB INITIALIZATION
// =============================================================================

/**
 * Initialize the calculator tab (called when tab is shown)
 */
function initCalculatorTab() {
  updateQuickReference();
  updateCalculator();
}

/**
 * Initialize calculator event listeners (called once on page load)
 */
function initCalculatorListeners() {
  const amountInput = document.getElementById('calc-amount');
  const unitSelect = document.getElementById('calc-unit');
  const calcBtn = document.getElementById('calc-btn');
  
  if (amountInput) {
    amountInput.addEventListener('input', updateCalculator);
  }
  if (unitSelect) {
    unitSelect.addEventListener('change', updateCalculator);
  }
  if (calcBtn) {
    calcBtn.addEventListener('click', updateCalculator);
  }
}
