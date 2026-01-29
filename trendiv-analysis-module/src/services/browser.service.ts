/**
 * Browser/Playwright Content Fetcher Service
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { CONFIG } from '../config';
import { sanitizeText } from '../utils/helpers';
import { ContentFetchResult } from '../types';

const AD_KEYWORDS = [
  'doubleclick',
  'googlesyndication',
  'adservice',
  'google-analytics',
  'facebook',
  'adnxs',
  'criteo',
  'amazon-adsystem',
  'moatads',
  'pubmatic',
  'rubiconproject',
  'taboola',
  'outbrain',
];

export class BrowserService {
  private browser: Browser;
  private sharedContext: BrowserContext;

  constructor(browser: Browser, sharedContext: BrowserContext) {
    this.browser = browser;
    this.sharedContext = sharedContext;
  }

  private async simulateHumanBehavior(page: Page) {
    try {
      // 1. 마우스 커서를 랜덤하게 움직임 (직선이 아닌 곡선처럼 보이게 steps 설정)
      const x = Math.floor(Math.random() * 500) + 100;
      const y = Math.floor(Math.random() * 500) + 100;
      await page.mouse.move(x, y, { steps: 15 });

      // 2. 잠깐 멈칫 (0.5 ~ 1초)
      await page.waitForTimeout(Math.random() * 500 + 500);

      // 3. 스크롤을 부드럽게 내림 (Lazy Loading 데이터 유도)
      await page.evaluate(() => {
        window.scrollBy({ top: 300 + Math.random() * 200, behavior: 'smooth' });
      });

      // 4. 로딩 대기
      await page.waitForTimeout(Math.random() * 500 + 500);
    } catch (e) {
      // 행동 시뮬레이션 중 에러는 무시 (메인 로직 방해 금지)
    }
  }

  private async getPage(): Promise<Page> {
    // 이미 있는 sharedContext에서 탭(Page)만 새로 엽니다.
    const page = await this.sharedContext.newPage();

    // 리소스 차단 설정 (메모리 절약)
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      const url = route.request().url();

      // 1. 메모리 많이 먹는 리소스 차단
      const blockedTypes = ['image', 'media', 'font', 'other'];
      if (blockedTypes.includes(type)) {
        return route.abort();
      }

      if (AD_KEYWORDS.some((k) => url.includes(k))) {
        return route.abort();
      }

      route.continue();
    });

    return page;
  }

  async fetchPageContent(
    url: string,
    isYoutube: boolean = false,
  ): Promise<string | null> {
    let page: Page | null = null;
    try {
      page = await this.getPage();

      await this.navigateAndPrepare(page, url);

      const content = await this.extractTextContent(page, isYoutube);

      if (!content || content.length < CONFIG.content.minLength) {
        return null;
      }
      return sanitizeText(content, CONFIG.content.maxLength);
    } catch (error: any) {
      console.error(`      Fetch error for ${url}:`, error.message);
      return null;
    } finally {
      // 페이지는 닫고, 컨텍스트는 유지
      if (page) await page.close().catch(() => {});
    }
  }

  async fetchPageContentWithScreenshot(
    url: string,
    title: string,
  ): Promise<{
    content: ContentFetchResult | null;
    screenshot: string | null;
  }> {
    let page: Page | null = null;
    try {
      page = await this.getPage();
      console.log(`      🌐 Fetching: ${title.substring(0, 30)}...`);

      await this.navigateAndPrepare(page, url);

      // 1. 텍스트 추출
      const rawText = await this.extractTextContent(page, false);
      const sanitized = rawText
        ? sanitizeText(rawText, CONFIG.content.maxLength)
        : null;

      const contentResult: ContentFetchResult | null = sanitized
        ? {
            content: sanitized,
            type: 'webpage',
            source: 'webpage',
          }
        : null;

      // 2. 스크린샷 캡처
      const buffer = await page.screenshot({
        fullPage: false,
        type: 'jpeg',
        quality: 80,
      });
      const screenshot = buffer.toString('base64');

      return { content: contentResult, screenshot };
    } catch (error: any) {
      console.error(`      ❌ Fetch error: ${error.message}`);
      return { content: null, screenshot: null };
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  private async navigateAndPrepare(page: Page, url: string) {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.browser.timeout,
    });

    await this.simulateHumanBehavior(page);

    await page
      .waitForLoadState('networkidle', { timeout: 3000 })
      .catch(() => {});
  }

  private async extractTextContent(page: Page, isYoutube: boolean = false) {
    return await page.evaluate((isYoutubePage) => {
      if (isYoutubePage) {
        const metaDesc = document.querySelector('meta[name="description"]');
        return metaDesc
          ? (metaDesc as HTMLMetaElement).content
          : document.body.innerText;
      }
      const trash = document.querySelectorAll(
        'script, style, nav, footer, header, aside, .ads, .comments, iframe',
      );
      trash.forEach((el) => el.remove());
      const article = document.querySelector(
        'article, main, .post-content, .entry-content',
      ) as HTMLElement;
      return (article || document.body).innerText;
    }, isYoutube);
  }
}
