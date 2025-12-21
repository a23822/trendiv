/**
 * Browser/Playwright Content Fetcher Service
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { CONFIG } from '../config';
import { ContentFetchError } from '../utils/errors';
import { sanitizeText } from '../utils/helpers';
import { chromium } from 'playwright';

export class BrowserService {
  private browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * 📸 스크린샷 촬영 함수 (새로 추가)
   */
  async captureScreenshot(url: string): Promise<string | null> {
    let browser;
    try {
      // 1. 브라우저 실행 시 User-Agent 설정 (봇 탐지 회피)
      browser = await chromium.launch({
        headless: true,
        // headless: false, // 로컬 디버깅용
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // 자동화 탐지 우회
        ],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }, // 데스크탑 해상도
      });

      const page = await context.newPage();

      // 🚫 광고 및 불필요한 리소스 차단 (로딩 속도 향상 + 광고 회피)
      await page.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        // 1. 차단할 리소스 타입 (이미지는 허용해야 함!)
        const blockedTypes = ['media', 'font', 'stylesheet'];
        // stylesheet도 막으면 레이아웃이 깨지므로 상황 봐서 뺄 것.
        // 보통 폰트와 미디어만 막아도 충분합니다.

        // 2. 차단할 키워드 (광고/트래킹 도메인)
        const adKeywords = [
          'doubleclick',
          'googlesyndication',
          'adservice',
          'google-analytics',
          'facebook',
          'adnxs',
          'criteo',
        ];

        // 조건 검사
        const isBlockedType = blockedTypes.includes(resourceType);
        const isAd = adKeywords.some((keyword) => url.includes(keyword));

        if (isBlockedType || isAd) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log(`📸 Navigating to: ${url}`);

      // 2. 페이지 이동 (타임아웃 처리 강화)
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // 팝업/쿠키 배너 자동 닫기 (스택오버플로우 등)
      await page
        .click('[aria-label*="close"], .js-consent-banner button', {
          timeout: 2000,
        })
        .catch(() => {}); // 없으면 무시

      // 콘텐츠 렌더링 대기
      await page.waitForTimeout(2000);

      // 스크린샷 캡처 (viewport 기준)
      const buffer = await page.screenshot({
        fullPage: false,
        type: 'jpeg', // PNG보다 용량 작음
        quality: 80,
      });

      return buffer.toString('base64');
    } catch (error: any) {
      console.error(`📸 Screenshot failed for ${url}:`, error.message);
      return null;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
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
