import axios from 'axios';
import { Scraper, ScraperConfig, TrendItem } from './interface';

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    created_utc: number;
    selftext?: string;
    subreddit: string;
    author: string;
    id: string;
    url?: string;
  };
}

export class RedditScraper implements Scraper {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('❌ Reddit API Credentials missing in process.env');
      return null;
    }

    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NodeJS:TrendivScraper:v1.0 (by /u/trendiv_dev)',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + response.data.expires_in * 1000 - 60000;
      return this.accessToken;
    } catch (error: any) {
      console.error(
        '❌ Reddit OAuth Token Error:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`📡 [Reddit API] ${config.name} 수집 시작...`);

    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const urlObj = new URL(config.url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const rIndex = pathParts.indexOf('r');
      const subreddit = rIndex !== -1 ? pathParts[rIndex + 1] : 'all';

      const sort = pathParts.includes('top')
        ? 'top'
        : pathParts.includes('new')
          ? 'new'
          : 'hot';

      const response = await axios.get(
        `https://oauth.reddit.com/r/${subreddit}/${sort}`,
        {
          params: {
            limit: 15,
            t: urlObj.searchParams.get('t') || 'day',
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Trendiv/0.1 by TrendivBot',
          },
          timeout: 10000,
        },
      );

      const posts = response.data?.data?.children || [];

      return posts.map((post: any) => ({
        title: post.data.title,
        link: `https://www.reddit.com${post.data.permalink}`,
        date: new Date(post.data.created_utc * 1000).toISOString(),
        source: config.name,
        category: config.category,
        content: post.data.selftext || '',
      }));
    } catch (error: any) {
      console.error(
        `❌ [Reddit API] ${config.name} Fetch Error:`,
        error.message,
      );
      return [];
    }
  }
}
