/**
 * YouTube Content Fetcher Service
 */

import { YoutubeTranscript } from 'youtube-transcript';
import { CONFIG } from '../config';
import { delay } from '../utils/helpers';

export class YouTubeService {
  /**
   * Fetch transcript with retry logic
   */
  async fetchTranscript(url: string): Promise<string | null> {
    const { maxRetries, retryDelay } = CONFIG.youtube;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const transcripts = await YoutubeTranscript.fetchTranscript(url);
        const fullText = transcripts.map((t) => t.text).join(' ');

        if (fullText.length < CONFIG.content.minLength) {
          return null;
        }

        return fullText
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, CONFIG.content.maxLength);
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn(
            `⚠️ YouTube 자막 가져오기 실패 (${attempt}/${maxRetries}): ${url}`,
          );
          return null;
        }

        await delay(retryDelay * attempt);
      }
    }

    return null;
  }
}
