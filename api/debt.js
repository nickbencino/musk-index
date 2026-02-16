// US National Debt data - proxied from Treasury and FRED
// Provides comprehensive debt statistics with composition breakdown

// US Population and Household constants (updated yearly)
const US_POPULATION = 335000000;
const US_HOUSEHOLDS = 131000000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Fetch all data in parallel
    const [
      debtResponse, 
      gdpResponse, 
      ratioResponse, 
      interestResponse,
      debtHistoryResponse
    ] = await Promise.all([
      // Treasury debt data (current)
      fetch('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1'),
      // GDP from FRED (proxied to avoid CORS)
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP'),
      // Debt to GDP ratio from FRED (proxied to avoid CORS)
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GFDEGDQ188S'),
      // Interest payments on federal debt from FRED (annual, in billions)
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=A091RC1Q027SBEA'),
      // Historical debt data (for calculating annual increase)
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
    const currentRatio = debtRatioData[debtRatioData.length - 1]?.value || 0;
    
    // Parse interest payments from FRED CSV (quarterly, in billions, annualized rate)
    const interestLines = interestCsv.trim().split('\n').slice(1); // Skip header
    const interestData = interestLines.map(line => {
      const [date, value] = line.split(',');
      return { date: date.substring(0, 7), value: parseFloat(value) };
    }).filter(d => !isNaN(d.value));
    const latestInterest = interestData[interestData.length - 1];
    const annualInterestBillions = latestInterest?.value || 0;
    
    // Calculate annual debt increase (compare to 1 year ago)
    let annualIncrease = 0;
    let annualIncreasePercent = 0;
    if (debtHistoryData.data && debtHistoryData.data.length > 0) {
      const currentDate = new Date(debtHistoryData.data[0].record_date);
      const oneYearAgo = new Date(currentDate);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      // Find closest record to one year ago
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
    
    // Calculate per-person and per-household debt
    const perPersonDebt = totalDebt / US_POPULATION;
    const perHouseholdDebt = totalDebt / US_HOUSEHOLDS;
    
    // Calculate debt composition percentages
    // Public debt = held by investors (private + foreign)
    // Intragov = trust funds (Social Security, Medicare, etc.)
    const publicPercent = (publicDebt / totalDebt) * 100;
    const intragovPercent = (intragovDebt / totalDebt) * 100;
    
    // Foreign holdings estimate (~23-24% of public debt based on TIC data)
    // This is an approximation; actual comes from Treasury TIC data
    const foreignHoldingsEstimate = publicDebt * 0.24;
    const foreignPercent = (foreignHoldingsEstimate / totalDebt) * 100;
    const privatePercent = publicPercent - foreignPercent;
    
    // GDP growth for comparison (approximate)
    const gdpGrowthPercent = 2.5; // Typical US GDP growth
    const debtGrowingFasterThanEconomy = annualIncreasePercent > gdpGrowthPercent;
    
    // Future projection (if current trend continues)
    const yearsToProject = 10;
    const projectedRatio = currentRatio * Math.pow(1 + (annualIncreasePercent - gdpGrowthPercent) / 100, yearsToProject);
    
    res.status(200).json({
      success: true,
      debt: currentDebt,
      gdp: gdp,
      gdpBillions: gdpBillions,
      ratioHistory: debtRatioData,
      interestPayments: annualInterestBillions,
      interestHistory: interestData,
      
      // Enhanced stats
      stats: {
        totalDebt: totalDebt,
        debtToGdpRatio: currentRatio,
        perPersonDebt: perPersonDebt,
        perHouseholdDebt: perHouseholdDebt,
        annualInterest: annualInterestBillions,
        annualIncrease: annualIncrease,
        annualIncreasePercent: annualIncreasePercent
      },
      
      // Debt composition
      composition: {
        publicDebt: publicDebt,
        publicPercent: publicPercent,
        intragovDebt: intragovDebt,
        intragovPercent: intragovPercent,
        foreignEstimate: foreignHoldingsEstimate,
        foreignPercent: foreignPercent,
        privatePercent: privatePercent
      },
      
      // Growth analysis
      growth: {
        annualIncrease: annualIncrease,
        annualIncreasePercent: annualIncreasePercent,
        debtGrowingFasterThanEconomy: debtGrowingFasterThanEconomy,
        projectedRatio10Y: projectedRatio
      },
      
      // Constants used
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
}
