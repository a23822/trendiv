import { chromium, Browser } from 'playwright';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class HtmlScraper implements Scraper {
  constructor(private browser?: Browser) {}

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🕷️ [HTML] ${config.name} 수집 시작...`);

    if (!config.selector) {
      console.error(`⚠️ ${config.name} 설정 오류: Selector 필수`);
      return [];
    }

    let localBrowser: Browser | null = null;
    let browserToUse = this.browser;

    if (!browserToUse) {
      localBrowser = await chromium.launch({ headless: true });
      browserToUse = localBrowser;
    }

    let context;
    let page;

    try {
      context = await browserToUse.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      page = await context.newPage();

      try {
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            return route.abort();
          }
          return route.continue();
        });

        // 1. 페이지 접속
        await page.goto(config.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        // 요소 대기
        try {
          await page.waitForSelector(config.selector, {
            timeout: 10000,
            state: 'visible',
          });
        } catch (e) {
          console.log(
            `⚠️ ${config.name}: 요소를 찾는 데 시간이 너무 걸립니다.`,
          );
        }

        // 2. 데이터 추출
        const trends = await page.evaluate((selector) => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements
            .map((el) => {
              const linkEl =
                el.tagName === 'A'
                  ? el
                  : el.closest('a') || el.querySelector('a');
              const titleText = el.textContent?.trim();

              return {
                title: titleText,
                link: linkEl?.getAttribute('href') || undefined,
                date: new Date().toISOString(),
                summary: '',
              };
            })
            .filter((item) => item.title && item.link);
        }, config.selector);

        // 링크 정제
        const finalTrends = trends.map((t) => ({
          ...t,
          source: config.name,
          category: config.category,
          link: t.link?.startsWith('http')
            ? t.link
            : new URL(t.link || '', config.url).href,
        }));

        return finalTrends;
      } catch (error) {
        console.error(`❌ [HTML] ${config.name} 에러:`, error);
        return [];
      }
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});

      if (localBrowser) {
        await localBrowser.close();
      }
    }
  }
}
