// Yahoo Finance quotes proxy for MuskUnits news feed
const CACHE_TTL = 60; // 1 minute for prices

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Cache for 1 minute on Vercel's edge
  res.setHeader('Cache-Control', `s-maxage=${CACHE_TTL}, stale-while-revalidate=30`);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const symbols = req.query.symbols || 'GC=F,SI=F,HG=F,^GSPC,CL=F,^TNX';
  
  try {
    const symbolList = symbols.split(',').map(s => s.trim());
    const quotes = {};
    
    for (const symbol of symbolList) {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const result = data.chart?.result?.[0];
          if (result) {
            const meta = result.meta;
            const closes = result.indicators?.quote?.[0]?.close || [];
            const prevClose = meta.chartPreviousClose || closes[closes.length - 2] || meta.regularMarketPrice;
            const currentPrice = meta.regularMarketPrice;
            const change = currentPrice - prevClose;
            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
            
            quotes[symbol] = {
              symbol: symbol,
              price: currentPrice,
              change: change,
              changePercent: changePercent,
              currency: meta.currency
            };
          }
        }
      } catch (err) {
        console.error(`Quote fetch error for ${symbol}:`, err.message);
      }
    }
    
    res.status(200).json({ quotes });
  } catch (err) {
    console.error('Quotes API error:', err);
    res.status(500).json({ error: err.message });
  }
}
