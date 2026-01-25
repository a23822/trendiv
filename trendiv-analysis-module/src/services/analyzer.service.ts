import { Browser } from 'playwright';
import { AnalysisResult, Trend } from '../types';
import { ContentService } from './content.service';
import { BrowserService } from './browser.service';
import { GeminiService } from './gemini.service';
import { GrokService } from './grok.service';
import { YouTubeService } from './youtube.service';

export class AnalyzerService {
  private contentService: ContentService;
  private browserService: BrowserService;
  private geminiService: GeminiService;
  private grokService: GrokService | null;
  private youtubeService: YouTubeService;

  private forceProvider: 'gemini' | 'grok' | null = null;

  constructor(
    browser: Browser,
    geminiService: GeminiService,
    grokService?: GrokService,
  ) {
    this.contentService = new ContentService(browser);
    this.browserService = new BrowserService(browser);
    this.geminiService = geminiService;
    this.grokService = grokService || null;
    this.youtubeService = new YouTubeService();
  }

  setForceProvider(provider: 'gemini' | 'grok') {
    this.forceProvider = provider;
  }

  /**
   * Analyze a single trend item
   */
  async analyzeTrend(trend: Trend): Promise<AnalysisResult | null> {
    const isYoutube =
      trend.category === 'Youtube' ||
      trend.source?.toLowerCase().includes('youtube');
    const isXCategory = trend.category === 'X';
    const isReddit = trend.category === 'Reddit';

    const shouldUseGrok =
      this.forceProvider === 'grok' || (!this.forceProvider && isXCategory);

    // ---------------------------------------------------------
    // 1️⃣ YouTube
    // ---------------------------------------------------------
    if (isYoutube) {
      return await this.youtubeService.getAnalysis(trend, this.geminiService);
    }

    // ---------------------------------------------------------
    // 콘텐츠 확보 전략 (Fallback to DB)
    // ---------------------------------------------------------

    let fetchedContent = '';
    let fetchedScreenshot: string | null = null;
    let isUsedStoredContent = false;

    // Reddit은 fetch 스킵
    if (isReddit) {
      if (trend.content && trend.content.length > 0) {
        console.log(
          `      ⏭️ Reddit detected - using stored content (${trend.content.length} chars)`,
        );
        fetchedContent = trend.content;
        isUsedStoredContent = true;
      } else {
        console.log(`      ⚠️ Reddit detected but no stored content available`);
      }
    } else if (!isXCategory) {
      try {
        console.log(
          `      Trying live fetch for: ${trend.title.substring(0, 20)}...`,
        );
        console.log(`      📍 URL: ${trend.link}`);
        console.log(`      📍 Category: ${trend.category}`);

        const { content, screenshot } =
          await this.contentService.fetchContentWithScreenshot(
            trend.link,
            trend.title,
          );

        // content 객체에서 실제 텍스트(.content)만 추출
        fetchedContent = content?.content || '';
        fetchedScreenshot = screenshot || null;

        console.log(`      ✅ Fetch success: ${fetchedContent.length} chars`);
      } catch (e: any) {
        console.error(`      ❌ Live fetch FAILED`);
        console.error(`      📍 URL: ${trend.link}`);
        console.error(`      📍 Category: ${trend.category}`);
        console.error(`      📍 Error name: ${e?.name}`);
        console.error(`      📍 Error message: ${e?.message}`);
        console.error(`      📍 Error stack: ${e?.stack?.substring(0, 500)}`);
        console.warn(`      ⚠️ Falling back to DB content...`);
      }
    }

    // 2. [Fallback] 라이브 콘텐츠가 부실하면 DB에 저장된 본문 사용
    const MIN_LIVE_LENGTH = 100;

    if (
      fetchedContent.length < MIN_LIVE_LENGTH &&
      trend.content &&
      trend.content.length > fetchedContent.length
    ) {
      console.log(
        `      ♻️ Live content insufficient (${fetchedContent.length} chars). Using STORED content (${trend.content.length} chars).`,
      );
      fetchedContent = trend.content;
      isUsedStoredContent = true;
    }

    // ---------------------------------------------------------
    // 🚀 [분석 실행] 확보한 fetchedContent 사용
    // ---------------------------------------------------------

    // A. Grok 실행
    if (shouldUseGrok) {
      if (!this.grokService) {
        console.warn('      ⚠️ Grok Service not initialized. Skipping.');
        return null;
      }
      try {
        if (!isXCategory) {
          console.log(`      🦅 Using Grok API (with content)...`);

          const analysis = await this.grokService.analyzeWithContent(
            trend,
            fetchedContent,
          );

          return {
            ...analysis,
            aiModel: this.grokService.getModelName(),
            analyzedAt: new Date().toISOString(),
            content: isUsedStoredContent ? undefined : fetchedContent,
          };
        }

        // X 카테고리
        console.log(`      🦅 Using Grok API (X post)...`);
        const analysis = await this.grokService.analyze(trend);
        return {
          ...analysis,
          aiModel: this.grokService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(`❌ Grok analysis failed:`);
        console.error(`      📍 Error name: ${error?.name}`);
        console.error(`      📍 Error message: ${error?.message}`);
        return null;
      }
    }

    // B. Gemini 실행
    try {
      // 1️⃣ 텍스트 모드
      const isYoutube =
        trend.source && trend.source.toLowerCase().includes('youtube');
      const minLength = isYoutube ? 20 : 200;

      if (fetchedContent.length > minLength) {
        console.log(`      📝 Using Gemini (Text Mode)...`);
        const prompt = this.geminiService.buildPrompt(
          trend.title,
          trend.source,
          trend.category,
          fetchedContent,
        );
        const analysis = await this.geminiService.analyze(prompt);
        return {
          ...analysis,
          aiModel: this.geminiService.getModelName(),
          analyzedAt: new Date().toISOString(),
          content: isUsedStoredContent ? undefined : fetchedContent,
        };
      }

      // 2️⃣ 스크린샷 모드
      if (fetchedScreenshot) {
        console.log(`      📸 Using Gemini (Vision Mode)...`);
        const analysis = await this.geminiService.analyzeImage(
          fetchedScreenshot,
          trend.title,
          trend.category,
        );
        return {
          ...analysis,
          aiModel: this.geminiService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      }

      console.log(`      ⚠️ No content or screenshot available`);
      return null;
    } catch (error: any) {
      console.error(`❌ Gemini analysis failed:`);
      console.error(`      📍 Error name: ${error?.name}`);
      console.error(`      📍 Error message: ${error?.message}`);
      return null;
    }
  }
}
