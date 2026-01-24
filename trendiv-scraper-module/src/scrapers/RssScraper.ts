import Parser from 'rss-parser';
import axios from 'axios';
import { chromium } from 'playwright';
import { Scraper, ScraperConfig, TrendItem } from './interface';

// rss2json 응답 타입
interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  content?: string;
}

interface Rss2JsonResponse {
  status: string;
  items: Rss2JsonItem[];
}

export class RssScraper implements Scraper {
  private parser = new Parser();
  private readonly RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`📡 [RSS] ${config.name} 수집 시작...`);

    // 프록시 모드
    if (config.useProxy) {
      return this.fetchWithProxy(config);
    }

    // 기존 로직
    let xmlData = '';

    try {
      // 1차 시도: 가벼운 Axios로 요청
      const response = await axios.get(config.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        },
        timeout: 5000,
        responseType: 'text',
      });
      xmlData = response.data;
    } catch (error: any) {
      if (
        error.response &&
        (error.response.status === 406 || error.response.status === 403)
      ) {
        console.log(
          `⚠️ [RSS] ${config.name} 보안 감지! 브라우저 모드로 우회합니다...`,
        );
        xmlData = await this.fetchWithBrowser(config.url);
      } else {
        console.error(`❌ [RSS] ${config.name} 실패: ${error.message}`);
        return [];
      }
    }

    if (!xmlData) return [];

    try {
      const cleanXml = xmlData
        .toString()
        .trim()
        .replace(/^\uFEFF/, '')
        .replace(/<(?=\s|[0-9])/g, '&lt;');

      const feed = await this.parser.parseString(cleanXml);

      return feed.items.map((item) => {
        const content =
          item.contentSnippet || item.content || item.summary || '';
        const date = item.isoDate || item.pubDate || new Date().toISOString();

        return {
          title: item.title?.trim() || '제목 없음',
          link: item.link || '',
          date: date,
          source: config.name,
          category: config.category,
          content: content,
        };
      });
    } catch (parseError) {
      console.error(`❌ [RSS] ${config.name} 파싱 에러:`, parseError);
      return [];
    }
  }

  private async fetchWithProxy(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`   🔄 Using rss2json proxy...`);

    try {
      const response = await axios.get<Rss2JsonResponse>(this.RSS2JSON_API, {
        params: {
          rss_url: config.url,
        },
        timeout: 10000,
      });

      if (response.data.status !== 'ok') {
        console.error(
          `❌ [RSS Proxy] ${config.name} 실패: ${response.data.status}`,
        );
        return [];
      }

      const items = response.data.items.map((item) => ({
        title: item.title?.trim() || '제목 없음',
        link: item.link || '',
        date: item.pubDate || new Date().toISOString(),
        source: config.name,
        category: config.category,
        content: item.description || item.content || '',
      }));

      console.log(`   ✅ Proxy success: ${items.length}개 수집`);
      return items;
    } catch (error: any) {
      console.error(`❌ [RSS Proxy] ${config.name} 실패: ${error.message}`);
      return [];
    }
  }

  private async fetchWithBrowser(url: string): Promise<string> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    try {
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      if (!response) throw new Error('No response');
      return await response.text();
    } catch (e) {
      console.error(`❌ 브라우저 모드 실패:`, e);
      return '';
    } finally {
      await browser.close();
    }
  }
}
