const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'gold-reserves.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Convert quarters to proper dates (Q4 00 -> 2000-12-31, etc)
    const quarterToDate = (q) => {
      const match = q.match(/Q(\d)\s*(\d{2})/);
      if (!match) return null;
      const quarter = parseInt(match[1]);
      const year = parseInt(match[2]);
      const fullYear = year >= 90 ? 1900 + year : 2000 + year;
      const month = quarter * 3;
      return `${fullYear}-${String(month).padStart(2, '0')}-01`;
    };
    
    const dates = data.quarters.map(quarterToDate);
    
    // Get top countries by latest holdings
    const latestHoldings = {};
    for (const [country, holdings] of Object.entries(data.countries)) {
      // Find latest non-null value
      for (let i = holdings.length - 1; i >= 0; i--) {
        if (holdings[i] !== null) {
          latestHoldings[country] = holdings[i];
          break;
        }
      }
    }
    
    // Sort by holdings
    const sortedCountries = Object.entries(latestHoldings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name]) => name);
    
    res.status(200).json({
      dates,
      quarters: data.quarters,
      countries: data.countries,
      topCountries: sortedCountries,
      latestHoldings
    });
  } catch (error) {
    console.error('Gold API error:', error);
    res.status(500).json({ error: 'Failed to fetch gold data' });
  }
};
