/**
 * Browser/Playwright Content Fetcher Service
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { CONFIG } from '../config';
import { ContentFetchError } from '../utils/errors';
import { sanitizeText } from '../utils/helpers';

export class BrowserService {
  private browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * 📸 스크린샷 촬영 함수 (새로 추가)
   */
  async captureScreenshot(url: string): Promise<string | null> {
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      context = await this.browser.newContext({
        userAgent: CONFIG.browser.userAgent,
        viewport: { width: 1280, height: 800 }, // 적절한 해상도 설정
      });

      page = await context.newPage();

      await page.goto(url, {
        waitUntil: 'networkidle', // 리소스 로딩이 어느 정도 끝날 때까지 대기
        timeout: CONFIG.browser.timeout,
      });

      // 스크린샷 촬영 (Base64)
      const buffer = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: true,
      });

      return buffer.toString('base64');
    } catch (error) {
      // 에러 로그는 남기되 null 반환 (분석 건너뛰기)
      console.error(`📸 Screenshot failed for ${url}:`, error);
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  /**
   * Fetch page content with proper resource cleanup
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

      // Block unnecessary resources
      await page.route('**/*.{png,jpg,jpeg,svg,woff,woff2,mp4,webm}', (route) =>
        route.abort(),
      );

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.browser.timeout,
      });

      const content = await page.evaluate(this.extractContent, isYoutube);

      if (!content || content.length < CONFIG.content.minLength) {
        return null;
      }

      return sanitizeText(content, CONFIG.content.maxLength);
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error);
      return null;
    } finally {
      // ✅ Proper cleanup: page -> context 순서
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }

  /**
   * Content extraction logic (runs in browser context)
   */
  private extractContent = (isYoutubePage: boolean): string => {
    // 1. YouTube: Extract description from meta tag
    if (isYoutubePage) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        return (metaDesc as HTMLMetaElement).content;
      }
      return document.body.innerText;
    }

    // 2. Regular webpage: Remove clutter and extract main content
    const trash = document.querySelectorAll(
      'script, style, nav, footer, header, aside, .ads, .comments, #comments, iframe',
    );
    trash.forEach((el) => el.remove());

    const article = document.querySelector(
      'article, main, .post-content, .entry-content',
    ) as HTMLElement | null;

    return (article || document.body).innerText;
  };
}
