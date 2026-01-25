/**
 * Content Fetcher Orchestrator
 * Decides how to fetch content based on URL type
 */

import { Browser } from 'playwright';
import { ContentFetchResult } from '../types';
import { BrowserService } from './browser.service';
import { YouTubeService } from './youtube.service';

export class ContentService {
  private browserService: BrowserService;

  constructor(browser: Browser) {
    this.browserService = new BrowserService(browser);
  }

  /**
   * Fetch content with automatic type detection
   */
  async fetchContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    try {
      return await this.fetchWebpageContent(url, title);
    } catch (error: any) {
      console.error(`      ❌ fetchContent failed for ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch content + screenshot in single visit
   */
  async fetchContentWithScreenshot(
    url: string,
    title: string,
  ): Promise<{
    content: ContentFetchResult | null;
    screenshot: string | null;
  }> {
    try {
      // 웹페이지: 한 번에 텍스트 + 스크린샷
      return await this.browserService.fetchPageContentWithScreenshot(
        url,
        title,
      );
    } catch (error: any) {
      console.error(
        `      ❌ fetchContentWithScreenshot failed for ${url}:`,
        error.message,
      );
      return { content: null, screenshot: null };
    }
  }

  /**
   * Webpage content fetching
   */
  private async fetchWebpageContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    const safeTitle = title?.substring(0, 30) || 'Unknown';

    try {
      const content = await this.browserService.fetchPageContent(url, false);

      if (content) {
        console.log(`      ✅ Webpage content fetched: ${safeTitle}...`);
        return {
          content,
          type: 'webpage',
          source: 'webpage',
        };
      }

      return null;
    } catch (error: any) {
      console.error(
        `      ❌ Webpage fetch failed for ${safeTitle}:`,
        error.message,
      );
      return null;
    }
  }
}
