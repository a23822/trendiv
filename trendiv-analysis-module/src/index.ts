/**
 * Trendiv Analysis Module
 * Refactored for better maintainability, error handling, and testability
 */

import path from 'path';
import dotenv from 'dotenv';
import { Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { CONFIG, getRandomContextOptions } from './config';
import { Trend, PipelineResult } from './types';
import { GeminiService } from './services/gemini.service';
import { GrokService } from './services/grok.service';
import { AnalyzerService } from './services/analyzer.service';
import { delay } from './utils/helpers';

// Re-export types for backward compatibility
export type { AnalysisResult, Trend, PipelineResult } from './types';
export { GrokService } from './services/grok.service';

chromium.use(stealth());

// ---------------------------------------------------------
// 🔧 Environment Setup
// ---------------------------------------------------------
// Load .env from project root (scrap/.env)
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
// 🚀 Main Analysis Function
// ---------------------------------------------------------
export async function runAnalysis(
  trends: Trend[],
  options?: AnalysisOptions,
): Promise<PipelineResult[]> {
  if (!trends || trends.length === 0) {
    console.log('⚠️ No trends to analyze');
    return [];
  }

  // Validate API key again at runtime (for safety)
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

  // 2. 서비스 초기화
  // GeminiService는 항상 초기화 (기본 엔진)
  const geminiService = new GeminiService(apiKey!, geminiModel);

  let grokService: GrokService | undefined;

  if (grokKey) {
    const grokModel =
      options?.provider === 'grok' && requestModelName
        ? requestModelName
        : process.env.GROK_MODEL || undefined;

    grokService = new GrokService(grokKey, grokModel);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--disable-images',
      '--disable-extensions',
      '--disable-blink-features=AutomationControlled',
    ],
    env: {
      ...process.env,
      DBUS_SESSION_BUS_ADDRESS: '/dev/null',
    },
  });

  const sharedContext = await browser.newContext(getRandomContextOptions());

  await sharedContext.addInitScript(() => {
    // WebRTC 비활성화 (IP 유출 방지)
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // @ts-ignore
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // @ts-ignore
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new Error('Permission denied'));
    }

    // WebGL Fingerprint Spoofing (Intel 그래픽카드 위장)
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) return 'Intel Inc.';
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.apply(this, [parameter]);
    };
  });

  // 3. AnalyzerService 생성 및 Provider 강제 설정
  const analyzerService = new AnalyzerService(
    browser,
    geminiService,
    sharedContext,
    grokService,
  );

  if (options?.provider) {
    analyzerService.setForceProvider(options.provider);
  }

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
        } else {
          // X => 그록 만, YouTube => 제미나이만
          console.log(`      ⏭️ Skipped (Provider mismatch or Logic)`);
        }
      } catch (error) {
        console.error(
          `      ❌ Failed to analyze trend #${trend.id}:`,
          error instanceof Error ? error.message : String(error),
        );
        // Continue with next item
        continue;
      }

      const used = process.memoryUsage();
      console.log(
        `메모리 사용량: RSS ${Math.round(used.rss / 1024 / 1024)}MB, Heap ${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      );

      // Rate limiting delay
      await delay(CONFIG.content.delayBetweenRequests);
    }
  } finally {
    console.log('Closing shared context and browser...');
    await sharedContext
      ?.close()
      .catch((e) => console.warn('Context close failed:', e));
    await browser.close();
  }

  console.log(
    `\n✨ Analysis complete: ${results.length}/${trends.length} items processed`,
  );

  return results;
}
