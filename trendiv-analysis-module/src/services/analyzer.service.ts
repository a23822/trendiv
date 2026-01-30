/**
 * Analyzer Service v2.0
 *
 * 🆕 전략 변경:
 * - 기존: Playwright로 콘텐츠 수집 → AI 분석
 * - 변경: AI API가 직접 URL 분석 (1차) → 실패 시 FAIL 상태 반환
 *
 * Playwright는 별도 RetryService에서 FAIL 항목 재시도 시에만 사용
 */

import { AnalysisResult, Trend, FailedAnalysisResult } from '../types';
import { GeminiService, UrlAnalysisError } from './gemini.service';
import { GrokService } from './grok.service';
import { YouTubeService } from './youtube.service';

// 분석 결과 또는 실패 결과
export type AnalyzerResult = AnalysisResult | FailedAnalysisResult;

// 실패 결과인지 체크하는 타입 가드
export function isFailedResult(
  result: AnalyzerResult,
): result is FailedAnalysisResult {
  return 'status' in result && result.status === 'FAIL';
}

// URL 분석 에러인지 체크
function isUrlAnalysisError(result: any): result is UrlAnalysisError {
  return result && 'type' in result && 'message' in result;
}

export class AnalyzerService {
  private geminiService: GeminiService;
  private grokService: GrokService | null;
  private youtubeService: YouTubeService;

  private forceProvider: 'gemini' | 'grok' | null = null;

  constructor(geminiService: GeminiService, grokService?: GrokService) {
    this.geminiService = geminiService;
    this.grokService = grokService || null;
    this.youtubeService = new YouTubeService();
  }

  setForceProvider(provider: 'gemini' | 'grok') {
    this.forceProvider = provider;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 카테고리/소스 판별 유틸리티
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎯 메인 분석 메서드 (Playwright 제거, AI API URL 직접 분석)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async analyzeTrend(trend: Trend): Promise<AnalyzerResult | null> {
    // 필수 필드 검증
    if (!trend.id) {
      console.error('      ❌ Trend ID is missing. Skipping analysis.');
      return null;
    }

    const safeTitle = trend.title?.substring(0, 50) ?? 'No Title';
    console.log(
      `[Analyzer] Category: "${trend.category}", Link: "${trend.link.substring(0, 60)}..."`,
    );

    const isYoutube = this.isYoutubeContent(trend);
    const isXCategory = this.isXContent(trend);

    // Provider 결정
    const shouldUseGrok =
      this.forceProvider === 'grok' || (!this.forceProvider && isXCategory);

    // ─────────────────────────────────────────────────────────
    // 1️⃣ YouTube 콘텐츠
    // ─────────────────────────────────────────────────────────
    if (isYoutube) {
      console.log(`      📺 [YouTube] Analyzing: ${safeTitle}...`);

      try {
        const result = await this.youtubeService.getAnalysis(
          trend,
          this.geminiService,
        );

        if (result) {
          return {
            ...result,
            id: trend.id,
          } as AnalysisResult;
        }

        // YouTube 분석 실패
        return this.createFailResult(
          trend.id,
          'API_ERROR',
          'YouTube 분석 실패 (자막 없음 또는 API 오류)',
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return this.createFailResult(
          trend.id,
          'API_ERROR',
          `YouTube 분석 예외: ${msg}`,
        );
      }
    }

    // ─────────────────────────────────────────────────────────
    // 2️⃣ X(Twitter) 콘텐츠 → Grok 사용
    // ─────────────────────────────────────────────────────────
    if (shouldUseGrok) {
      if (!this.grokService) {
        console.warn(
          '      ⚠️ Grok Service not initialized. Skipping X content.',
        );
        return this.createFailResult(
          trend.id,
          'PROVIDER_MISMATCH',
          'Grok API Key 미설정 (X 콘텐츠 분석 불가)',
        );
      }

      console.log(`      🦅 [Grok] Analyzing X content: ${safeTitle}...`);

      try {
        // X 카테고리는 기존 analyze() 메서드 사용 (title + link만으로 분석)
        if (isXCategory) {
          const analysis = await this.grokService.analyze(trend);

          return {
            ...analysis,
            id: trend.id,
            aiModel: this.grokService.getModelName(),
            analyzedAt: new Date().toISOString(),
          };
        }

        // X가 아닌데 Grok 강제 사용 → URL 직접 분석
        const result = await this.grokService.analyzeUrl(
          trend.link,
          trend.title,
          trend.category,
          trend.source,
        );

        if (isUrlAnalysisError(result)) {
          return this.createFailResult(trend.id, result.type, result.message);
        }

        return {
          ...result,
          id: trend.id,
          aiModel: this.grokService.getModelName(),
          analyzedAt: new Date().toISOString(),
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`      ❌ Grok analysis failed: ${msg}`);
        return this.createFailResult(
          trend.id,
          'API_ERROR',
          `Grok 분석 예외: ${msg}`,
        );
      }
    }

    // ─────────────────────────────────────────────────────────
    // 3️⃣ 일반 웹페이지 → Gemini URL 직접 분석
    // ─────────────────────────────────────────────────────────
    console.log(`      🤖 [Gemini] Analyzing URL directly: ${safeTitle}...`);

    try {
      const result = await this.geminiService.analyzeUrl(
        trend.link,
        trend.title,
        trend.category,
        trend.source,
      );

      // URL 접근 실패 체크
      if (isUrlAnalysisError(result)) {
        console.log(`      ⚠️ Gemini URL access failed: ${result.message}`);
        return this.createFailResult(trend.id, result.type, result.message);
      }

      // 성공
      return {
        ...result,
        id: trend.id,
        aiModel: this.geminiService.getModelName(),
        analyzedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`      ❌ Gemini analysis failed: ${msg}`);
      return this.createFailResult(
        trend.id,
        'API_ERROR',
        `Gemini 분석 예외: ${msg}`,
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🆕 실패 결과 생성 헬퍼
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private createFailResult(
    id: number,
    failType:
      | 'PROVIDER_MISMATCH'
      | 'URL_ACCESS_FAIL' // AI가 URL 접근 못함
      | 'CONTENT_BLOCKED' // 차단됨
      | 'API_ERROR' // AI API 자체 에러
      | 'TIMEOUT' // Playwright 타임아웃
      | 'EMPTY_CONTENT' // 본문 추출 실패
      | 'SKIPPED', // 재시도 횟수 초과 등
    failReason: string,
  ): FailedAnalysisResult {
    return {
      id,
      status: 'FAIL',
      failType,
      failReason,
    };
  }
}
