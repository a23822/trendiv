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
   * 🎯 YouTube 통합 분석 실행
   * 전략: 1. 자막 시도 (비용 절감) -> 2. 실패 시 Gemini Direct URL 분석 (품질 보장)
   */
  async getAnalysis(
    trend: Trend,
    geminiService: GeminiService,
  ): Promise<AnalysisResult | null> {
    const { link, title, category } = trend;

    // 1️⃣ [Strategy 1] 자막(Transcript) 기반 텍스트 분석 시도
    console.log(
      `      📺 Attempting transcript fetch for: ${title.substring(0, 20)}...`,
    );
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

        return {
          ...analysis,
          aiModel: geminiService.getModelName(),
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

      // 💡 모델 결정 로직을 반영하여 실제 사용된 모델명을 기록합니다.
      let usedModel = geminiService.getModelName();
      if (!CONFIG.youtube.allowProModels && usedModel.includes('pro')) {
        usedModel = CONFIG.gemini.defaultModel || 'gemini-3-flash-preview';
      }
      return {
        ...analysis,
        aiModel: usedModel,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      // 💡 any 대신 unknown 사용
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`      ❌ YouTube Analysis Failed: ${msg}`);
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

        if (fullText.length < CONFIG.content.minLength) return null;

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
