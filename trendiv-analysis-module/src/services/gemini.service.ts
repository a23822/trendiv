/**
 * Gemini AI Analysis Service
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { CONFIG } from '../config';
import { GeminiAnalysisResponse } from '../types';
import { GeminiAPIError, isRetryableError } from '../utils/errors';
import { delay, parseGeminiResponse } from '../utils/helpers';

export class GeminiService {
  private model: GenerativeModel;
  private modelName: string;

  constructor(apiKey: string, modelName?: string) {
    this.modelName = modelName || CONFIG.gemini.defaultModel;
    const genAI = new GoogleGenerativeAI(apiKey);

    this.model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  }

  getModelName(): string {
    return this.modelName;
  }

  /**
   * Generate content with exponential backoff retry
   */
  async analyze(prompt: string): Promise<GeminiAnalysisResponse> {
    const { maxRetries, initialRetryDelay } = CONFIG.gemini;
    let waitTime = initialRetryDelay;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return parseGeminiResponse<GeminiAnalysisResponse>(text);
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!isRetryableError(error)) {
          throw new GeminiAPIError(
            `Non-retryable error during analysis`,
            attempt,
            error,
          );
        }

        // Last attempt - throw error
        if (attempt === maxRetries) {
          throw new GeminiAPIError(
            `Max retries (${maxRetries}) reached`,
            attempt,
            error,
          );
        }

        // Retry with exponential backoff
        console.warn(
          `      ⚠️ Gemini retry ${attempt}/${maxRetries} (waiting ${waitTime}ms)...`,
        );
        await delay(waitTime);
        waitTime *= 2; // Exponential backoff
      }
    }

    // Should never reach here, but TypeScript needs it
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
    return `
당신은 'Trendiv' 뉴스레터의 **수석 마크업(Markup) 기술 에디터**입니다.
당신의 독자는 **HTML, CSS, 웹 접근성, 모바일 웹 렌더링**에 미쳐있는 프론트엔드 개발자들입니다.
아래 글을 분석하여 독자에게 가치가 있는지를 **매우 엄격하게(Strictly)** 평가하세요.

[분석 대상]
- 제목: ${title}
- 출처: ${source} (${category})
- 내용: ${content.substring(0, CONFIG.gemini.maxContentLength)}

[🔥 채점 기준표 (Scoring Criteria)]

**✅ 점수 8~10점 (필독):**
1. **Deep CSS:** 최신 CSS 스펙(:has, @layer, container queries), 레이아웃 꿀팁, 복잡한 애니메이션 구현.
2. **HTML & Semantics:** 시맨틱 마크업, 새로운 HTML 태그, SEO 최적화 구조.
3. **Web Accessibility (A11y):** WCAG 가이드, ARIA 패턴, 스크린 리더 대응, 키보드 접근성 해결책.
4. **Mobile Web Issues:** iOS(Safari) 100vh 버그, 노치 대응, Android WebView 렌더링 이슈, 터치 이벤트 처리 등 모바일 웹 호환성 문제 해결.
5. **브라우저 내부 동작:** 렌더링 엔진, Reflow/Repaint 최적화, Critical Rendering Path.

**⚠️ 점수 4~7점 (참고):**
- 모던 JS 프레임워크(React, Svelte 등)의 UI/컴포넌트 패턴.
- 브라우저 업데이트 소식 (Blink, WebKit).
- 디자인 시스템 구축 경험기.
- **YouTube 콘텐츠:** 단순 따라하기 강좌는 5점 이하, 원리(Why) 설명 시 가산점.

**🗑️ 점수 0점 (가차 없이 탈락):**
- 백엔드/인프라: DB, Docker, AWS, Server, Python, Java 등.
- 일반 AI/ML: LLM 모델 출시, AI 트렌드 등 웹 UI와 무관한 내용.
- 비즈니스/커리어: 연봉, 이직, 리더십, 회사 자랑.
- 기타: 블록체인, 하드웨어, 게임 개발, 기초 강좌, 광고성 글.

[출력 포맷 (JSON Only)]
{
  "score": 0~10 (정수, 기준에 안 맞으면 과감하게 0점),
  "reason": "점수 부여 사유 (예: 'iOS 17 사파리 렌더링 버그를 다루므로 9점'), 0점일 경우 탈락 사유",
  "title_ko": "제목 한글 번역 (개발자가 클릭하고 싶게)",
  "oneLineSummary": "핵심 내용 한 줄 요약 (한글)",
  "keyPoints": ["핵심1", "핵심2", "핵심3", ...],
  "tags": ["CSS", "A11y", "iOS", ...]
}
    `.trim();
  }
}
