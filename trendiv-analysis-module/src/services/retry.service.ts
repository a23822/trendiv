/**
 * Retry Service
 *
 * 🆕 FAIL 상태 항목을 Playwright로 재시도하는 서비스
 *
 * 전략:
 * 1. DB에서 status='FAIL' 항목 조회
 * 2. Playwright로 콘텐츠 수집
 * 3. AI 분석 실행
 * 4. 성공 시 ANALYZED 업데이트 (실패 시 로깅만 수행하고 다음 주기에 재시도 대상이 됨)
 */

import { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { CONFIG, getRandomContextOptions } from '../config';
import { Trend, AnalysisResult } from '../types';
import { GeminiService } from './gemini.service';
import { GrokService } from './grok.service';
import { ContentService } from './content.service';
import { delay } from '../utils/helpers';

chromium.use(stealth());

const MIN_CONTENT_LENGTH = 50;

export interface RetryResult {
  id: number;
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
}

export class RetryService {
  private geminiService: GeminiService;
  private grokService: GrokService | null;

  constructor(geminiApiKey: string, grokApiKey?: string) {
    this.geminiService = new GeminiService(
      geminiApiKey,
      process.env.GEMINI_MODEL || CONFIG.gemini.defaultModel,
    );

    this.grokService = grokApiKey
      ? new GrokService(grokApiKey, process.env.GROK_MODEL)
      : null;
  }

  /**
   * FAIL 상태 항목들을 Playwright로 재시도
   */
  async retryFailedItems(failedTrends: Trend[]): Promise<RetryResult[]> {
    if (!failedTrends || failedTrends.length === 0) {
      console.log('⚠️ No failed items to retry');
      return [];
    }

    console.log(
      `🔄 [RetryService] Retrying ${failedTrends.length} failed items with Playwright...`,
    );

    // Playwright 브라우저 시작
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
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // @ts-ignore
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(new Error('Permission denied'));
      }
    });

    const contentService = new ContentService(browser, sharedContext);
    const results: RetryResult[] = [];

    try {
      for (const trend of failedTrends) {
        const safeTitle = trend.title?.substring(0, 40) ?? 'No Title';
        console.log(`\n   🔄 [Retry] ${safeTitle}...`);

        try {
          if (trend.category === 'X') {
            if (!this.grokService) {
              results.push({
                id: trend.id,
                success: false,
                error: 'X content requires Grok API (not configured)',
              });
              continue;
            }

            const analysis = await this.grokService.analyze(trend);
            results.push({
              id: trend.id,
              success: true,
              analysis: {
                ...analysis,
                id: trend.id,
                aiModel: this.grokService.getModelName(),
                analyzedAt: new Date().toISOString(),
              },
            });
            continue;
          }

          // Playwright로 콘텐츠 + 스크린샷 수집
          const { content, screenshots } =
            await contentService.fetchContentWithScreenshot(
              trend.link,
              trend.title,
            );

          const fetchedContent = content?.content || '';

          // 콘텐츠 수집 성공 여부 체크
          if (fetchedContent.length < MIN_CONTENT_LENGTH && !screenshots) {
            console.log(`      ⚠️ Content too short and no screenshots`);
            results.push({
              id: trend.id,
              success: false,
              error: `Content insufficient: ${fetchedContent.length} chars, no screenshots`,
            });
            continue;
          }

          // AI 분석 실행
          let analysis: AnalysisResult | null = null;

          // 텍스트가 충분하면 텍스트 모드
          if (fetchedContent.length >= MIN_CONTENT_LENGTH) {
            console.log(
              `      📝 Using Gemini Text Mode (${fetchedContent.length} chars)...`,
            );
            const prompt = this.geminiService.buildPrompt(
              trend.title,
              trend.source,
              trend.category,
              fetchedContent,
            );
            const result = await this.geminiService.analyze(prompt);

            analysis = {
              ...result,
              id: trend.id,
              aiModel: this.geminiService.getModelName(),
              analyzedAt: new Date().toISOString(),
              content: fetchedContent,
            };
          }
          // 2스크린샷이 있으면 비전 모드
          else if (screenshots && screenshots.length > 0) {
            console.log(
              `      📸 Using Gemini Vision Mode (${screenshots.length} screenshots)...`,
            );
            const result = await this.geminiService.analyzeImage(
              screenshots,
              trend.title,
              trend.category,
            );

            analysis = {
              ...result,
              id: trend.id,
              aiModel: this.geminiService.getModelName(),
              analyzedAt: new Date().toISOString(),
            };
          }

          if (analysis) {
            console.log(`      ✅ Retry Success (Score: ${analysis.score}/10)`);
            results.push({
              id: trend.id,
              success: true,
              analysis,
            });
          } else {
            results.push({
              id: trend.id,
              success: false,
              error: 'Analysis returned null',
            });
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`      ❌ Retry failed: ${msg}`);
          results.push({
            id: trend.id,
            success: false,
            error: msg,
          });
        }

        // 메모리 체크
        const used = process.memoryUsage();
        console.log(
          `      📊 Memory: RSS ${Math.round(used.rss / 1024 / 1024)}MB`,
        );

        // Rate limiting
        await delay(CONFIG.content.delayBetweenRequests);
      }
    } finally {
      console.log('🧹 Closing Playwright browser...');
      await sharedContext
        ?.close()
        .catch((e) => console.warn('Context close failed:', e));
      await browser.close();
    }

    // 결과 요약
    const successCount = results.filter((r) => r.success).length;
    console.log(
      `\n✨ Retry complete: ${successCount}/${failedTrends.length} recovered`,
    );

    return results;
  }
}
