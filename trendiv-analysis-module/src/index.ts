/**
 * Trendiv Analysis Module
 * Refactored for better maintainability, error handling, and testability
 */

import path from 'path';
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import { CONFIG } from './config';
import { Trend, PipelineResult } from './types';
import { GeminiService } from './services/gemini.service';
import { AnalyzerService } from './services/analyzer.service';
import { delay } from './utils/helpers';

// Re-export types for backward compatibility
export type { AnalysisResult, Trend, PipelineResult } from './types';

// ---------------------------------------------------------
// 🔧 Environment Setup
// ---------------------------------------------------------
// Load .env from project root (scrap/.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY가 없습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

const MODEL_NAME = process.env.GEMINI_MODEL || CONFIG.gemini.defaultModel;
console.log(`⚙️ Trendiv 심층 분석 엔진 가동 (Model: ${MODEL_NAME})`);

// ---------------------------------------------------------
// 🚀 Main Analysis Function
// ---------------------------------------------------------
export async function runAnalysis(trends: Trend[]): Promise<PipelineResult[]> {
  if (!trends || trends.length === 0) {
    console.log('⚠️ No trends to analyze');
    return [];
  }

  // Validate API key again at runtime (for safety)
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  console.log(`🧠 [Analysis] Start analyzing ${trends.length} items...`);

  // Initialize services
  const geminiService = new GeminiService(apiKey, MODEL_NAME);
  const browser = await chromium.launch({ headless: true });
  const analyzerService = new AnalyzerService(browser, geminiService);

  const results: PipelineResult[] = [];

  try {
    for (const trend of trends) {
      console.log(
        `\n   -> [${trend.category || 'Uncategorized'}] ${trend.title.substring(0, 50)}...`,
      );

      try {
        const analysis = await analyzerService.analyzeTrend(trend);

        if (analysis) {
          results.push({
            ...analysis,
            id: trend.id,
            originalLink: trend.link,
            date: trend.date,
          });
          console.log(`      ✅ Completed (Score: ${analysis.score}/10)`);
        }
      } catch (error) {
        console.error(
          `      ❌ Failed to analyze trend #${trend.id}:`,
          error instanceof Error ? error.message : String(error),
        );
        // Continue with next item
        continue;
      }

      // Rate limiting delay
      await delay(CONFIG.content.delayBetweenRequests);
    }
  } finally {
    await browser.close();
  }

  console.log(
    `\n✨ Analysis complete: ${results.length}/${trends.length} items processed`,
  );

  return results;
}
