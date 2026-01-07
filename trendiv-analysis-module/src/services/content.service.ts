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
    const isYoutube = isYoutubeLink(url);

    if (isYoutube) {
      return await this.fetchYoutubeContent(url, title);
    }

    return await this.fetchWebpageContent(url, title);
  }

  /**
   * 🆕 Fetch content + screenshot in single visit
   */
  async fetchContentWithScreenshot(
    url: string,
    title: string,
  ): Promise<{
    content: ContentFetchResult | null;
    screenshot: string | null;
  }> {
    const isYoutube = isYoutubeLink(url);

    if (isYoutube) {
      // YouTube는 스크린샷 불필요 (transcript/description 사용)
      const content = await this.fetchYoutubeContent(url, title);
      return { content, screenshot: null };
    }

    // 웹페이지: 한 번에 텍스트 + 스크린샷
    return await this.browserService.fetchPageContentWithScreenshot(url, title);
  }

  /**
   * YouTube content fetching strategy
   */
  private async fetchYoutubeContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    const transcript = await this.youtubeService.fetchTranscript(url);
    if (transcript) {
      console.log(
        `      ✅ Transcript fetched for: ${title.substring(0, 30)}...`,
      );
      return {
        content: transcript,
        type: 'youtube',
        source: 'transcript',
      };
    }

    console.log(
      `      ℹ️ No transcript, using description for: ${title.substring(0, 30)}...`,
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
  }

  /**
   * Webpage content fetching
   */
  private async fetchWebpageContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    const content = await this.browserService.fetchPageContent(url, false);

    if (content) {
      console.log(
        `      ✅ Webpage content fetched: ${title.substring(0, 30)}...`,
      );
      return {
        content,
        type: 'webpage',
        source: 'webpage',
      };
    }

    return null;
  }
}
