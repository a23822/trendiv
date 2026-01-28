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
  private readonly AUTH_URL = 'https://www.reddit.com/api/v1/access_token';
  private readonly API_BASE = 'https://oauth.reddit.com';
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
        this.AUTH_URL,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NodeJS:Trendiv:v1.0 (by /u/BNcQxa97uk45gMa8vYAVcw)',
          },
          timeout: 10000,
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + response.data.expires_in * 1000 - 60000;
      return this.accessToken;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          '❌ Reddit Token Error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('❌ Reddit Token Unknown Error:', error);
      }
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
        `${this.API_BASE}/r/${subreddit}/${sort}`,
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

      return posts.map((post: any) => {
        const p = post?.data || {};
        const isSelf = p.url && p.url.includes('reddit.com');
        const finalLink = isSelf
          ? `https://www.reddit.com${p.permalink}`
          : p.url;

        return {
          title: p.title || '제목 없음',
          link: finalLink || '',
          date: p.created_utc
            ? new Date(p.created_utc * 1000).toISOString()
            : new Date().toISOString(),
          source: `${config.name}/${p.subreddit ?? p.subreddit}`,
          category: config.category,
          content:
            p.selftext && p.selftext.trim() !== '' ? p.selftext : p.title,
        };
      });
    } catch (error: unknown) {
      let msg = 'Unknown Error';
      if (axios.isAxiosError(error)) {
        msg = error.message;
        if (error.response?.status === 403)
          msg += ' (403 Forbidden - Bot blocked)';
      } else if (error instanceof Error) {
        msg = error.message;
      }
      console.error(`❌ [Reddit API] ${config.name} 실패: ${msg}`);
      return [];
    }
  }
}
