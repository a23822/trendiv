/**
 * Main Analysis Orchestrator
 * Coordinates content fetching and AI analysis
 */

import { Browser } from 'playwright';
import { AnalysisResult, Trend } from '../types';
import { AnalysisError } from '../utils/errors';
import { ContentService } from './content.service';
import { BrowserService } from './browser.service';
import { GeminiService } from './gemini.service';
import { GrokService } from './grok.service';

export class AnalyzerService {
  private contentService: ContentService;
  private browserService: BrowserService;
  private geminiService: GeminiService;
  private grokService: GrokService | null;

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
  }

  // Provider 강제 설정 메서드
  setForceProvider(provider: 'gemini' | 'grok') {
    this.forceProvider = provider;
  }

  /**
   * Analyze a single trend item
   */
  async analyzeTrend(trend: Trend): Promise<AnalysisResult | null> {
    const isXCategory = trend.category === 'X';

    // 1. Grok을 써야 하는 경우
    //    - 강제로 Grok 모드이거나
    //    - 자동(Auto) 모드인데 카테고리가 X인 경우
    const shouldUseGrok =
      this.forceProvider === 'grok' || (!this.forceProvider && isXCategory);

    // 2. Gemini를 써야 하는 경우
    //    - 강제로 Gemini 모드이거나
    //    - 자동(Auto) 모드인데 카테고리가 X가 아닌 경우
    const shouldUseGemini =
      this.forceProvider === 'gemini' || (!this.forceProvider && !isXCategory);

    // 🛑 [방어 로직] X 카테고리는 Gemini가 분석 불가 (Grok 없으면 스킵)
    if (isXCategory && shouldUseGemini) {
      console.warn(
        `      🚫 Skipping: X (Twitter) items cannot be analyzed by Gemini.`,
      );
      return null;
    }

    // ---------------------------------------------------------
    // 🚀 [실행 로직]
    // ---------------------------------------------------------

    // A. Grok 실행
    if (shouldUseGrok) {
      if (!this.grokService) {
        console.warn('      ⚠️ Grok Service not initialized. Skipping.');
        return null;
      }
      try {
        // 🆕 X가 아닌 경우 → 콘텐츠 스크래핑 후 분석
        if (!isXCategory) {
          console.log(`      🦅 Using Grok API (with content)...`);

          const fetchResult = await this.contentService.fetchContent(
            trend.link,
            trend.title,
          );

          const content = fetchResult?.content || '';
          const analysis = await this.grokService.analyzeWithContent(
            trend,
            content,
          );

          return {
            ...analysis,
            aiModel: this.grokService.getModelName(),
            analyzedAt: new Date().toISOString(),
          };
        }

        // X 카테고리 → 기존대로 title만
        console.log(`      🦅 Using Grok API (X post)...`);
        const analysis = await this.grokService.analyze(trend);
        return {
          ...analysis,
          aiModel: this.grokService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`❌ Grok analysis failed for "${trend.title}":`, error);
        return null;
      }
    }

    // B. Gemini 실행 (기존 로직)
    // X 카테고리가 아닌 경우
    try {
      // 🆕 한 번에 텍스트 + 스크린샷 가져오기
      const { content: fetchResult, screenshot } =
        await this.contentService.fetchContentWithScreenshot(
          trend.link,
          trend.title,
        );

      // 1️⃣ 텍스트가 충분하면 텍스트 모드
      if (fetchResult && fetchResult.content.length > 200) {
        console.log(`      📝 Using Gemini (Text Mode)...`);
        const prompt = this.geminiService.buildPrompt(
          trend.title,
          trend.source,
          trend.category,
          fetchResult.content,
        );
        const analysis = await this.geminiService.analyze(prompt);
        return {
          ...analysis,
          aiModel: this.geminiService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      }

      // 2️⃣ 텍스트 부족하면 스크린샷 모드 (이미 가져온 스크린샷 사용)
      if (screenshot) {
        console.log(`      📸 Using Gemini (Vision Mode)...`);
        const analysis = await this.geminiService.analyzeImage(
          screenshot,
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
    } catch (error) {
      console.error(`❌ Analysis failed for "${trend.title}":`, error);
      return null;
    }
  }
}
