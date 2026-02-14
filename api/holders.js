// Foreign holders of US Treasury securities - historical data
// Source: Treasury TIC data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Fetch both data sources
    const [recentRes, historicalRes] = await Promise.all([
      fetch('https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.txt'),
      fetch('https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfhhis01.txt')
    ]);
    
    if (!recentRes.ok || !historicalRes.ok) {
      throw new Error(`Fetch failed: recent=${recentRes.status}, historical=${historicalRes.status}`);
    }
    
    const recentText = await recentRes.text();
    const historicalText = await historicalRes.text();
    
    console.log('Recent data length:', recentText.length);
    console.log('Historical data length:', historicalText.length);
    
    const recentData = parseRecentData(recentText);
    const historicalData = parseHistoricalData(historicalText);
    
    console.log('Recent countries:', Object.keys(recentData).length);
    console.log('Historical countries:', Object.keys(historicalData).length);
    
    const mergedData = mergeData(historicalData, recentData);
    
    console.log('Merged countries:', Object.keys(mergedData).length);
    
    res.status(200).json({
      success: true,
      data: mergedData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function parseRecentData(text) {
  const lines = text.split('\n');
  const countries = {};
  let headers = [];
  
  for (const line of lines) {
    const parts = line.split('\t').map(p => p.trim());
    
    if (parts[0] === 'Country' && parts[1]?.match(/^\d{4}-\d{2}$/)) {
      headers = parts.slice(1).filter(h => h.match(/^\d{4}-\d{2}$/));
      continue;
    }
    
    if (!parts[0] || parts[0].startsWith('Table') || parts[0].startsWith('Holdings') || 
        parts[0].startsWith('Billions') || parts[0].startsWith('Link') || parts[0].startsWith('Notes') ||
        parts[0].startsWith('Of Which') || parts[0] === 'Grand Total' || parts[0] === 'All Other' ||
        parts[0].startsWith('The data') || parts[0].startsWith('overseas') || parts[0].startsWith('individual') ||
        parts[0].startsWith('(see TIC') || parts[0].startsWith('Estimated')) continue;
    
    if (headers.length > 0 && parts.length > 1) {
      let countryName = parts[0];
      if (countryName === 'Korea, South') countryName = 'Korea';
      
      if (!countries[countryName]) countries[countryName] = [];
      
      const values = parts.slice(1);
      for (let i = 0; i < headers.length && i < values.length; i++) {
        const val = parseFloat(values[i]);
        if (!isNaN(val) && headers[i]) {
          countries[countryName].push({ date: headers[i], value: val });
        }
      }
    }
  }
  return countries;
}

function parseHistoricalData(text) {
  const lines = text.split('\n');
  const countries = {};
  const monthMap = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06',
                     Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  
  let dateColumns = []; // Array of {month, year} for each column
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split('\t').map(p => p.trim());
    
    // Check for month header (Jan Dec Nov Oct ...)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (parts.filter(p => monthNames.includes(p)).length >= 6) {
      // Next line should have Country and years
      const yearLine = lines[i + 1];
      if (yearLine) {
        const yearParts = yearLine.split('\t').map(p => p.trim());
        if (yearParts[0] === 'Country') {
          dateColumns = [];
          let monthIdx = 0;
          for (let j = 1; j < parts.length && monthIdx < parts.length; j++) {
            const month = parts[j];
            const year = yearParts[j];
            if (monthNames.includes(month) && year?.match(/^\d{4}$/)) {
              dateColumns.push({ month: monthMap[month], year });
            }
          }
        }
      }
      continue;
    }
    
    // Skip header/meta rows
    if (!parts[0] || parts[0] === 'Country' || parts[0].startsWith('MAJOR') || 
        parts[0].includes('billions') || parts[0].includes('HOLDINGS') || 
        parts[0].startsWith('------') || parts[0].startsWith('Of which') ||
        parts[0] === 'For. Official' || parts[0] === 'Treasury Bills' || 
        parts[0].startsWith('T-Bonds') || parts[0] === 'Grand Total' || 
        parts[0] === 'All Other' || parts[0].startsWith('Department') ||
        parts[0].startsWith('1/') || parts[0].includes('http') || 
        parts[0].startsWith('Estimated') || parts[0].includes('custody')) continue;
    
    // Parse country data
    if (dateColumns.length > 0 && parts.length > 1) {
      let countryName = parts[0].replace(/^"|"$/g, '');
      if (countryName === 'Korea, South') countryName = 'Korea';
      if (!countryName || countryName.length < 2) continue;
      
      if (!countries[countryName]) countries[countryName] = [];
      
      for (let j = 0; j < dateColumns.length; j++) {
        const valStr = parts[j + 1];
        if (!valStr || valStr === '------') continue;
        const val = parseFloat(valStr);
        if (!isNaN(val) && dateColumns[j]) {
          const date = `${dateColumns[j].year}-${dateColumns[j].month}`;
          countries[countryName].push({ date, value: val });
        }
      }
    }
  }
  
  return countries;
}

function mergeData(historical, recent) {
  const merged = {};
  const allCountries = new Set([...Object.keys(historical), ...Object.keys(recent)]);
  
  for (const country of allCountries) {
    const dateMap = new Map();
    
    for (const item of (historical[country] || [])) {
      dateMap.set(item.date, item.value);
    }
    for (const item of (recent[country] || [])) {
      dateMap.set(item.date, item.value);
    }
    
    merged[country] = Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  return merged;
}
