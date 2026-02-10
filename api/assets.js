// Serverless function for Vercel

// Elon's net worth
const elonNetWorth = 844800000000; // $844.8B as of Feb 2026

// Hardcoded stock data - Source: companiesmarketcap.com Feb 2026
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

// Metals data
const METALS_DATA = [
  { symbol: 'GOLD', name: 'Gold', marketCap: 35295e9, price: 5076, change: -0.06 },
  { symbol: 'SILVER', name: 'Silver', marketCap: 4595e9, price: 81.63, change: -0.73 }
];

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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const crypto = await fetchCryptoData();
    
    // Build asset list
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
      elons: asset.marketCap / elonNetWorth
    }));
    
    res.status(200).json({
      success: true,
      elonNetWorth,
      count: allAssets.length,
      totalElons: allAssets.reduce((sum, a) => sum + (a.elons || 0), 0),
      assets: allAssets
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
