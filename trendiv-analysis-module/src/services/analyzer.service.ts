import { Browser, BrowserContext } from 'playwright';
import { AnalysisResult, Trend } from '../types';
import { ContentService } from './content.service';
import { GeminiService } from './gemini.service';
import { GrokService } from './grok.service';
import { YouTubeService } from './youtube.service';

// 콘텐츠 길이 상수 (통일된 기준)
const MIN_CONTENT_LENGTH = 200;

export class AnalyzerService {
  private contentService: ContentService;
  private geminiService: GeminiService;
  private grokService: GrokService | null;
  private youtubeService: YouTubeService;
  private sharedContext: BrowserContext;

  private forceProvider: 'gemini' | 'grok' | null = null;

  constructor(
    browser: Browser,
    geminiService: GeminiService,
    sharedContext: BrowserContext,
    grokService?: GrokService,
  ) {
    this.sharedContext = sharedContext;
    this.contentService = new ContentService(browser, sharedContext);

    this.geminiService = geminiService;
    this.grokService = grokService || null;
    this.youtubeService = new YouTubeService();
  }

  setForceProvider(provider: 'gemini' | 'grok') {
    this.forceProvider = provider;
  }

  /**
   * 카테고리/소스 판별 유틸리티
   */
  private isYoutubeContent(trend: Trend): boolean {
    const category = trend.category?.toLowerCase() || '';
    const source = trend.source?.toLowerCase() || '';
    const link = trend.link?.toLowerCase() || '';

    return (
      category === 'youtube' ||
      source.includes('youtube') ||
      link.includes('youtube.com') ||
      link.includes('youtu.be')
    );
  }

  private isXContent(trend: Trend): boolean {
    return trend.category === 'X';
  }

  private isRedditContent(trend: Trend): boolean {
    return trend.category === 'Reddit';
  }

  /**
   * Analyze a single trend item
   */
  async analyzeTrend(trend: Trend): Promise<AnalysisResult | null> {
    // 필수 필드 검증
    if (!trend.id) {
      console.error('      ❌ Trend ID is missing. Skipping analysis.');
      return null;
    }

    console.log(
      `[DEBUG] Category: "${trend.category}", Source: "${trend.source}", Link: "${trend.link}"`,
    );

    const isYoutube = this.isYoutubeContent(trend);
    console.log(`[DEBUG] isYoutube: ${isYoutube}`);
    const isXCategory = this.isXContent(trend);
    const isReddit = this.isRedditContent(trend);

    const shouldUseGrok =
      this.forceProvider === 'grok' || (!this.forceProvider && isXCategory);

    // 안전한 제목 추출
    const safeTitle = trend.title?.substring(0, 20) ?? 'No Title';

    // ---------------------------------------------------------
    // 1️⃣ YouTube
    // ---------------------------------------------------------
    if (isYoutube) {
      const result = await this.youtubeService.getAnalysis(
        trend,
        this.geminiService,
      );

      // YouTube 결과에도 id 보장
      if (result) {
        return {
          ...result,
          id: trend.id,
        } as AnalysisResult;
      }
      return null;
    }

    // ---------------------------------------------------------
    // 콘텐츠 확보 전략 (Fallback to DB)
    // ---------------------------------------------------------

    let fetchedContent = '';
    let fetchedScreenshots: string[] | null = null;
    let isUsedStoredContent = false;

    // Reddit은 fetch 스킵
    if (isReddit) {
      if (trend.content && trend.content.length > 0) {
        console.log(
          `      ⭐️ Reddit detected - using stored content (${trend.content.length} chars)`,
        );
        fetchedContent = trend.content;
        isUsedStoredContent = true;
      } else {
        console.log(`      ⚠️ Reddit detected but no stored content available`);
      }
    } else if (!isXCategory) {
      try {
        console.log(`      Trying live fetch for: ${safeTitle}...`);
        console.log(`      📍 URL: ${trend.link}`);
        console.log(`      📍 Category: ${trend.category}`);

        const { content, screenshots } =
          await this.contentService.fetchContentWithScreenshot(
            trend.link,
            trend.title,
          );

        // content 객체에서 실제 텍스트(.content)만 추출
        fetchedContent = content?.content || '';
        fetchedScreenshots = screenshots || null;

        console.log(`      ✅ Fetch success: ${fetchedContent.length} chars`);
      } catch (e: unknown) {
        const error = e as Error;
        console.error(`      ❌ Live fetch FAILED`);
        console.error(`      📍 URL: ${trend.link}`);
        console.error(`      📍 Category: ${trend.category}`);
        console.error(`      📍 Error name: ${error?.name}`);
        console.error(`      📍 Error message: ${error?.message}`);
        console.error(
          `      📍 Error stack: ${error?.stack?.substring(0, 500)}`,
        );
        console.warn(`      ⚠️ Falling back to DB content...`);
      }
    }

    // 2. [Fallback] 라이브 콘텐츠가 부실하면 DB에 저장된 본문 사용
    if (
      fetchedContent.length < MIN_CONTENT_LENGTH &&
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

          if (!analysis) return null;

          return {
            ...analysis,
            id: trend.id,
            aiModel: this.grokService.getModelName(),
            analyzedAt: new Date().toISOString(),
            content: isUsedStoredContent ? undefined : fetchedContent,
          };
        }

        // X 카테고리
        console.log(`      🦅 Using Grok API (X post)...`);
        const analysis = await this.grokService.analyze(trend);

        if (!analysis) return null;

        return {
          ...analysis,
          id: trend.id,
          aiModel: this.grokService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`❌ Grok analysis failed:`);
        console.error(`      📍 Error name: ${err?.name}`);
        console.error(`      📍 Error message: ${err?.message}`);
        return null;
      }
    }

    // B. Gemini 실행
    try {
      // 1️⃣ 텍스트 모드
      if (fetchedContent.length >= MIN_CONTENT_LENGTH) {
        console.log(`      📝 Using Gemini (Text Mode)...`);
        const prompt = this.geminiService.buildPrompt(
          trend.title,
          trend.source,
          trend.category,
          fetchedContent,
        );
        const analysis = await this.geminiService.analyze(prompt);

        if (!analysis) return null;

        return {
          ...analysis,
          id: trend.id,
          aiModel: this.geminiService.getModelName(),
          analyzedAt: new Date().toISOString(),
          content: isUsedStoredContent ? undefined : fetchedContent,
        };
      }

      // 2️⃣ 스크린샷 모드
      if (fetchedScreenshots) {
        console.log(`      📸 Using Gemini (Vision Mode)...`);
        const analysis = await this.geminiService.analyzeImage(
          fetchedScreenshots,
          trend.title,
          trend.category,
        );

        if (!analysis) return null;

        return {
          ...analysis,
          id: trend.id,
          aiModel: this.geminiService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      }

      console.log(`      ⚠️ No content or screenshot available`);
      return null;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`❌ Gemini analysis failed:`);
      console.error(`      📍 Error name: ${err?.name}`);
      console.error(`      📍 Error message: ${err?.message}`);
      return null;
    }
  }
}
