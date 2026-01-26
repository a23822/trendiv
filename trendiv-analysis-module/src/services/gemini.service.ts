/**
 * Gemini AI Analysis Service
 * Migrated to @google/genai SDK (Google GenAI SDK)
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

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName?: string) {
    this.modelName = modelName || CONFIG.gemini.defaultModel;

    // 새 SDK: GoogleGenAI 클라이언트 생성
    this.ai = new GoogleGenAI({ apiKey });
  }

  getModelName(): string {
    return this.modelName;
  }

  /**
   * 🎬 YouTube 영상 분석 (Direct URL 지원)
   * 새 SDK에서는 YouTube URL을 fileUri로 직접 전달 가능
   * @param videoUrl - YouTube 영상 URL
   * @param title - 영상 제목
   * @param category - 카테고리
   * @param modelOverride - 사용할 모델명 (선택, 기본값: Pro 제한 로직 적용)
   */
  async analyzeYoutubeVideo(
    videoUrl: string,
    title: string,
    category: string,
    modelOverride?: string,
  ): Promise<GeminiAnalysisResponse> {
    // 💡 모델 결정: 외부 지정 > Pro 제한 로직 > 기본 모델
    let targetModelName = modelOverride || this.modelName;

    // modelOverride가 없을 때만 Pro 제한 로직 적용
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

    // 💡 새 SDK: YouTube URL을 fileUri에 직접 전달 + mimeType 명시 (안정성)
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
   * 📝 텍스트 분석
   * 일관성을 위해 Content[] 형식으로 감싸서 전달
   * @param prompt - 분석할 프롬프트
   * @param modelOverride - 사용할 모델명 (선택, 기본값: 생성자에서 설정한 모델)
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
   * 📸 이미지 분석
   * @param base64Image - Base64 인코딩된 이미지
   * @param title - 제목
   * @param category - 카테고리
   * @param modelOverride - 사용할 모델명 (선택)
   */
  async analyzeImage(
    base64Image: string,
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

    // 새 SDK: contents 배열 형식
    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg',
            },
          },
          { text: promptText },
        ],
      },
    ];

    return this.generateWithRetry(contents, modelOverride);
  }

  /**
   * 재시도 로직이 포함된 실행기 (공통 함수)
   * 새 SDK API 방식으로 변경
   */
  private async generateWithRetry(
    contents: Content[],
    modelOverride?: string,
  ): Promise<GeminiAnalysisResponse> {
    const { maxRetries, initialRetryDelay } = CONFIG.gemini;
    const targetModel = modelOverride || this.modelName;

    // 🛡️ 비속어 등으로 인한 차단을 방지하기 위해 필터 해제
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
        // 새 SDK: ai.models.generateContent() 사용
        const response = await this.ai.models.generateContent({
          model: targetModel,
          contents: contents,
          config: {
            responseMimeType: 'application/json',
            safetySettings: safetySettings,
          },
        });

        // 새 SDK: response.text 직접 접근 (함수 호출 아님)
        const text = response.text;

        if (!text) {
          throw new Error('Empty response from Gemini API');
        }

        // JSON 파싱
        return parseGeminiResponse<GeminiAnalysisResponse>(text);
      } catch (error) {
        lastError = error;

        // 재시도 불가능한 에러면 즉시 중단
        if (!isRetryableError(error)) {
          throw new GeminiAPIError(`Non-retryable error`, attempt, error);
        }

        // 마지막 시도였으면 에러 던짐
        if (attempt === maxRetries) {
          throw new GeminiAPIError(
            `Max retries (${maxRetries}) reached`,
            attempt,
            error,
          );
        }

        // Exponential Backoff
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
