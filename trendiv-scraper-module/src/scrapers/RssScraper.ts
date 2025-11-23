import Parser from 'rss-parser';
import axios from 'axios';
import { chromium } from 'playwright';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class RssScraper implements Scraper {
  private parser = new Parser();

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`📡 [RSS] ${config.name} 수집 시작...`);

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
        timeout: 5000, // 5초만 대기
        responseType: 'text',
      });
      xmlData = response.data;
    } catch (error: any) {
      // 406(Not Acceptable)이나 403(Forbidden) 에러 시 브라우저 모드로 전환
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
      // 데이터 전처리 (Swift.org 에러 해결용: BOM 및 공백 제거)
      const cleanXml = xmlData
        .toString()
        .trim()
        .replace(/^\uFEFF/, '');

      const feed = await this.parser.parseString(cleanXml);

      return feed.items.map((item) => {
        const summary =
          item.contentSnippet || item.content || item.summary || '';
        const date = item.isoDate || item.pubDate || new Date().toISOString();

        return {
          title: item.title?.trim() || '제목 없음',
          link: item.link || '',
          date: date,
          summary:
            summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
          source: config.name,
        };
      });
    } catch (parseError) {
      console.error(`❌ [RSS] ${config.name} 파싱 에러:`, parseError);
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
      // 페이지에 접속해서 서버가 주는 원본 텍스트(XML)를 받아옴
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      if (!response) throw new Error('No response');
      return await response.text(); // XML 내용을 텍스트로 반환
    } catch (e) {
      console.error(`❌ 브라우저 모드 실패:`, e);
      return '';
    } finally {
      await browser.close();
    }
  }
}
