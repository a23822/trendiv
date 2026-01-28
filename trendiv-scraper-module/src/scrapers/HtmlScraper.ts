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
        // 리소스 차단 정책 완화 (JS/XHR 허용)
        await page.route('**/*', async (route) => {
          const request = route.request();
          const resourceType = request.resourceType();
          const url = request.url().toLowerCase();

          // 1. 불필요한 리소스 차단 (이미지, 폰트, 미디어, 스타일)
          if (
            ['image', 'font', 'media', 'stylesheet', 'imageset'].includes(
              resourceType,
            )
          ) {
            return await route.abort();
          }

          // 2. 네트워크를 붙잡고 있는 광고/채팅/분석 도구 키워드 차단
          const blockList = [
            'googleadservices',
            'googlesyndication',
            'doubleclick', // 구글 광고
            'google-analytics',
            'googletagmanager', // 분석 도구 (계속 통신함)
            'facebook',
            'twitter',
            'linkedin', // 소셜 추적기
            'intercom',
            'zendesk',
            'crisp',
            'channel.io', // 채팅 위젯 (주범!)
            'hotjar',
            'sentry',
            'datadog', // 모니터링 툴
            'adsystem',
            'adserver', // 일반 광고
          ];

          // URL에 차단 키워드가 포함되어 있으면 즉시 연결 끊기
          if (blockList.some((keyword) => url.includes(keyword))) {
            return await route.abort();
          }

          // 나머지는 통과
          return await route.continue();
        });

        // 1. 페이지 접속
        // 데이터가 완전히 다 뜰 때까지 기다립니다.
        try {
          await page.goto(config.url, {
            waitUntil: 'networkidle',
            timeout: 20000,
          });
        } catch (e) {
          console.warn(
            `⚠️ [HTML] ${config.name} 완전 로딩 타임아웃 (수집은 시도함)`,
          );
        }
        // 요소 대기
        try {
          await page.waitForSelector(config.selector, {
            timeout: 15000,
            state: 'attached',
          });
        } catch {
          console.warn(
            `⚠️ [HTML] ${config.name}: Selector 타임아웃. (빈 결과 가능성)`,
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
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ [HTML] ${config.name} 처리 중 에러:`, errorMsg);
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
