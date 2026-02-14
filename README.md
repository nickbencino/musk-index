# MuskUnits

**Live site:** https://muskunits.com

A Bloomberg terminal-inspired dashboard that displays global assets denominated in "Musk Units" (MU) - where 1 MU equals Elon Musk's net worth.

## Quick Start

```bash
cd tools/marketcap-site
npm install
node server.js
```

Server runs at `http://localhost:3850`

## Architecture

```
marketcap-site/
├── server.js              # Express server + API proxies
├── public/
│   ├── index.html         # Main SPA (all tabs)
│   ├── news.html          # News terminal (separate page)
│   ├── css/
│   │   └── style.css      # Mobile-first responsive styles
│   ├── js/
│   │   ├── core.js        # Shared state, formatters, constants
│   │   ├── index.js       # Asset table tab
│   │   ├── calculator.js  # MU calculator tab
│   │   ├── debt.js        # US Debt tab + charts
│   │   ├── holders.js     # Treasury Holdings tab
│   │   ├── gold.js        # Gold Reserves tab + overlay
│   │   └── app.js         # Main init + event listeners
│   ├── img/               # Static images
│   └── data/              # Static JSON data files
└── api/                   # Vercel serverless functions
    ├── debt.js            # FRED API proxy (US debt data)
    ├── twitter.js         # Twitter API proxy
    └── quotes.js          # Quote rotation
```

## Tabs

| Tab | Description | Data Source |
|-----|-------------|-------------|
| **Index** | Asset table with MU valuations | CoinGecko, CompaniesMarketCap |
| **US Debt** | National debt tracker + charts | FRED API (proxied) |
| **Treasury Holdings** | Foreign treasury ownership by country | Treasury TIC data |
| **Gold Reserves** | Central bank gold holdings | World Gold Council |
| **Calculator** | Convert any USD value to MU | Local calculation |
| **News** | Market news terminal | RSS feeds |

## JavaScript Modules

### core.js
Shared state object `MU` containing:
- `elonNetWorth` - Current net worth (fetched from Forbes)
- `assets` - Loaded asset data
- `charts` - Chart.js instances

Utility functions:
- `formatNumber()` - Number formatting with suffixes
- `formatElons()` - MU-specific formatting
- `toElons()` - Convert USD to MU

### Tab Modules
Each tab module exports:
- `init*Listeners()` - Event listener setup
- Tab-specific fetch/render functions
- Chart initialization (where applicable)

### app.js
- DOM ready initialization
- Tab switching logic
- Hamburger menu toggle
- Auto-refresh intervals

## CSS Structure

Mobile-first design with breakpoints:
- **Base**: Mobile (< 600px)
- **600px+**: Tablet
- **900px+**: Desktop
- **1200px+**: Large desktop

Key features:
- CSS custom properties for theming
- Hamburger menu on mobile
- Responsive data tables (hide columns on small screens)
- Touch-friendly tap targets

## API Proxies

### /api/debt
Proxies FRED API to avoid CORS issues. Fetches US debt data.

### /api/twitter (Vercel only)
Caches tweets in Supabase (30 min TTL) to stay within rate limits.

### /api/quotes (Vercel only)
Rotating market quotes for the news terminal.

## Environment Variables

For Vercel deployment:
```
TWITTER_BEARER_TOKEN=xxx
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
```

## Development

### Local Testing
```bash
node server.js
# Open http://localhost:3850
```

### Deploy to Vercel
Push to main branch - Vercel auto-deploys from GitHub.

## Future Features

- [ ] Dark pool data tab (Polygon.io - $79/mo)
- [ ] Stock screener tab
- [ ] Quarterly fundamentals (Polygon.io - $49/mo)

## Data Sources

- **Elon Net Worth**: Forbes Real-Time Billionaires
- **Crypto**: CoinGecko API
- **Stocks**: CompaniesMarketCap
- **US Debt**: FRED (Federal Reserve Economic Data)
- **Treasury Holdings**: US Treasury TIC Data
- **Gold Reserves**: World Gold Council / IMF IFS
