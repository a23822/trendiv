/**
 * Gemini AI Analysis Service
 * Migrated to @google/genai SDK (Google GenAI SDK)
 *
 * 🆕 v2.0 - URL 직접 분석 기능 추가 (Playwright 의존도 감소)
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { CONFIG } from '../config';
import { GeminiAnalysisResponse } from '../types';
import { GeminiAPIError, isRetryableError } from '../utils/errors';
import { delay, parseGeminiResponse } from '../utils/helpers';

// Content 타입 정의 (새 SDK용)
interface ContentPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
  fileData?: {
    fileUri: string;
    mimeType?: string;
  };
}

interface Content {
  role?: 'user' | 'model';
  parts: ContentPart[];
}

// 🆕 URL 분석 실패 타입
export interface UrlAnalysisError {
  type: 'URL_ACCESS_FAIL' | 'CONTENT_BLOCKED' | 'API_ERROR';
  message: string;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName?: string) {
    this.modelName = modelName || CONFIG.gemini.defaultModel;
    this.ai = new GoogleGenAI({ apiKey });
  }

  getModelName(): string {
    return this.modelName;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🆕 URL 직접 분석 (Playwright 없이 AI가 직접 URL 접근)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /**
   * 일반 웹페이지 URL을 AI가 직접 분석
   * @param url - 분석할 URL
   * @param title - 콘텐츠 제목
   * @param category - 카테고리
   * @param source - 출처
   * @returns 분석 결과 또는 에러
   */
  async analyzeUrl(
    url: string,
    title: string,
    category: string,
    source: string,
  ): Promise<GeminiAnalysisResponse | UrlAnalysisError> {
    const promptText = this.buildUrlAnalysisPrompt(
      url,
      title,
      category,
      source,
    );

    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ];

    try {
      const result = await this.generateWithRetry(contents);

      // 🔍 API가 URL 접근 실패를 보고한 경우 체크
      if (this.isUrlAccessFailure(result)) {
        return {
          type: 'URL_ACCESS_FAIL',
          message: `Gemini가 URL에 접근할 수 없음: ${url}`,
        };
      }

      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      // 특정 에러 패턴 감지
      if (msg.includes('blocked') || msg.includes('SAFETY')) {
        return {
          type: 'CONTENT_BLOCKED',
          message: `콘텐츠 차단됨: ${msg}`,
        };
      }

      return {
        type: 'API_ERROR',
        message: msg,
      };
    }
  }

  /**
   * URL 접근 실패 여부 판단
   */
  private isUrlAccessFailure(result: GeminiAnalysisResponse): boolean {
    // API가 URL 접근 불가를 보고하는 패턴들
    const failurePatterns = [
      'URL_ACCESS_FAIL',
      '접근할 수 없',
      'cannot access',
      'unable to fetch',
      'failed to load',
      '페이지를 찾을 수 없',
      '404',
      '403',
    ];

    const reason = result.reason?.toLowerCase() || '';
    const summary = result.oneLineSummary?.toLowerCase() || '';

    return failurePatterns.some(
      (pattern) =>
        reason.includes(pattern.toLowerCase()) ||
        summary.includes(pattern.toLowerCase()),
    );
  }

  /**
   * URL 분석 전용 프롬프트 생성
   */
  private buildUrlAnalysisPrompt(
    url: string,
    title: string,
    category: string,
    source: string,
  ): string {
    return `
${CONFIG.prompt.role}

[분석 대상]
- 제목: ${title}
- URL: ${url}
- 출처: ${source} (${category})

**중요 지시사항:**
1. 위 URL에 직접 접근하여 페이지 내용을 분석하세요.
2. URL 접근이 불가능한 경우(차단, 로그인 필요, 404 등), 반드시 다음 형식으로 응답하세요:
   - reason: "URL_ACCESS_FAIL: [구체적 사유]"
3. URL 접근이 가능하면 아래 기준에 따라 분석하세요.

${CONFIG.prompt.scoringCriteria}

${CONFIG.prompt.jsonFormat}

${CONFIG.prompt.tagGuide}
    `.trim();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎬 YouTube 영상 분석 (Direct URL 지원)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /**
   * YouTube 영상 분석 (Direct URL 지원)
   */
  async analyzeYoutubeVideo(
    videoUrl: string,
    title: string,
    category: string,
    modelOverride?: string,
  ): Promise<GeminiAnalysisResponse> {
    let targetModelName = modelOverride || this.modelName;

    if (
      !modelOverride &&
      !CONFIG.youtube.allowProModels &&
      targetModelName.includes('pro')
    ) {
      targetModelName = CONFIG.gemini.defaultModel || 'gemini-3-flash-preview';
    }

    const promptText = this.buildPrompt(
      title,
      'YouTube Video',
      category,
      '영상 내용을 분석하세요.',
    );

    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: videoUrl,
              mimeType: 'video/mp4',
            },
          },
          { text: promptText },
        ],
      },
    ];

    return this.generateWithRetry(contents, targetModelName);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 공통 메서드들
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * 공통 프롬프트 생성기
   */
  private generateSystemPrompt(
    title: string,
    source: string,
    category: string,
    contentBody: string,
  ): string {
    return `
${CONFIG.prompt.role}

[분석 대상]
- 제목: ${title}
- 출처: ${source} (${category})
- 내용: ${contentBody}

${CONFIG.prompt.scoringCriteria}

${CONFIG.prompt.jsonFormat}

${CONFIG.prompt.tagGuide}
    `.trim();
  }

  /**
   * 텍스트 분석
   */
  async analyze(
    prompt: string,
    modelOverride?: string,
  ): Promise<GeminiAnalysisResponse> {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];
    return this.generateWithRetry(contents, modelOverride);
  }

  /**
   * 이미지 분석
   */
  async analyzeImage(
    images: string | string[],
    title: string,
    category: string,
    modelOverride?: string,
  ): Promise<GeminiAnalysisResponse> {
    const promptText = this.generateSystemPrompt(
      title,
      'Screenshot Analysis',
      category,
      '(아래 첨부된 스크린샷 이미지를 분석하여 내용을 파악하세요)',
    );

    const imageList = Array.isArray(images) ? images : [images];

    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          { text: promptText },
          ...imageList.map((img) => ({
            inlineData: {
              data: img,
              mimeType: 'image/jpeg',
            },
          })),
        ],
      },
    ];

    return this.generateWithRetry(contents, modelOverride);
  }

  /**
   * 재시도 로직이 포함된 실행기 (공통 함수)
   */
  private async generateWithRetry(
    contents: Content[],
    modelOverride?: string,
  ): Promise<GeminiAnalysisResponse> {
    const { maxRetries, initialRetryDelay } = CONFIG.gemini;
    const targetModel = modelOverride || this.modelName;

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    let waitTime = initialRetryDelay;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: targetModel,
          contents: contents,
          config: {
            responseMimeType: 'application/json',
            safetySettings: safetySettings,
          },
        });

        const text = response.text;

        if (!text) {
          throw new Error('Empty response from Gemini API');
        }

        return parseGeminiResponse<GeminiAnalysisResponse>(text);
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error)) {
          throw new GeminiAPIError(`Non-retryable error`, attempt, error);
        }

        if (attempt === maxRetries) {
          throw new GeminiAPIError(
            `Max retries (${maxRetries}) reached`,
            attempt,
            error,
          );
        }

        console.warn(
          `      ⚠️ Gemini retry ${attempt}/${maxRetries} (waiting ${waitTime}ms)...`,
        );
        await delay(waitTime);
        waitTime *= 2;
      }
    }

    throw new GeminiAPIError(
      'Unexpected error in retry loop',
      maxRetries,
      lastError,
    );
  }

  /**
   * Build analysis prompt
   */
  buildPrompt(
    title: string,
    source: string,
    category: string,
    content: string,
  ): string {
    const truncatedContent = content.substring(
      0,
      CONFIG.gemini.maxContentLength,
    );
    return this.generateSystemPrompt(title, source, category, truncatedContent);
  }
}
