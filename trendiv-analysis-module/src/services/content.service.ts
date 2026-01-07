/**
 * Content Fetcher Orchestrator
 * Decides how to fetch content based on URL type
 */

import { Browser } from 'playwright';
import { ContentFetchResult } from '../types';
import { isYoutubeLink } from '../utils/helpers';
import { BrowserService } from './browser.service';
import { YouTubeService } from './youtube.service';

export class ContentService {
  private browserService: BrowserService;
  private youtubeService: YouTubeService;

  constructor(browser: Browser) {
    this.browserService = new BrowserService(browser);
    this.youtubeService = new YouTubeService();
  }

  /**
   * Fetch content with automatic type detection
   */
  async fetchContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    try {
      const isYoutube = isYoutubeLink(url);

      if (isYoutube) {
        return await this.fetchYoutubeContent(url, title);
      }

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
      const isYoutube = isYoutubeLink(url);

      if (isYoutube) {
        // YouTube는 스크린샷 불필요 (transcript/description 사용)
        const content = await this.fetchYoutubeContent(url, title);
        return { content, screenshot: null };
      }

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
   * YouTube content fetching strategy
   */
  private async fetchYoutubeContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    const safeTitle = title?.substring(0, 30) || 'Unknown';

    try {
      // 1️⃣ Try transcript first
      const transcript = await this.youtubeService.fetchTranscript(url);
      if (transcript) {
        console.log(`      ✅ Transcript fetched for: ${safeTitle}...`);
        return {
          content: transcript,
          type: 'youtube',
          source: 'transcript',
        };
      }

      // 2️⃣ Fallback to description
      console.log(
        `      ℹ️ No transcript, using description for: ${safeTitle}...`,
      );
      const description = await this.browserService.fetchPageContent(url, true);

      if (description) {
        return {
          content: description,
          type: 'youtube',
          source: 'description',
        };
      }

      return null;
    } catch (error: any) {
      console.error(
        `      ❌ YouTube fetch failed for ${safeTitle}:`,
        error.message,
      );
      return null;
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
