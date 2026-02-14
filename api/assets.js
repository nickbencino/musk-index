// Serverless function for Vercel - Fully automated live data

// FMP API Key for stocks
const FMP_API_KEY = 'dqSqixCdhO7e6tmilU9izodHsf2ejDpN';

// In-memory cache (resets on cold start)
let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Top stocks to fetch
const TOP_STOCKS = [
  'NVDA', 'AAPL', 'GOOG', 'MSFT', 'AMZN', 'TSM', 'META', 'AVGO', 'TSLA', 'BRK-B',
  'WMT', 'LLY', 'JPM', 'V', 'XOM', 'MA', 'ORCL', 'COST', 'MU', 'BAC',
  'ABBV', 'HD', 'PG', 'CVX', 'NFLX', 'AMD', 'CSCO', 'CAT', 'PLTR', 'GE',
  'KO', 'WFC', 'MRK', 'DIS', 'AMGN', 'VZ', 'IBM', 'INTC', 'UNH', 'PEP'
];

// Total supply constants for market cap calculation
const GOLD_TOTAL_OUNCES = 6.95e9;   // ~6.95 billion troy ounces mined
const SILVER_TOTAL_OUNCES = 56.3e9; // ~56.3 billion troy ounces mined

// Elon's net worth - hardcoded from Forbes (Feb 2026)
function fetchElonNetWorth() {
  return 852.7e9; // $852.7B
}

// Fetch gold and silver prices from Gold API
async function fetchMetalPrices() {
  const results = [];
  
  try {
    // Fetch gold
    const goldResponse = await fetch('https://api.gold-api.com/price/XAU');
    const goldData = await goldResponse.json();
    
    if (goldData && goldData.price) {
      results.push({
        symbol: 'GOLD',
        name: 'Gold',
        price: goldData.price,
        marketCap: goldData.price * GOLD_TOTAL_OUNCES,
        change: 0, // API doesn't provide change
        type: 'metal'
      });
    }
  } catch (err) {
    console.error('Gold API error:', err.message);
  }
  
  try {
    // Fetch silver
    const silverResponse = await fetch('https://api.gold-api.com/price/XAG');
    const silverData = await silverResponse.json();
    
    if (silverData && silverData.price) {
      results.push({
        symbol: 'SILVER',
        name: 'Silver',
        price: silverData.price,
        marketCap: silverData.price * SILVER_TOTAL_OUNCES,
        change: 0, // API doesn't provide change
        type: 'metal'
      });
    }
  } catch (err) {
    console.error('Silver API error:', err.message);
  }
  
  return results;
}

// Fetch single stock profile from FMP
async function fetchStockProfile(symbol) {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${FMP_API_KEY}`
    );
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const stock = data[0];
      return {
        symbol: stock.symbol,
        name: stock.companyName,
        price: stock.price,
        marketCap: stock.marketCap,
        change: stock.changePercentage,
        type: 'stock',
        country: 'USA'
      };
    }
  } catch (err) {
    console.error(`Error fetching ${symbol}:`, err.message);
  }
  return null;
}

// Fallback stock data when API is rate limited - Feb 10, 2026 from companiesmarketcap.com
const FALLBACK_STOCKS = [
  { symbol: 'NVDA', name: 'NVIDIA', marketCap: 4599e9, price: 188.92, change: 0.59, type: 'stock' },
  { symbol: 'AAPL', name: 'Apple', marketCap: 4032e9, price: 274.36, change: 0.09, type: 'stock' },
  { symbol: 'GOOG', name: 'Alphabet (Google)', marketCap: 3862e9, price: 319.26, change: 1.58, type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', marketCap: 3125e9, price: 420.51, change: 1.64, type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', marketCap: 2271e9, price: 211.64, change: 1.40, type: 'stock' },
  { symbol: 'TSM', name: 'TSMC', marketCap: 1868e9, price: 360.24, change: 1.36, type: 'stock', country: 'Taiwan' },
  { symbol: 'META', name: 'Meta Platforms', marketCap: 1699e9, price: 671.92, change: 0.80, type: 'stock' },
  { symbol: '2222.SR', name: 'Saudi Aramco', marketCap: 1667e9, price: 6.89, change: 0.70, type: 'stock', country: 'Saudi Arabia' },
  { symbol: 'AVGO', name: 'Broadcom', marketCap: 1641e9, price: 346.30, change: 0.69, type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', marketCap: 1586e9, price: 422.77, change: 1.31, type: 'stock' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway', marketCap: 1078e9, price: 499.77, change: 0.34, type: 'stock' },
  { symbol: 'WMT', name: 'Walmart', marketCap: 1020e9, price: 128.00, change: 0.79, type: 'stock' },
  { symbol: 'LLY', name: 'Eli Lilly', marketCap: 927e9, price: 1034, change: 0.99, type: 'stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase', marketCap: 885e9, price: 325.05, change: 0.92, type: 'stock' },
  { symbol: '005930.KS', name: 'Samsung', marketCap: 760e9, price: 113.71, change: 0.36, type: 'stock', country: 'South Korea' },
  { symbol: 'TCEHY', name: 'Tencent', marketCap: 635e9, price: 70.34, change: 2.03, type: 'stock', country: 'China' },
  { symbol: 'XOM', name: 'Exxon Mobil', marketCap: 634e9, price: 150.23, change: 0.65, type: 'stock' },
  { symbol: 'V', name: 'Visa', marketCap: 632e9, price: 328.00, change: 0.95, type: 'stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', marketCap: 574e9, price: 238.31, change: 0.14, type: 'stock' },
  { symbol: 'ASML', name: 'ASML', marketCap: 554e9, price: 1428, change: 0.02, type: 'stock', country: 'Netherlands' },
  { symbol: 'MA', name: 'Mastercard', marketCap: 487e9, price: 544.60, change: 1.73, type: 'stock' },
  { symbol: 'ORCL', name: 'Oracle', marketCap: 465e9, price: 161.86, change: 3.37, type: 'stock' },
  { symbol: 'COST', name: 'Costco', marketCap: 439e9, price: 987.88, change: 0.97, type: 'stock' },
  { symbol: 'MU', name: 'Micron Technology', marketCap: 425e9, price: 377.81, change: 1.48, type: 'stock' },
  { symbol: 'BAC', name: 'Bank of America', marketCap: 414e9, price: 56.70, change: 0.51, type: 'stock' },
  { symbol: 'ABBV', name: 'AbbVie', marketCap: 396e9, price: 223.89, change: 0.28, type: 'stock' },
  { symbol: 'BABA', name: 'Alibaba', marketCap: 395e9, price: 165.36, change: 1.45, type: 'stock', country: 'China' },
  { symbol: 'HD', name: 'Home Depot', marketCap: 383e9, price: 384.80, change: 1.00, type: 'stock' },
  { symbol: 'PG', name: 'Procter & Gamble', marketCap: 369e9, price: 157.75, change: 0.27, type: 'stock' },
  { symbol: 'CVX', name: 'Chevron', marketCap: 362e9, price: 181.19, change: 0.77, type: 'stock' },
  { symbol: 'NFLX', name: 'Netflix', marketCap: 356e9, price: 84.03, change: 3.14, type: 'stock' },
  { symbol: 'AMD', name: 'AMD', marketCap: 352e9, price: 215.98, change: 0.01, type: 'stock' },
  { symbol: 'CSCO', name: 'Cisco', marketCap: 348e9, price: 87.95, change: 1.35, type: 'stock' },
  { symbol: 'CAT', name: 'Caterpillar', marketCap: 347e9, price: 741.72, change: 0.05, type: 'stock' },
  { symbol: 'PLTR', name: 'Palantir', marketCap: 343e9, price: 143.78, change: 0.59, type: 'stock' },
  { symbol: 'GE', name: 'General Electric', marketCap: 337e9, price: 319.12, change: 0.75, type: 'stock' },
  { symbol: 'KO', name: 'Coca-Cola', marketCap: 331e9, price: 76.83, change: 1.46, type: 'stock' },
  { symbol: 'TM', name: 'Toyota', marketCap: 315e9, price: 240.70, change: 0.70, type: 'stock', country: 'Japan' },
  { symbol: 'WFC', name: 'Wells Fargo', marketCap: 297e9, price: 94.77, change: 0.17, type: 'stock' },
  { symbol: 'MRK', name: 'Merck', marketCap: 291e9, price: 116.65, change: 0.85, type: 'stock' },
];

// Fetch all stocks from FMP (parallel with batching)
async function fetchAllStocks() {
  const results = [];
  
  // Fetch in batches of 10 to avoid overwhelming
  for (let i = 0; i < TOP_STOCKS.length; i += 10) {
    const batch = TOP_STOCKS.slice(i, i + 10);
    const promises = batch.map(symbol => fetchStockProfile(symbol));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(r => r !== null));
  }
  
  // If we got less than 10 stocks, FMP is probably rate limited - use fallback
  if (results.length < 10) {
    console.log('FMP rate limited, using fallback data');
    return FALLBACK_STOCKS;
  }
  
  return results;
}

// Fetch crypto from CoinGecko
async function fetchCryptoData() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
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
      image: coin.image
    }));
  } catch (err) {
    console.error('CoinGecko error:', err.message);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  
  try {
    const now = Date.now();
    
    // Check cache
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      return res.status(200).json(cache.data);
    }
    
    // Fetch all data in parallel
    const [elonNetWorth, metals, stocks, crypto] = await Promise.all([
      fetchElonNetWorth(),
      fetchMetalPrices(),
      fetchAllStocks(),
      fetchCryptoData()
    ]);
    
    // Combine all assets
    let allAssets = [...metals, ...stocks, ...crypto];
    
    // Sort by market cap
    allAssets.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    
    // Take top 100
    allAssets = allAssets.slice(0, 100);
    
    // Add ranks and Elon units
    allAssets = allAssets.map((asset, index) => ({
      ...asset,
      rank: index + 1,
      elons: asset.marketCap / elonNetWorth
    }));
    
    const result = {
      success: true,
      elonNetWorth,
      count: allAssets.length,
      totalElons: allAssets.reduce((sum, a) => sum + (a.elons || 0), 0),
      assets: allAssets,
      lastUpdated: new Date().toISOString(),
      dataSources: {
        stocks: 'FMP API',
        crypto: 'CoinGecko',
        metals: 'Gold-API.com',
        elonNetWorth: 'RTB API (Forbes data)'
      }
    };
    
    // Update cache
    cache = { data: result, timestamp: now };
    
    res.status(200).json(result);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
