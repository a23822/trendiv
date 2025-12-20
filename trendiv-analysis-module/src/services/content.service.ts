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
  async fetchContent(url: string, title: string): Promise<ContentFetchResult | null> {
    const isYoutube = isYoutubeLink(url);

    if (isYoutube) {
      return await this.fetchYoutubeContent(url, title);
    }

    return await this.fetchWebpageContent(url, title);
  }

  /**
   * YouTube content fetching strategy:
   * 1. Try transcript first (best quality)
   * 2. Fallback to video description
   */
  private async fetchYoutubeContent(
    url: string,
    title: string,
  ): Promise<ContentFetchResult | null> {
    // 1️⃣ Try transcript first
    const transcript = await this.youtubeService.fetchTranscript(url);
    if (transcript) {
      console.log(`      ✅ Transcript fetched for: ${title.substring(0, 30)}...`);
      return {
        content: transcript,
        type: 'youtube',
        source: 'transcript',
      };
    }

    // 2️⃣ Fallback to description
    console.log(`      ℹ️ No transcript, using description for: ${title.substring(0, 30)}...`);
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
      console.log(`      ✅ Webpage content fetched: ${title.substring(0, 30)}...`);
      return {
        content,
        type: 'webpage',
        source: 'webpage',
      };
    }

    return null;
  }
}
