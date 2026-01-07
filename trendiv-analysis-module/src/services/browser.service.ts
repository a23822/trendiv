/**
 * Browser/Playwright Content Fetcher Service
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { CONFIG } from '../config';
import { sanitizeText } from '../utils/helpers';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { ContentFetchResult } from '../types';

chromium.use(stealth());

// 🆕 공통 브라우저 설정
const BROWSER_CONFIG = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
};

const AD_KEYWORDS = [
  'doubleclick',
  'googlesyndication',
  'adservice',
  'google-analytics',
  'facebook',
  'adnxs',
  'criteo',
];

export class BrowserService {
  private browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * 🆕 공통 페이지 설정 (중복 제거)
   */
  private async createConfiguredPage(): Promise<{
    context: BrowserContext;
    page: Page;
  }> {
    const context = await this.browser.newContext({
      userAgent: BROWSER_CONFIG.userAgent,
      viewport: BROWSER_CONFIG.viewport,
      locale: BROWSER_CONFIG.locale,
      timezoneId: BROWSER_CONFIG.timezoneId,
    });

    const page = await context.newPage();

    // 광고/불필요한 리소스 차단
    await page.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      const reqUrl = request.url();

      const blockedTypes = ['media', 'font'];
      const isBlockedType = blockedTypes.includes(resourceType);
      const isAd = AD_KEYWORDS.some((keyword) => reqUrl.includes(keyword));

      if (isBlockedType || isAd) {
        route.abort();
      } else {
        route.continue();
      }
    });

    return { context, page };
  }

  /**
   * 🆕 공통 페이지 네비게이션 + 팝업 닫기
   */
  private async navigateAndPrepare(page: Page, url: string): Promise<void> {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    // 팝업/쿠키 배너 닫기
    await page
      .click('[aria-label*="close"], .js-consent-banner button', {
        timeout: 2000,
      })
      .catch(() => {});

    await page.waitForTimeout(1000);
  }

  /**
   * 🆕 공통 텍스트 추출
   */
  private async extractTextContent(page: Page): Promise<string | null> {
    const textContent = await page.evaluate(() => {
      const trash = document.querySelectorAll(
        'script, style, nav, footer, header, aside, .ads, .comments, #comments, iframe',
      );
      trash.forEach((el) => el.remove());

      const article = document.querySelector(
        'article, main, .post-content, .entry-content',
      ) as HTMLElement | null;

      return (article || document.body).innerText;
    });

    return textContent
      ? sanitizeText(textContent, CONFIG.content.maxLength)
      : null;
  }

  /**
   * 한 번 방문으로 텍스트 + 스크린샷 둘 다 가져오기
   * 🆕 주입받은 browser 인스턴스 재사용
   */
  async fetchPageContentWithScreenshot(
    url: string,
    title: string,
  ): Promise<{
    content: ContentFetchResult | null;
    screenshot: string | null;
  }> {
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const configured = await this.createConfiguredPage();
      context = configured.context;
      page = configured.page;

      console.log(
        `      🌐 Fetching (single visit): ${(title || '').substring(0, 30)}...`,
      );

      await this.navigateAndPrepare(page, url);

      // 1️⃣ 텍스트 추출
      const sanitizedContent = await this.extractTextContent(page);

      // 2️⃣ 스크린샷 캡처
      const buffer = await page.screenshot({
        fullPage: false,
        type: 'jpeg',
        quality: 80,
      });
      const screenshot = buffer.toString('base64');

      // 결과 반환
      const content: ContentFetchResult | null = sanitizedContent
        ? {
            content: sanitizedContent,
            type: 'webpage',
            source: 'webpage',
          }
        : null;

      if (content) {
        console.log(
          `      ✅ Content + Screenshot fetched: ${(title || '').substring(0, 30)}...`,
        );
      }

      return { content, screenshot };
    } catch (error: any) {
      console.error(`      ❌ Fetch failed for ${url}:`, error.message);
      return { content: null, screenshot: null };
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  /**
   * 📸 스크린샷만 촬영
   * 🆕 주입받은 browser 인스턴스 재사용
   */
  async captureScreenshot(url: string): Promise<string | null> {
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const configured = await this.createConfiguredPage();
      context = configured.context;
      page = configured.page;

      console.log(`      📸 Navigating to: ${url}`);

      await this.navigateAndPrepare(page, url);

      const buffer = await page.screenshot({
        fullPage: false,
        type: 'jpeg',
        quality: 80,
      });

      return buffer.toString('base64');
    } catch (error: any) {
      console.error(`      📸 Screenshot failed for ${url}:`, error.message);
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  /**
   * 텍스트만 가져오기
   */
  async fetchPageContent(
    url: string,
    isYoutube: boolean,
  ): Promise<string | null> {
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      context = await this.browser.newContext({
        userAgent: CONFIG.browser.userAgent,
      });

      page = await context.newPage();

      await page.route('**/*.{png,jpg,jpeg,svg,woff,woff2,mp4,webm}', (route) =>
        route.abort(),
      );

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.browser.timeout,
      });

      const content = await page.evaluate((isYoutubePage: boolean) => {
        if (isYoutubePage) {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            return (metaDesc as HTMLMetaElement).content;
          }
          return document.body.innerText;
        }

        const trash = document.querySelectorAll(
          'script, style, nav, footer, header, aside, .ads, .comments, #comments, iframe',
        );
        trash.forEach((el) => el.remove());

        const article = document.querySelector(
          'article, main, .post-content, .entry-content',
        ) as HTMLElement | null;

        return (article || document.body).innerText;
      }, isYoutube);

      if (!content || content.length < CONFIG.content.minLength) {
        return null;
      }

      return sanitizeText(content, CONFIG.content.maxLength);
    } catch (error) {
      console.error(`      Fetch error for ${url}:`, error);
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }
}
