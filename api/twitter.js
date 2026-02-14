// Twitter API proxy for MuskUnits news feed with Supabase caching
const TWITTER_API_KEY = 'new1_0e8af69580ea45e5ba4ffb2de7650d40';
const TWITTER_ACCOUNTS = ['silvertrade', 'DarioCpx'];
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Supabase config
const SUPABASE_URL = 'https://zbnqkfwfvicsaiguqmqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibnFrZndmdmljc2FpZ3VxbXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDI2ODEsImV4cCI6MjA1ODI3ODY4MX0.-dQdGo3dWeKBbfZjOMTU37C3aoqTqq7SqM8UWD4xmOM';
const CACHE_KEY = 'muskunits_tweets';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Also set edge cache for extra layer
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Check Supabase cache first
    const cached = await getCachedTweets();
    if (cached) {
      console.log('Returning cached tweets');
      return res.status(200).json({ tweets: cached, cached: true });
    }
    
    // Cache miss or stale - fetch fresh from Twitter
    console.log('Cache miss - fetching from Twitter API');
    const freshTweets = await fetchFreshTweets();
    
    // Store in cache
    await cacheTweets(freshTweets);
    
    res.status(200).json({ tweets: freshTweets, cached: false });
  } catch (err) {
    console.error('Twitter fetch error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getCachedTweets() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tweet_cache?key=eq.${CACHE_KEY}&select=data,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    if (!response.ok) return null;
    
    const rows = await response.json();
    if (!rows || rows.length === 0) return null;
    
    const { data, updated_at } = rows[0];
    const cacheAge = Date.now() - new Date(updated_at).getTime();
    
    // Return cached data if fresh enough
    if (cacheAge < CACHE_TTL_MS) {
      return data;
    }
    
    return null; // Cache is stale
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
}

async function cacheTweets(tweets) {
  try {
    // Upsert (insert or update)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tweet_cache`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          key: CACHE_KEY,
          data: tweets,
          updated_at: new Date().toISOString()
        })
      }
    );
    
    if (!response.ok) {
      console.error('Cache write failed:', response.status);
    }
  } catch (err) {
    console.error('Cache write error:', err);
  }
}

async function fetchFreshTweets() {
  const allTweets = [];
  
  for (const username of TWITTER_ACCOUNTS) {
    try {
      const response = await fetch(
        `https://api.twitterapi.io/twitter/user/last_tweets?userName=${username}`,
        {
          headers: { 'X-API-Key': TWITTER_API_KEY }
        }
      );
      
      if (response.ok) {
        const apiResponse = await response.json();
        const tweets = apiResponse.data?.tweets || apiResponse.tweets || [];
        
        if (Array.isArray(tweets)) {
          tweets.forEach(tweet => {
            allTweets.push({
              id: tweet.id,
              text: tweet.text || tweet.full_text,
              username: tweet.author?.userName || username,
              name: tweet.author?.name || username,
              avatar: tweet.author?.profilePicture || tweet.author?.profile_image_url,
              createdAt: tweet.createdAt || tweet.created_at,
              likes: tweet.likeCount || tweet.favorite_count || 0,
              retweets: tweet.retweetCount || tweet.retweet_count || 0,
              replies: tweet.replyCount || 0,
              views: tweet.viewCount || 0,
              url: `https://twitter.com/${tweet.author?.userName || username}/status/${tweet.id}`
            });
          });
        }
      } else {
        console.error(`Twitter API error for ${username}:`, response.status);
      }
    } catch (err) {
      console.error(`Failed to fetch tweets for ${username}:`, err.message);
    }
  }
  
  // Sort by date (newest first)
  allTweets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return allTweets.slice(0, 50);
}
