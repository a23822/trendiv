/**
 * Main Analysis Orchestrator
 * Coordinates content fetching and AI analysis
 */

import { Browser } from 'playwright';
import { AnalysisResult, Trend } from '../types';
import { AnalysisError } from '../utils/errors';
import { ContentService } from './content.service';
import { GeminiService } from './gemini.service';

export class AnalyzerService {
  private contentService: ContentService;
  private geminiService: GeminiService;

  constructor(browser: Browser, geminiService: GeminiService) {
    this.contentService = new ContentService(browser);
    this.geminiService = geminiService;
  }

  /**
   * Analyze a single trend item
   */
  async analyzeTrend(trend: Trend): Promise<AnalysisResult | null> {
    try {
      // 1️⃣ Fetch content
      const fetchResult = await this.contentService.fetchContent(
        trend.link,
        trend.title,
      );

      if (!fetchResult) {
        console.log(
          `      ⏭️ Skip: Insufficient content for "${trend.title.substring(0, 40)}..."`,
        );
        return null;
      }

      // 2️⃣ Build prompt
      const prompt = this.geminiService.buildPrompt(
        trend.title,
        trend.source,
        trend.category,
        fetchResult.content,
      );

      // 3️⃣ Analyze with Gemini
      console.log(
        `      🧠 Analyzing with Gemini (${fetchResult.source})...`,
      );
      const analysis = await this.geminiService.analyze(prompt);

      // 4️⃣ Build result
      return {
        ...analysis,
        aiModel: this.geminiService.getModelName(),
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Log error but don't throw - allow pipeline to continue
      console.error(
        `❌ Analysis failed for "${trend.title.substring(0, 40)}...":`,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof AnalysisError) {
        console.error(`   Cause:`, error.cause);
      }

      return null;
    }
  }
}
