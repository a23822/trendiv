/**
 * Browser/Playwright Content Fetcher Service
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { CONFIG, POOLS } from '../config';
import { sanitizeText } from '../utils/helpers';
import { ContentFetchResult } from '../types';
import path from 'path';

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
    if (!POOLS.viewports || POOLS.viewports.length === 0) {
      throw new Error('No viewports configured in POOLS');
    }

    const viewport =
      POOLS.viewports[Math.floor(Math.random() * POOLS.viewports.length)];
    // 이미 있는 sharedContext에서 탭(Page)만 새로 엽니다.
    const page = await this.sharedContext.newPage();

    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    // 리소스 차단 설정 (메모리 절약)
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      const url = route.request().url();

      // 1. 메모리 많이 먹는 리소스 차단
      const blockedTypes = ['media', 'font', 'other'];
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

  async fetchPageContent(url: string): Promise<string | null> {
    let page: Page | null = null;
    try {
      page = await this.getPage();

      await this.navigateAndPrepare(page, url);

      const content = await this.extractTextContent(page);

      if (!content || content.length < CONFIG.content.minLength) {
        return null;
      }
      return sanitizeText(content, CONFIG.content.maxLength);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`      Fetch error for ${url}:`, msg);
      return null;
    } finally {
      // 페이지는 닫고, 컨텍스트는 유지
      if (page)
        await page.close().catch((e) => console.warn('Page close error:', e));
    }
  }

  async fetchPageContentWithScreenshot(
    url: string,
    title: string,
  ): Promise<{
    content: ContentFetchResult | null;
    screenshots: string[] | null;
  }> {
    let page: Page | null = null;
    try {
      // [메모리 체크 강화] 시작부터 너무 높으면 아예 진입 차단 (2.5GB)
      const used = process.memoryUsage();
      if (used.rss > 2.5 * 1024 * 1024 * 1024) {
        console.warn(
          `🔥 Critical memory usage (RSS: ${(used.rss / 1024 / 1024).toFixed(1)}MB) - Skipping fetch entirely for safety.`,
        );
        return { content: null, screenshots: null };
      }

      page = await this.getPage();
      console.log(`      🌐 Fetching: ${title.substring(0, 30)}...`);
      console.log('fetchPageContentWithScreenshot');

      // 2.0GB 넘으면 경고 및 스크린샷 스킵 여부 판단
      if (used.rss > 2.0 * 1024 * 1024 * 1024) {
        console.warn(
          `High memory usage (RSS: ${(used.rss / 1024 / 1024).toFixed(1)}MB), proceed with caution...`,
        );
      }

      await this.navigateAndPrepare(page, url);

      // 3. 다시 설정할 필요 없이, 이미 설정된 높이값을 가져와서 사용함
      const viewportSize = page.viewportSize();
      const vh = viewportSize ? viewportSize.height : 800;

      const screenshots: string[] = [];

      const quality = used.rss > 1.8 * 1024 ** 3 ? 60 : 70;

      // 최대 3번 분할 캡처
      for (let i = 0; i < 2; i++) {
        const buffer = await page.screenshot({
          fullPage: false, // 뷰포트 크기만큼만 촬영
          type: 'jpeg',
          quality: quality,
        });
        screenshots.push(buffer.toString('base64'));

        if (i < 2) {
          // 이미 설정된 뷰포트 높이만큼 정확히 스크롤
          await page.evaluate((height) => window.scrollBy(0, height), vh);
          await page.waitForTimeout(700);
        }
      }

      // 4. 최대 3회 분할 캡처 로직 추가
      const rawText = await this.extractTextContent(page);
      const contentResult: ContentFetchResult | null = rawText
        ? {
            content: sanitizeText(rawText, CONFIG.content.maxLength),
            type: 'webpage' as const,
            source: 'webpage',
          }
        : null;

      return { content: contentResult, screenshots };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`      ❌ Fetch error: ${msg}`);
      return { content: null, screenshots: null };
    } finally {
      if (page)
        await page.close().catch((e) => console.warn('Page close error:', e));
    }
  }

  private async navigateAndPrepare(page: Page, url: string) {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.browser.timeout,
    });

    await this.simulateHumanBehavior(page);
  }

  private async extractTextContent(page: Page): Promise<string | null> {
    try {
      // 1. 경로 찾기
      let readabilityPath: string;
      try {
        readabilityPath = require.resolve(
          '@mozilla/readability/Readability.js',
        );
      } catch (error: unknown) {
        console.warn(
          '      ⚠️ require.resolve failed, trying fallback path...',
        );
        readabilityPath = path.join(
          process.cwd(),
          'node_modules/@mozilla/readability/Readability.js',
        );
      }

      // 안전장치: 파일 실제 존재 여부 확인
      const fs = require('fs');
      if (!fs.existsSync(readabilityPath)) {
        console.error(
          `Readability.js 파일을 찾을 수 없습니다: ${readabilityPath}`,
        );
        return await page.evaluate(() => document.body.innerText);
      }

      // 2. 브라우저 페이지에 스크립트 주입 (File I/O는 Playwright가 처리)
      await page.addScriptTag({ path: readabilityPath });

      // 3. Readability 로드 대기 (최대 5초)
      try {
        await page.waitForFunction(
          () => typeof (window as any).Readability !== 'undefined',
          {
            timeout: 5000,
          },
        );
      } catch (e) {
        console.warn(
          '      ⚠️ Readability load timeout, falling back to innerText',
        );
      }

      // 4. 실행 (cloneNode 제거로 메모리 절약)
      const extractedText = await page.evaluate(() => {
        // @ts-ignore
        if (typeof Readability === 'undefined') return document.body.innerText;

        // 네이버 블로그 iframe 대응 (name="mainFrame")
        if (window.location.href.includes('blog.naver.com')) {
          const mainFrame = document.querySelector(
            'iframe[name="mainFrame"]',
          ) as HTMLIFrameElement;
          if (mainFrame && mainFrame.contentDocument) {
            // iframe 내부는 cloneNode 사용 추천 (안전성) 혹은 그대로 사용
            // @ts-ignore
            const reader = new Readability(mainFrame.contentDocument);
            return reader.parse()?.textContent;
          }
        }

        // 일반 페이지: document 직접 전달 (메모리 절약)
        // @ts-ignore
        const reader = new Readability(document);
        const article = reader.parse();
        return article ? article.textContent : document.body.innerText;
      });

      return extractedText || null;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('      ⚠️ extractTextContent failed:', msg);
      // 실패 시 최소한의 텍스트라도 건지기 위해 innerText 시도
      try {
        return await page.evaluate(() => document.body.innerText);
      } catch (fallbackErr) {
        console.error('Fallback innerText also failed:', fallbackErr);
        return '';
      }
    }
  }
}
