/**
 * YouTube Content & Analysis Integration Service
 */

import { YoutubeTranscript } from 'youtube-transcript';
import { CONFIG } from '../config';
import { delay } from '../utils/helpers';
import { GeminiService } from './gemini.service';
import { AnalysisResult, Trend } from '../types';

export class YouTubeService {
  /**
   * YouTube 전용 모델명 결정 (Pro 모델 제한 로직)
   * 분석 실행 전에 모델을 결정해야 실제 비용/정책과 일치
   */
  private resolveModelName(geminiService: GeminiService): string {
    const currentModel = geminiService.getModelName();

    if (!CONFIG.youtube.allowProModels && currentModel.includes('pro')) {
      return CONFIG.gemini.defaultModel || 'gemini-2.0-flash';
    }

    return currentModel;
  }

  /**
   * 🎯 YouTube 통합 분석 실행
   * 전략: 1. 자막 시도 (비용 절감) -> 2. 실패 시 Gemini Direct URL 분석 (품질 보장)
   */
  async getAnalysis(
    trend: Trend,
    geminiService: GeminiService,
  ): Promise<AnalysisResult | null> {
    const { id, link, title, category } = trend;

    // 필수 필드 검증
    if (!id) {
      console.error('      ❌ Trend ID is missing. Skipping YouTube analysis.');
      return null;
    }

    // 안전한 제목 추출
    const safeTitle = title?.substring(0, 20) ?? 'Unknown';

    // 모델명 사전 결정
    const usedModel = this.resolveModelName(geminiService);

    // 1️⃣ [Strategy 1] 자막(Transcript) 기반 텍스트 분석 시도
    console.log(`      📺 Attempting transcript fetch for: ${safeTitle}...`);

    try {
      const transcript = await this.fetchTranscript(link);

      if (transcript && transcript.length > CONFIG.content.minLength) {
        console.log(
          `      📝 Found transcript (${transcript.length} chars). Using Gemini Text Mode...`,
        );

        const prompt = geminiService.buildPrompt(
          title,
          'YouTube Transcript',
          category,
          transcript,
        );

        const analysis = await geminiService.analyze(prompt);

        // null 체크
        if (!analysis) {
          console.error(
            '      ❌ Gemini analysis returned null for transcript',
          );
          return null;
        }

        return {
          ...analysis,
          id,
          aiModel: usedModel,
          analyzedAt: new Date().toISOString(),
          content: transcript,
        };
      }

      // 2️⃣ [Strategy 2] 자막 실패 시 Gemini Direct URL 분석 (Video Understanding)
      console.log(
        `      🎥 No transcript. Using Gemini Video Understanding...`,
      );

      const analysis = await geminiService.analyzeYoutubeVideo(
        link,
        title,
        category,
      );

      // null 체크
      if (!analysis) {
        console.error('      ❌ Gemini Video Understanding returned null');
        return null;
      }

      return {
        ...analysis,
        id,
        aiModel: usedModel,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`      ❌ YouTube Analysis Failed: ${msg}`);

      // 디버깅을 위해 전체 에러 로깅
      if (error instanceof Error && error.stack) {
        console.error(`      📍 Stack: ${error.stack.substring(0, 300)}`);
      }

      return null;
    }
  }

  /**
   * 자막 데이터 가져오기 (비공식 라이브러리 활용)
   */
  async fetchTranscript(url: string): Promise<string | null> {
    const { maxRetries, retryDelay } = CONFIG.youtube;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const transcripts = await YoutubeTranscript.fetchTranscript(url);
        const fullText = transcripts.map((t) => t.text).join(' ');

        if (fullText.length < CONFIG.content.minLength) {
          console.log(
            `      ⚠️ Transcript too short (${fullText.length} chars)`,
          );
          return null;
        }

        return fullText
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, CONFIG.content.maxLength);
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn(
            `      ⚠️ YouTube Transcript failed (${attempt}/${maxRetries}): ${url}`,
          );
          return null;
        }
        await delay(retryDelay * attempt);
      }
    }
    return null;
  }
}
