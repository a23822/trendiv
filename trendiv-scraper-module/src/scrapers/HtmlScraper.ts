import { Browser, Page } from 'playwright';
import { CONFIG, getRandomContextOptions } from '../config/config';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { Scraper, ScraperConfig, TrendItem } from './interface';

chromium.use(stealth());

export class HtmlScraper implements Scraper {
  constructor(private browser?: Browser) {}

  // 🤖 인간 흉내 내기 함수 (마우스 무브 + 스크롤)
  private async simulateHumanBehavior(page: Page) {
    try {
      // 1. 랜덤한 위치로 마우스 이동 (너무 빠르지 않게)
      const x = Math.floor(Math.random() * 500) + 100;
      const y = Math.floor(Math.random() * 500) + 100;
      await page.mouse.move(x, y, { steps: 10 });

      // 2. 약간의 딜레이 (사람이 화면을 보는 시간)
      await page.waitForTimeout(Math.random() * 500 + 500);

      // 3. 부드럽게 스크롤 조금 내리기
      await page.evaluate(() => {
        window.scrollBy({ top: 300 + Math.random() * 200, behavior: 'smooth' });
      });

      // 4. 스크롤 후 로딩 대기
      await page.waitForTimeout(Math.random() * 500 + 500);
    } catch (e) {
      // 행동 시뮬레이션 실패는 크리티컬하지 않으므로 무시
    }
  }

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🕷️ [HTML] ${config.name} 수집 시작...`);

    if (!config.selector) {
      console.error(`⚠️ ${config.name} 설정 오류: Selector 필수`);
      return [];
    }

    let localBrowser: Browser | null = null;
    let browserToUse = this.browser;

    if (!browserToUse) {
      localBrowser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--disable-images',
          '--disable-extensions',
          '--disable-blink-features=AutomationControlled',
        ],
        env: {
          ...process.env,
          DBUS_SESSION_BUS_ADDRESS: '/dev/null',
        },
      });
      browserToUse = localBrowser;
    }

    let context;
    let page;

    try {
      context = await browserToUse.newContext(getRandomContextOptions());
      await context.addInitScript(() => {
        // WebRTC 비활성화 (IP 유출 방지)
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // @ts-ignore
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // @ts-ignore
          navigator.mediaDevices.getUserMedia = () =>
            Promise.reject(new Error('Permission denied'));
        }
      });

      page = await context.newPage();

      try {
        // 리소스 차단 정책 완화 (JS/XHR 허용)
        await page.route('**/*', async (route) => {
          const request = route.request();
          const resourceType = request.resourceType();
          const url = request.url().toLowerCase();

          // 1. 불필요한 리소스 차단 (이미지, 폰트, 미디어, 스타일)
          if (['image', 'font', 'media', 'imageset'].includes(resourceType)) {
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
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.browser.timeout,
          });

          await this.simulateHumanBehavior(page);

          await page
            .waitForLoadState('networkidle', { timeout: 15000 })
            .catch(() =>
              console.warn(
                `⚠️ [HTML] ${config.name}: 일부 리소스 로딩 지연 (수집은 계속 진행)`,
              ),
            );
        } catch (e) {
          console.error(`❌ [HTML] ${config.name} 페이지 접속 실패:`, e);
          return [];
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
