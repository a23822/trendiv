/**
 * Browser/Playwright Content Fetcher Service
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { CONFIG } from '../config';
import { ContentFetchError } from '../utils/errors';
import { sanitizeText } from '../utils/helpers';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { ContentFetchResult } from '../types';

chromium.use(stealth());

export class BrowserService {
  private browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * 🆕 한 번 방문으로 텍스트 + 스크린샷 둘 다 가져오기
   */
  async fetchPageContentWithScreenshot(
    url: string,
    title: string,
  ): Promise<{
    content: ContentFetchResult | null;
    screenshot: string | null;
  }> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      const page = await context.newPage();

      // 광고/불필요한 리소스 차단
      await page.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const reqUrl = request.url();

        const blockedTypes = ['media', 'font'];
        const adKeywords = [
          'doubleclick',
          'googlesyndication',
          'adservice',
          'google-analytics',
          'facebook',
          'adnxs',
          'criteo',
        ];

        const isBlockedType = blockedTypes.includes(resourceType);
        const isAd = adKeywords.some((keyword) => reqUrl.includes(keyword));

        if (isBlockedType || isAd) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log(
        `      🌐 Fetching (single visit): ${title.substring(0, 30)}...`,
      );

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

      // 1️⃣ 텍스트 추출
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

      const sanitizedContent = textContent
        ? sanitizeText(textContent, CONFIG.content.maxLength)
        : null;

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
          `      ✅ Content + Screenshot fetched: ${title.substring(0, 30)}...`,
        );
      }

      return { content, screenshot };
    } catch (error: any) {
      console.error(`      ❌ Fetch failed for ${url}:`, error.message);
      return { content: null, screenshot: null };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * 📸 스크린샷만 촬영 (기존 - 호환성 유지)
   */
  async captureScreenshot(url: string): Promise<string | null> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      const page = await context.newPage();

      await page.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const reqUrl = request.url();

        const blockedTypes = ['media', 'font'];
        const adKeywords = [
          'doubleclick',
          'googlesyndication',
          'adservice',
          'google-analytics',
          'facebook',
          'adnxs',
          'criteo',
        ];

        const isBlockedType = blockedTypes.includes(resourceType);
        const isAd = adKeywords.some((keyword) => reqUrl.includes(keyword));

        if (isBlockedType || isAd) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log(`      📸 Navigating to: ${url}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      await page.waitForTimeout(3000);

      await page
        .click('[aria-label*="close"], .js-consent-banner button', {
          timeout: 2000,
        })
        .catch(() => {});

      await page.waitForTimeout(2000);

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
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * 텍스트만 가져오기 (기존 - 호환성 유지)
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

      const content = await page.evaluate(this.extractContent, isYoutube);

      if (!content || content.length < CONFIG.content.minLength) {
        return null;
      }

      return sanitizeText(content, CONFIG.content.maxLength);
    } catch (error) {
      console.error(`      Fetch error for ${url}:`, error);
      return null;
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }

  private extractContent = (isYoutubePage: boolean): string => {
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
  };
}
