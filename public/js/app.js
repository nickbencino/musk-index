/**
 * MuskUnits Main Application
 * 
 * Initializes all modules and sets up the application.
 * 
 * Module loading order:
 * 1. core.js      - Shared state and utilities
 * 2. index.js     - Asset table tab
 * 3. calculator.js - Calculator tab
 * 4. debt.js      - US Debt tab
 * 5. holders.js   - Treasury Holdings tab
 * 6. gold.js      - Gold Reserves tab
 * 7. app.js       - This file (initialization)
 * 
 * @module app
 */

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Fetch initial asset data
  fetchAssetData();
  
  // Set up auto-refresh for asset data (every 5 minutes)
  setInterval(fetchAssetData, 5 * 60 * 1000);
  
  // Initialize tab from URL hash (or default to index)
  const initialTab = getTabFromHash();
  switchTab(initialTab, false);
  
  // Handle browser back/forward navigation
  window.addEventListener('hashchange', () => {
    const tab = getTabFromHash();
    switchTab(tab, false);
  });
  
  // Initialize all event listeners
  initTabListeners();
  initHamburgerMenu();
  initIndexListeners();
  initDebtListeners();
  initHoldersListeners();
  initGoldListeners();
});

/**
 * Initialize hamburger menu toggle for mobile
 */
function initHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const tabs = document.getElementById('nav-tabs');
  
  if (!hamburger || !tabs) return;
  
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    tabs.classList.toggle('open');
  });
  
  // Close menu when a tab is clicked
  tabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      hamburger.classList.remove('active');
      tabs.classList.remove('open');
    });
  });
}

/**
 * Initialize tab navigation event listeners
 */
function initTabListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    // Only add listener if it has a data-tab attribute (not a link)
    if (btn.dataset.tab) {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    }
  });
}
