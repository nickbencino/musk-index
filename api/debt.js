// US National Debt data - proxied from Treasury and FRED
// Solves CORS issues with direct FRED requests

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Fetch all data in parallel
    const [debtResponse, gdpResponse, ratioResponse, interestResponse] = await Promise.all([
      // Treasury debt data (this one works direct, but include for completeness)
      fetch('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1'),
      // GDP from FRED (proxied to avoid CORS)
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP'),
      // Debt to GDP ratio from FRED (proxied to avoid CORS)
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GFDEGDQ188S'),
      // Interest payments on federal debt from FRED (annual, in billions)
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=A091RC1Q027SBEA')
    ]);
    
    const debtData = await debtResponse.json();
    const gdpCsv = await gdpResponse.text();
    const ratioCsv = await ratioResponse.text();
    const interestCsv = await interestResponse.text();
    
    // Parse GDP from FRED CSV (last line has latest value, in billions)
    const gdpLines = gdpCsv.trim().split('\n');
    const lastGdpLine = gdpLines[gdpLines.length - 1];
    const gdpBillions = parseFloat(lastGdpLine.split(',')[1]);
    const gdp = gdpBillions * 1e9; // Convert to dollars
    
    // Parse debt/GDP ratio history
    const ratioLines = ratioCsv.trim().split('\n').slice(1); // Skip header
    const debtRatioData = ratioLines.map(line => {
      const [date, value] = line.split(',');
      return { date: date.substring(0, 7), value: parseFloat(value) }; // YYYY-MM format
    }).filter(d => !isNaN(d.value));
    
    // Parse interest payments from FRED CSV (quarterly, in billions, annualized rate)
    const interestLines = interestCsv.trim().split('\n').slice(1); // Skip header
    const interestData = interestLines.map(line => {
      const [date, value] = line.split(',');
      return { date: date.substring(0, 7), value: parseFloat(value) };
    }).filter(d => !isNaN(d.value));
    const latestInterest = interestData[interestData.length - 1];
    const annualInterestBillions = latestInterest?.value || 0;
    
    res.status(200).json({
      success: true,
      debt: debtData.data?.[0] || null,
      gdp: gdp,
      gdpBillions: gdpBillions,
      ratioHistory: debtRatioData,
      interestPayments: annualInterestBillions, // Annual rate in billions
      interestHistory: interestData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching debt data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
