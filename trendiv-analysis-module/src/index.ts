/**
 * Trendiv Analysis Module v2.0
 *
 * 주요 변경사항:
 * - Playwright 브라우저 생성 제거 (AI API URL 직접 분석)
 * - 실패 시 status: 'FAIL' 반환 (별도 RetryService에서 Playwright 재시도)
 * - 메모리 사용량 대폭 감소
 */

import path from 'path';
import dotenv from 'dotenv';
import { CONFIG } from './config';
import {
  Trend,
  PipelineResult,
  AnalysisResult,
  FailedAnalysisResult,
} from './types';
import { GeminiService } from './services/gemini.service';
import { GrokService } from './services/grok.service';
import {
  AnalyzerService,
  AnalyzerResult,
  isFailedResult,
} from './services/analyzer.service';
import { delay } from './utils/helpers';

// Re-export types
export type {
  AnalysisResult,
  Trend,
  PipelineResult,
  FailedAnalysisResult,
} from './types';
export { GrokService } from './services/grok.service';
export { isFailedResult } from './services/analyzer.service';

// 확장된 파이프라인 결과 (실패 항목 포함)
export interface ExtendedPipelineResult extends PipelineResult {
  failedIds?: number[];
}

// ---------------------------------------------------------
// 🔧 Environment Setup
// ---------------------------------------------------------
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const apiKey = process.env.GEMINI_API_KEY;
const grokKey = process.env.GROK_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY가 없습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

if (grokKey) {
  console.log(`⚙️ Grok Service Activated (For X.com)`);
} else {
  console.log(`⚠️ Grok API Key missing. X.com items will be skipped.`);
}

export interface AnalysisOptions {
  modelName?: string;
  provider?: 'gemini' | 'grok';
}

// ---------------------------------------------------------
// 🚀 Main Analysis Function (Playwright 제거됨)
// ---------------------------------------------------------
export async function runAnalysis(
  trends: Trend[],
  options?: AnalysisOptions,
): Promise<(PipelineResult | FailedAnalysisResult)[]> {
  if (!trends || trends.length === 0) {
    console.log('⚠️ No trends to analyze');
    return [];
  }

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const requestModelName = options?.modelName;

  const geminiModel =
    options?.provider === 'gemini' && requestModelName
      ? requestModelName
      : process.env.GEMINI_MODEL || CONFIG.gemini.defaultModel;

  console.log(
    `🧠 [Analysis] Start analyzing ${trends.length} items (Provider: ${options?.provider || 'Auto'})...`,
  );
  console.log(`   📊 Model: ${geminiModel}`);
  console.log(`   🚀 Mode: AI API Direct URL Analysis (No Playwright)`);

  // 서비스 초기화 (브라우저 없음!)
  const geminiService = new GeminiService(apiKey!, geminiModel);

  let grokService: GrokService | undefined;
  if (grokKey) {
    const grokModel =
      options?.provider === 'grok' && requestModelName
        ? requestModelName
        : process.env.GROK_MODEL || undefined;

    grokService = new GrokService(grokKey, grokModel);
  }

  // AnalyzerService 생성 (Browser, Context 파라미터 제거)
  const analyzerService = new AnalyzerService(geminiService, grokService);

  if (options?.provider) {
    analyzerService.setForceProvider(options.provider);
  }

  const results: (PipelineResult | FailedAnalysisResult)[] = [];

  for (const trend of trends) {
    console.log(
      `\n   -> [${trend.category || 'Uncategorized'}] ${trend.title.substring(0, 50)}...`,
    );

    try {
      const analysis = await analyzerService.analyzeTrend(trend);

      if (!analysis) {
        console.log(`      ⭕️ Skipped (null result)`);
        continue;
      }

      // 실패 결과 처리
      if (isFailedResult(analysis)) {
        console.log(
          `      ❌ FAIL: ${analysis.failType} - ${analysis.failReason.substring(0, 50)}...`,
        );
        results.push(analysis);
        continue;
      }

      // 성공 결과
      results.push({
        ...analysis,
        id: trend.id,
        originalLink: trend.link,
        date: trend.date,
      });
      console.log(`      ✅ Completed (Score: ${analysis.score}/10)`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`      ❌ Exception: ${errorMessage}`);

      // 예외도 FAIL로 처리
      results.push({
        id: trend.id,
        status: 'FAIL',
        failType: 'API_ERROR',
        failReason: `Unexpected exception: ${errorMessage}`,
      });
      continue;
    }

    // 메모리 사용량 로깅 (Playwright 제거로 대폭 감소 예상)
    const used = process.memoryUsage();
    console.log(
      `      📊 Memory: RSS ${Math.round(used.rss / 1024 / 1024)}MB, Heap ${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    );

    // Rate limiting delay
    await delay(CONFIG.content.delayBetweenRequests);
  }

  // 결과 요약
  const successCount = results.filter((r) => !isFailedResult(r)).length;
  const failCount = results.filter((r) => isFailedResult(r)).length;

  console.log(`\n✨ Analysis complete:`);
  console.log(`   ✅ Success: ${successCount}/${trends.length}`);
  console.log(`   ❌ Failed: ${failCount}/${trends.length}`);

  return results;
}
