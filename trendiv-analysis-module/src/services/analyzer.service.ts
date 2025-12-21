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

export class AnalyzerService {
  private contentService: ContentService;
  private browserService: BrowserService;
  private geminiService: GeminiService;

  constructor(browser: Browser, geminiService: GeminiService) {
    this.contentService = new ContentService(browser);
    this.browserService = new BrowserService(browser);
    this.geminiService = geminiService;
  }

  /**
   * Analyze a single trend item
   */
  async analyzeTrend(trend: Trend): Promise<AnalysisResult | null> {
    try {
      // 1️⃣ [1차 시도] 텍스트 긁어오기 (리소스 절약)
      const fetchResult = await this.contentService.fetchContent(
        trend.link,
        trend.title,
      );

      // 텍스트가 200자 이상이면 충분하다고 판단 -> 텍스트 모드로 분석
      if (fetchResult && fetchResult.content.length > 200) {
        console.log(
          `      📝 텍스트 데이터 충분 (${fetchResult.type}/${fetchResult.source})...`,
        );

        // ... (텍스트 분석 로직) ...
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

      // 2️⃣ [2차 시도] 텍스트 부족/실패 시 -> Gemini 3 Vision 가동 📸
      console.log(`      📸 텍스트 부족. 스크린샷 분석 시도...`);
      const base64Image = await this.browserService.captureScreenshot(
        trend.link,
      );

      if (!base64Image) {
        console.log(`      ⏭️ 스크린샷도 실패하여 건너뜀`);
        return null;
      }

      const analysis = await this.geminiService.analyzeImage(
        base64Image,
        trend.title,
        trend.category,
      );

      return {
        ...analysis,
        aiModel: this.geminiService.getModelName(),
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Analysis failed for "${trend.title}":`, error);
      return null;
    }
  }
}
