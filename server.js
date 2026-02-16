const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3850;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Cache
let cachedData = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Elon's net worth
let elonNetWorth = 844800000000; // $844.8B as of Feb 2026

// Fetch and parse companiesmarketcap.com
async function fetchCompaniesMarketCap() {
  try {
    const response = await fetch('https://companiesmarketcap.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await response.text();
    
    const results = [];
    // Parse table rows - pattern: Name, Symbol, Market Cap, Price, Change
    const rowRegex = /(\d+)([A-Za-z\s\(\)]+?)([A-Z0-9\.\-]+)\$([0-9\.]+)\s*([TB])\$([0-9\.,]+)([\-0-9\.]+)%/g;
    
    let match;
    while ((match = rowRegex.exec(html)) !== null && results.length < 100) {
      const [_, rank, name, symbol, mcapNum, mcapUnit, price, change] = match;
      const marketCap = parseFloat(mcapNum) * (mcapUnit === 'T' ? 1e12 : 1e9);
      
      results.push({
        symbol: symbol.trim(),
        name: name.trim(),
        price: parseFloat(price.replace(/,/g, '')),
        marketCap,
        change: parseFloat(change),
        type: 'stock',
        country: 'USA'
      });
    }
    
    return results;
  } catch (err) {
    console.error('Error fetching companies:', err.message);
    return [];
  }
}

// Fetch assets page (includes gold, silver, crypto)
async function fetchAllAssets() {
  try {
    const response = await fetch('https://companiesmarketcap.com/assets-by-market-cap/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await response.text();
    
    // Extract the data from the page
    const results = [];
    
    // Try different parsing approach - look for structured data
    // The page has rows with: rank, name, symbol, market cap, price, change, country
    
    // Gold - extract from known position
    const goldMatch = html.match(/Gold[\s\S]*?\$([0-9\.]+)\s*T[\s\S]*?\$([0-9\.,]+)[\s\S]*?([\-0-9\.]+)%/i);
    if (goldMatch) {
      results.push({
        symbol: 'GOLD',
        name: 'Gold',
        marketCap: parseFloat(goldMatch[1]) * 1e12,
        price: parseFloat(goldMatch[2].replace(/,/g, '')),
        change: parseFloat(goldMatch[3]),
        type: 'metal'
      });
    }
    
    // Silver
    const silverMatch = html.match(/Silver[\s\S]*?\$([0-9\.]+)\s*T[\s\S]*?\$([0-9\.,]+)[\s\S]*?([\-0-9\.]+)%/i);
    if (silverMatch) {
      results.push({
        symbol: 'SILVER', 
        name: 'Silver',
        marketCap: parseFloat(silverMatch[1]) * 1e12,
        price: parseFloat(silverMatch[2].replace(/,/g, '')),
        change: parseFloat(silverMatch[3]),
        type: 'metal'
      });
    }
    
    return results;
  } catch (err) {
    console.error('Error fetching assets:', err.message);
    return [];
  }
}

// Fetch crypto from CoinGecko
async function fetchCryptoData() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true'
    );
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('CoinGecko returned non-array:', data);
      return [];
    }
    
    return data.map(coin => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      marketCap: coin.market_cap,
      change: coin.price_change_percentage_24h,
      type: 'crypto',
      image: coin.image,
      sparkline: coin.sparkline_in_7d?.price || []
    }));
  } catch (err) {
    console.error('CoinGecko error:', err.message);
    return [];
  }
}

// Hardcoded stock data with CURRENT accurate values
// Source: companiesmarketcap.com Feb 2026
const STOCK_DATA = [
  { symbol: 'NVDA', name: 'NVIDIA', marketCap: 4626e9, price: 190.04, change: 2.50 },
  { symbol: 'AAPL', name: 'Apple', marketCap: 4036e9, price: 274.62, change: -1.17 },
  { symbol: 'GOOG', name: 'Alphabet (Google)', marketCap: 3924e9, price: 324.40, change: 0.40 },
  { symbol: 'MSFT', name: 'Microsoft', marketCap: 3074e9, price: 413.60, change: 3.11 },
  { symbol: 'AMZN', name: 'Amazon', marketCap: 2240e9, price: 208.72, change: -0.76 },
  { symbol: 'TSM', name: 'TSMC', marketCap: 1843e9, price: 355.41, change: 1.88 },
  { symbol: 'META', name: 'Meta Platforms', marketCap: 1713e9, price: 677.22, change: 2.38 },
  { symbol: '2222.SR', name: 'Saudi Aramco', marketCap: 1667e9, price: 6.89, change: 0.70, country: 'Saudi Arabia' },
  { symbol: 'AVGO', name: 'Broadcom', marketCap: 1630e9, price: 343.94, change: 3.44 },
  { symbol: 'TSLA', name: 'Tesla', marketCap: 1565e9, price: 417.32, change: 1.51 },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway', marketCap: 1074e9, price: 498.08, change: -1.97 },
  { symbol: 'WMT', name: 'Walmart', marketCap: 1028e9, price: 129.02, change: -1.65 },
  { symbol: 'LLY', name: 'Eli Lilly', marketCap: 936.5e9, price: 1045, change: -1.28 },
  { symbol: 'JPM', name: 'JPMorgan Chase', marketCap: 876.84e9, price: 322.10, change: -0.09 },
  { symbol: '005930.KS', name: 'Samsung', marketCap: 758.8e9, price: 113.49, change: -0.36, country: 'South Korea' },
  { symbol: 'TCEHY', name: 'Tencent', marketCap: 647.72e9, price: 71.80, change: 0.42, country: 'China' },
  { symbol: 'XOM', name: 'Exxon Mobil', marketCap: 637.67e9, price: 151.21, change: 1.45 },
  { symbol: 'V', name: 'Visa', marketCap: 627.73e9, price: 325.58, change: -1.81 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', marketCap: 574.95e9, price: 238.64, change: -0.56 },
  { symbol: 'ASML', name: 'ASML', marketCap: 554.85e9, price: 1429, change: 1.17, country: 'Netherlands' },
  { symbol: 'MA', name: 'Mastercard', marketCap: 478.28e9, price: 535.33, change: -2.44 },
  { symbol: 'ORCL', name: 'Oracle', marketCap: 450.05e9, price: 156.59, change: 9.64 },
  { symbol: 'COST', name: 'Costco', marketCap: 442.88e9, price: 997.59, change: -0.36 },
  { symbol: 'MU', name: 'Micron Technology', marketCap: 431.63e9, price: 383.50, change: -2.84 },
  { symbol: 'BAC', name: 'Bank of America', marketCap: 411.93e9, price: 56.41, change: -0.21 },
  { symbol: 'ABBV', name: 'AbbVie', marketCap: 394.58e9, price: 223.26, change: -0.08 },
  { symbol: 'BABA', name: 'Alibaba', marketCap: 389.13e9, price: 163.00, change: 0.30, country: 'China' },
  { symbol: 'HD', name: 'Home Depot', marketCap: 379.28e9, price: 381.00, change: -1.08 },
  { symbol: 'PG', name: 'Procter & Gamble', marketCap: 367.63e9, price: 157.33, change: -1.16 },
  { symbol: 'CVX', name: 'Chevron', marketCap: 365.08e9, price: 182.60, change: 0.96 },
  { symbol: 'AMD', name: 'AMD', marketCap: 352.16e9, price: 216.00, change: 3.63 },
  { symbol: 'CAT', name: 'Caterpillar', marketCap: 347.66e9, price: 742.12, change: 2.19 },
  { symbol: 'NFLX', name: 'Netflix', marketCap: 345.58e9, price: 81.47, change: -0.89 },
  { symbol: 'CSCO', name: 'Cisco', marketCap: 342.87e9, price: 86.78, change: 2.31 },
  { symbol: 'PLTR', name: 'Palantir', marketCap: 340.61e9, price: 142.91, change: 5.16 },
  { symbol: 'KO', name: 'Coca-Cola', marketCap: 335.55e9, price: 77.97, change: -1.34 },
  { symbol: 'GE', name: 'General Electric', marketCap: 334.10e9, price: 316.74, change: -1.33 },
  { symbol: 'TM', name: 'Toyota', marketCap: 317.40e9, price: 242.39, change: -0.75, country: 'Japan' },
  { symbol: 'WFC', name: 'Wells Fargo', marketCap: 296.98e9, price: 94.61, change: 0.68 },
  { symbol: 'MRK', name: 'Merck', marketCap: 293.86e9, price: 117.65, change: -3.51 }
];

// ETF data
const ETF_DATA = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', marketCap: 864.87e9, price: 638.23, change: 0.47 },
  { symbol: 'IVV', name: 'iShares Core S&P 500', marketCap: 765.36e9, price: 697.09, change: 0.48 },
  { symbol: 'VOO', name: 'Vanguard S&P 500', marketCap: 710.72e9, price: 693.95, change: 0.48 },
  { symbol: 'VTI', name: 'Vanguard Total Stock', marketCap: 588.91e9, price: 342.64, change: 0.49 },
  { symbol: 'QQQ', name: 'Invesco QQQ', marketCap: 531.27e9, price: 2125, change: 0.41 },
  { symbol: 'AGG', name: 'iShares Core Bond', marketCap: 306.51e9, price: 1752, change: 0.38 },
  { symbol: 'VUG', name: 'Vanguard Growth', marketCap: 213.60e9, price: 68.37, change: 1.48 },
  { symbol: 'BND', name: 'Vanguard Total Bond', marketCap: 200.09e9, price: 473.39, change: 1.02 }
];

// Metals data - ACCURATE as of Feb 2026
const METALS_DATA = [
  { symbol: 'GOLD', name: 'Gold', marketCap: 35295e9, price: 5076, change: -0.06 },
  { symbol: 'SILVER', name: 'Silver', marketCap: 4595e9, price: 81.63, change: -0.73 }
];

// Fetch Elon's net worth
async function fetchElonNetWorth() {
  // Could scrape Forbes here, but for now use static
  return elonNetWorth;
}

// Get all data
async function getAllData() {
  const now = Date.now();
  
  if (cachedData && (now - lastFetch) < CACHE_DURATION) {
    return cachedData;
  }
  
  console.log('Fetching fresh data...');
  
  const [elon, crypto] = await Promise.all([
    fetchElonNetWorth(),
    fetchCryptoData()
  ]);
  
  // Use accurate static data for stocks/ETFs/metals, live crypto
  const stocks = STOCK_DATA.map(s => ({ ...s, type: 'stock', country: s.country || 'USA' }));
  const etfs = ETF_DATA.map(e => ({ ...e, type: 'etf', country: 'USA' }));
  const metals = METALS_DATA.map(m => ({ ...m, type: 'metal', country: null }));
  
  // Combine all
  let allAssets = [...metals, ...stocks, ...etfs, ...crypto];
  
  // Sort by market cap
  allAssets.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  
  // Take top 100
  allAssets = allAssets.slice(0, 100);
  
  // Add ranks and Elon units
  allAssets = allAssets.map((asset, index) => ({
    ...asset,
    rank: index + 1,
    elons: asset.marketCap / elon
  }));
  
  const result = { elonNetWorth: elon, assets: allAssets };
  
  cachedData = result;
  lastFetch = now;
  
  fs.writeFileSync(
    path.join(__dirname, 'data', 'assets.json'),
    JSON.stringify(result, null, 2)
  );
  
  return result;
}

// API endpoint
app.get('/api/assets', async (req, res) => {
  try {
    const data = await getAllData();
    res.json({
      success: true,
      elonNetWorth: data.elonNetWorth,
      count: data.assets.length,
      totalElons: data.assets.reduce((sum, a) => sum + (a.elons || 0), 0),
      assets: data.assets
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', elonNetWorth, cached: !!cachedData });
});

// =============================================================================
// DEBT API
// =============================================================================

const US_POPULATION = 335000000;
const US_HOUSEHOLDS = 131000000;

app.get('/api/debt', async (req, res) => {
  try {
    // Fetch all data in parallel
    const [
      debtResponse, 
      gdpResponse, 
      ratioResponse, 
      interestResponse,
      debtHistoryResponse
    ] = await Promise.all([
      fetch('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1'),
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP'),
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GFDEGDQ188S'),
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=A091RC1Q027SBEA'),
      fetch('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=400&fields=record_date,tot_pub_debt_out_amt')
    ]);
    
    const debtData = await debtResponse.json();
    const gdpCsv = await gdpResponse.text();
    const ratioCsv = await ratioResponse.text();
    const interestCsv = await interestResponse.text();
    const debtHistoryData = await debtHistoryResponse.json();
    
    // Current debt values
    const currentDebt = debtData.data?.[0];
    const totalDebt = currentDebt ? parseFloat(currentDebt.tot_pub_debt_out_amt) : 0;
    const publicDebt = currentDebt ? parseFloat(currentDebt.debt_held_public_amt) : 0;
    const intragovDebt = currentDebt ? parseFloat(currentDebt.intragov_hold_amt) : 0;
    
    // Parse GDP from FRED CSV
    const gdpLines = gdpCsv.trim().split('\n');
    const lastGdpLine = gdpLines[gdpLines.length - 1];
    const gdpBillions = parseFloat(lastGdpLine.split(',')[1]);
    const gdp = gdpBillions * 1e9;
    
    // Parse debt/GDP ratio history
    const ratioLines = ratioCsv.trim().split('\n').slice(1);
    const debtRatioData = ratioLines.map(line => {
      const [date, value] = line.split(',');
      return { date: date.substring(0, 7), value: parseFloat(value) };
    }).filter(d => !isNaN(d.value));
    const currentRatio = debtRatioData[debtRatioData.length - 1]?.value || 0;
    
    // Parse interest payments
    const interestLines = interestCsv.trim().split('\n').slice(1);
    const interestData = interestLines.map(line => {
      const [date, value] = line.split(',');
      return { date: date.substring(0, 7), value: parseFloat(value) };
    }).filter(d => !isNaN(d.value));
    const latestInterest = interestData[interestData.length - 1];
    const annualInterestBillions = latestInterest?.value || 0;
    
    // Calculate annual debt increase
    let annualIncrease = 0;
    let annualIncreasePercent = 0;
    if (debtHistoryData.data && debtHistoryData.data.length > 0) {
      const currentDate = new Date(debtHistoryData.data[0].record_date);
      const oneYearAgo = new Date(currentDate);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const yearAgoRecord = debtHistoryData.data.find(d => {
        const recordDate = new Date(d.record_date);
        return recordDate <= oneYearAgo;
      });
      
      if (yearAgoRecord) {
        const yearAgoDebt = parseFloat(yearAgoRecord.tot_pub_debt_out_amt);
        annualIncrease = totalDebt - yearAgoDebt;
        annualIncreasePercent = ((totalDebt - yearAgoDebt) / yearAgoDebt) * 100;
      }
    }
    
    // Calculated values
    const perPersonDebt = totalDebt / US_POPULATION;
    const perHouseholdDebt = totalDebt / US_HOUSEHOLDS;
    const publicPercent = (publicDebt / totalDebt) * 100;
    const intragovPercent = (intragovDebt / totalDebt) * 100;
    const foreignHoldingsEstimate = publicDebt * 0.24;
    const foreignPercent = (foreignHoldingsEstimate / totalDebt) * 100;
    const privatePercent = publicPercent - foreignPercent;
    const gdpGrowthPercent = 2.5;
    const debtGrowingFasterThanEconomy = annualIncreasePercent > gdpGrowthPercent;
    const projectedRatio = currentRatio * Math.pow(1 + (annualIncreasePercent - gdpGrowthPercent) / 100, 10);
    
    res.json({
      success: true,
      debt: currentDebt,
      gdp: gdp,
      gdpBillions: gdpBillions,
      ratioHistory: debtRatioData,
      interestPayments: annualInterestBillions,
      interestHistory: interestData,
      stats: {
        totalDebt,
        debtToGdpRatio: currentRatio,
        perPersonDebt,
        perHouseholdDebt,
        annualInterest: annualInterestBillions,
        annualIncrease,
        annualIncreasePercent
      },
      composition: {
        publicDebt,
        publicPercent,
        intragovDebt,
        intragovPercent,
        foreignEstimate: foreignHoldingsEstimate,
        foreignPercent,
        privatePercent
      },
      growth: {
        annualIncrease,
        annualIncreasePercent,
        debtGrowingFasterThanEconomy,
        projectedRatio10Y: projectedRatio
      },
      constants: {
        population: US_POPULATION,
        households: US_HOUSEHOLDS
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching debt data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Elon Units running at http://localhost:${PORT}`);
  console.log(`Also at http://192.168.1.216:${PORT}`);
});
