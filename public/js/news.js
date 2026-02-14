// MUSK UNITS - News Feed Application

// ===== CONFIGURATION =====
const CONFIG = {
  twitter: {
    apiKey: 'new1_0e8af69580ea45e5ba4ffb2de7650d40',
    accounts: ['silvertrade', 'DarioCpx']
  },
  rssFeeds: [
    { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg' }
  ],
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  priceRefreshInterval: 60 * 1000, // 1 minute
  cryptoKeywords: ['bitcoin', 'btc', 'crypto', 'ethereum', 'blockchain', 'defi', 'nft']
};

const ASSETS = {
  all: { name: 'All News', color: '#ff6600', keywords: [] },
  gold: { name: 'Gold', symbol: 'GC=F', color: '#ffd700', keywords: ['gold', 'bullion', 'xau', 'comex gold'] },
  silver: { name: 'Silver', symbol: 'SI=F', color: '#c0c0c0', keywords: ['silver', 'xag', 'comex silver', 'silversqueeze', 'shfe'] },
  copper: { name: 'Copper', symbol: 'HG=F', color: '#b87333', keywords: ['copper', 'dr copper'] },
  spx: { name: 'S&P 500', symbol: '^GSPC', color: '#00ff00', keywords: ['s&p', 'sp500', 'spx', 'stocks', 'equities', 'dow', 'nasdaq'] },
  oil: { name: 'Crude Oil', symbol: 'CL=F', color: '#666666', keywords: ['oil', 'crude', 'wti', 'brent', 'opec'] },
  treasury: { name: 'Treasuries', symbol: '^TNX', color: '#3399ff', keywords: ['treasury', 'bond', 'yield', 'fed', 'interest rate'] }
};

// ===== STATE =====
let state = {
  elonNetWorth: 350,
  newsItems: [],
  twitterItems: [],
  assetPrices: {},
  currentFilter: 'all',
  selectedIndex: null
};

// ===== UTILITIES =====
const Utils = {
  formatBillions(num) {
    if (num >= 1000) return '$' + (num / 1000).toFixed(2) + 'T';
    return '$' + num.toFixed(0) + 'B';
  },

  formatPrice(price, type) {
    if (!price) return '--';
    if (type === 'treasury') return price.toFixed(2) + '%';
    if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return '$' + price.toFixed(2);
  },

  formatElons(marketCap) {
    const elons = marketCap / state.elonNetWorth;
    if (elons < 0.01) return elons.toFixed(4) + ' E';
    if (elons < 1) return elons.toFixed(2) + ' E';
    if (elons < 100) return elons.toFixed(1) + ' E';
    return Math.round(elons).toLocaleString() + ' E';
  },

  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'NOW';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    return Math.floor(seconds / 86400) + 'd';
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  detectAssets(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    return Object.entries(ASSETS)
      .filter(([key, asset]) => key !== 'all' && asset.keywords?.some(kw => lower.includes(kw)))
      .map(([key]) => key);
  },

  isCrypto(text) {
    const lower = text.toLowerCase();
    return CONFIG.cryptoKeywords.some(kw => lower.includes(kw));
  }
};

// ===== CLOCK =====
function updateClock() {
  const el = document.getElementById('clock');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }
}

// ===== DATA FETCHING =====
const DataService = {
  async fetchElonNetWorth() {
    // Removed - no longer displaying Elon net worth
  },

  async fetchAssetPrices() {
    try {
      const symbols = Object.values(ASSETS).filter(a => a.symbol).map(a => a.symbol).join(',');
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`);
      const data = await res.json();
      
      if (data.quotes) {
        state.assetPrices = data.quotes;
      }
    } catch (err) {
      console.error('Price fetch error:', err);
    }
    
    UI.renderAssetList();
  },

  async fetchTwitter() {
    state.twitterItems = [];
    
    try {
      // Use server-side proxy to avoid CORS
      const res = await fetch('/api/twitter');
      const data = await res.json();
      const tweets = data?.tweets || [];
      
      tweets.forEach(tweet => {
        state.twitterItems.push({
          type: 'twitter',
          title: tweet.text?.substring(0, 120) + (tweet.text?.length > 120 ? '...' : ''),
          text: tweet.text,
          source: `@${tweet.username}`,
          name: tweet.name || tweet.username,
          avatar: tweet.avatar,
          publishedAt: tweet.createdAt,
          url: tweet.url,
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          views: tweet.views || 0,
          assets: Utils.detectAssets(tweet.text)
        });
      });
    } catch (err) {
      console.error('Twitter fetch error:', err);
    }
  },

  async fetchNews() {
    state.newsItems = [];
    
    for (const feed of CONFIG.rssFeeds) {
      try {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data.items) {
          data.items.forEach(item => {
            const text = (item.title + ' ' + (item.description || ''));
            
            // Filter out crypto
            if (Utils.isCrypto(text)) return;
            
            state.newsItems.push({
              type: 'news',
              title: item.title,
              snippet: item.description?.replace(/<[^>]*>/g, '').substring(0, 200),
              source: feed.name,
              publishedAt: item.pubDate,
              url: item.link,
              assets: Utils.detectAssets(text)
            });
          });
        }
      } catch (err) {
        console.error(`News fetch error for ${feed.name}:`, err);
      }
    }
  }
};

// ===== UI RENDERING =====
const UI = {
  renderAssetList() {
    const container = document.getElementById('asset-list');
    if (!container) return;
    
    container.innerHTML = Object.entries(ASSETS).map(([key, asset]) => {
      const quote = asset.symbol ? state.assetPrices[asset.symbol] : null;
      const isActive = state.currentFilter === key;
      
      if (key === 'all') {
        return `
          <div class="asset-item ${isActive ? 'active' : ''}" onclick="Actions.filterByAsset('${key}')">
            <div class="asset-info">
              <div class="asset-dot" style="background:${asset.color}"></div>
              <div class="asset-name">${asset.name}</div>
            </div>
            <div style="color:var(--orange);font-size:11px;">✓</div>
          </div>
        `;
      }
      
      const changeClass = quote?.changePercent >= 0 ? 'positive' : 'negative';
      const changeSign = quote?.changePercent >= 0 ? '+' : '';
      const priceType = key === 'treasury' ? 'treasury' : null;
      
      return `
        <div class="asset-item ${isActive ? 'active' : ''}" onclick="Actions.filterByAsset('${key}')">
          <div class="asset-info">
            <div class="asset-dot" style="background:${asset.color}"></div>
            <div class="asset-name">${asset.name}</div>
          </div>
          <div class="asset-data">
            <div class="asset-price">${quote ? Utils.formatPrice(quote.price, priceType) : '--'}</div>
            <div class="asset-change ${changeClass}">${quote ? changeSign + quote.changePercent.toFixed(2) + '%' : '--'}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderHeadlines() {
    const container = document.getElementById('headlines-list');
    if (!container) return;
    
    const items = Actions.getFilteredItems();
    
    if (items.length === 0) {
      const assetName = state.currentFilter === 'all' ? '' : ASSETS[state.currentFilter]?.name + ' ';
      container.innerHTML = `<div class="loading-message">No ${assetName}news found</div>`;
      return;
    }
    
    container.innerHTML = items.map((item, index) => {
      const time = Utils.timeAgo(item.publishedAt);
      const isRecent = (Date.now() - new Date(item.publishedAt).getTime()) < 30 * 60 * 1000;
      const isTwitter = item.type === 'twitter';
      const isSelected = state.selectedIndex === index;
      
      return `
        <div class="headline-item ${isRecent ? 'breaking' : ''} ${isSelected ? 'selected' : ''}" onclick="Actions.selectItem(${index})">
          <div class="headline-time">${time}</div>
          <div class="headline-content">
            <div class="headline-text">${Utils.escapeHtml(item.title)}</div>
            <div class="headline-meta">
              <span class="headline-source ${isTwitter ? 'twitter' : ''}">${item.source}</span>
              ${item.assets?.map(a => `<span class="asset-badge ${a}">${ASSETS[a]?.name?.split(' ')[0] || a}</span>`).join('') || ''}
            </div>
            ${isTwitter && item.likes ? `
              <div class="headline-engagement">
                <span>♥ ${Utils.formatNumber(item.likes)}</span>
                <span>↻ ${Utils.formatNumber(item.retweets)}</span>
                ${item.views ? `<span>◉ ${Utils.formatNumber(item.views)}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  renderDetail(item) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    
    const isTwitter = item.type === 'twitter';
    const time = Utils.timeAgo(item.publishedAt);
    
    let content = `<div class="detail-content">`;
    
    content += `
      <div class="detail-header">
        <div class="detail-source">${item.source}</div>
        <div class="detail-time">${time} ago</div>
      </div>
    `;
    
    if (isTwitter) {
      content += `
        <div class="tweet-author">
          ${item.avatar ? `<img src="${item.avatar}" class="tweet-avatar">` : ''}
          <div>
            <div class="tweet-name">${Utils.escapeHtml(item.name)}</div>
            <div class="tweet-handle">${item.source}</div>
          </div>
        </div>
      `;
    }
    
    if (!isTwitter) {
      content += `<h2 class="detail-title">${Utils.escapeHtml(item.title)}</h2>`;
    }
    
    content += `<div class="detail-body">`;
    if (isTwitter) {
      let text = Utils.escapeHtml(item.text || '');
      text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
      text = text.replace(/@(\w+)/g, '<a href="https://twitter.com/$1" target="_blank">@$1</a>');
      text = text.replace(/#(\w+)/g, '<a href="https://twitter.com/hashtag/$1" target="_blank">#$1</a>');
      content += `<p style="white-space:pre-wrap;font-size:16px;line-height:1.6;">${text}</p>`;
    } else if (item.snippet) {
      content += `<p>${Utils.escapeHtml(item.snippet)}</p>`;
    }
    content += `</div>`;
    
    if (item.assets?.length) {
      content += `
        <div class="detail-assets">
          ${item.assets.map(a => `<span class="asset-badge ${a} large">${ASSETS[a]?.name || a}</span>`).join('')}
        </div>
      `;
    }
    
    if (isTwitter) {
      content += `
        <div class="detail-engagement">
          <div class="engagement-stat">♥ <span>${Utils.formatNumber(item.likes)}</span> likes</div>
          <div class="engagement-stat">↻ <span>${Utils.formatNumber(item.retweets)}</span> retweets</div>
          ${item.views ? `<div class="engagement-stat">◉ <span>${Utils.formatNumber(item.views)}</span> views</div>` : ''}
        </div>
      `;
    }
    
    content += `<a href="${item.url}" target="_blank" class="detail-link">${isTwitter ? 'View on X →' : 'Read Article →'}</a>`;
    content += `</div>`;
    
    panel.innerHTML = content;
  },

  renderEmptyDetail() {
    const panel = document.getElementById('detail-panel');
    if (panel) {
      panel.innerHTML = `
        <div class="detail-empty">
          <div class="detail-empty-icon">📰</div>
          <div>Select a headline to read more</div>
        </div>
      `;
    }
  }
};

// ===== ACTIONS =====
const Actions = {
  getFilteredItems() {
    let combined = [...state.newsItems, ...state.twitterItems];
    
    if (state.currentFilter !== 'all') {
      combined = combined.filter(item => item.assets?.includes(state.currentFilter));
    }
    
    combined.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return combined.slice(0, 100);
  },

  filterByAsset(asset) {
    state.currentFilter = asset;
    state.selectedIndex = null;
    UI.renderAssetList();
    UI.renderHeadlines();
    UI.renderEmptyDetail();
  },

  selectItem(index) {
    state.selectedIndex = index;
    const items = this.getFilteredItems();
    const item = items[index];
    if (!item) return;
    
    UI.renderHeadlines();
    UI.renderDetail(item);
  },

  async refreshAll() {
    const headlines = document.getElementById('headlines-list');
    if (headlines) {
      headlines.innerHTML = '<div class="loading-message">Loading...</div>';
    }
    
    await Promise.all([
      DataService.fetchElonNetWorth(),
      DataService.fetchAssetPrices(),
      DataService.fetchTwitter(),
      DataService.fetchNews()
    ]);
    
    UI.renderHeadlines();
  }
};

// ===== INITIALIZATION =====
async function init() {
  // Start clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Initial data load
  await Actions.refreshAll();
  
  // Set up auto-refresh
  setInterval(() => Actions.refreshAll(), CONFIG.refreshInterval);
  setInterval(() => DataService.fetchAssetPrices(), CONFIG.priceRefreshInterval);
}

// Expose actions to global scope for onclick handlers
window.Actions = Actions;

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
