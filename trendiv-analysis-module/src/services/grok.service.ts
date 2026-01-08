import axios, { AxiosError } from 'axios';
import { CONFIG } from '../config';
import { GeminiAnalysisResponse, Trend } from '../types';
import { parseGeminiResponse } from '../utils/helpers';

// 딜레이 헬퍼
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GrokService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, modelName?: string) {
    this.apiKey = apiKey;
    this.model = modelName || CONFIG.grok.defaultModel;
  }

  /**
   * 공통 API 호출 (재시도 로직 포함)
   */
  private async callGrokAPI(
    systemPrompt: string,
    userContent: string,
  ): Promise<GeminiAnalysisResponse> {
    const { maxRetries, initialRetryDelay, timeout } = CONFIG.grok;
    let lastError: unknown;
    let waitTime = initialRetryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          CONFIG.grok.baseUrl,
          {
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            temperature: 0.3,
            stream: false,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout,
          },
        );

        const responseText = response.data.choices[0]?.message?.content || '';
        if (!responseText) {
          throw new Error('Empty response from Grok API');
        }

        return parseGeminiResponse<GeminiAnalysisResponse>(responseText);
      } catch (error) {
        lastError = error;

        // 에러 분석
        const isAxiosError = axios.isAxiosError(error);
        const status = isAxiosError
          ? (error as AxiosError).response?.status
          : null;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // 상세 로그
        console.error(
          `      ⚠️ Grok API Error [Attempt ${attempt}/${maxRetries}]`,
          { status, message: errorMessage },
        );

        // 재시도 불가능한 에러 (즉시 실패)
        if (status === 401 || status === 403) {
          console.error('      ❌ Auth error - check GROK_API_KEY');
          throw error;
        }

        if (status === 400) {
          console.error('      ❌ Bad request - check prompt format');
          throw error;
        }

        // 재시도 가능: 429 (Rate Limit), 5xx (Server Error), Network Error
        const isRetryable =
          status === 429 || (status && status >= 500) || !status;

        if (!isRetryable) {
          throw error;
        }

        // 마지막 시도였으면 throw
        if (attempt === maxRetries) {
          console.error(`      ❌ Max retries (${maxRetries}) reached`);
          throw error;
        }

        // 429면 더 오래 대기
        const actualWait = status === 429 ? waitTime * 2 : waitTime;
        console.log(`      😴 Waiting ${actualWait}ms before retry...`);
        await delay(actualWait);
        waitTime *= 2; // Exponential backoff
      }
    }

    throw lastError;
  }

  /**
   * X(Twitter) 포스트 분석 - title + link만으로 분석
   */
  async analyze(trend: Trend): Promise<GeminiAnalysisResponse> {
    const systemPrompt = `
당신은 'Trendiv' 뉴스레터의 **수석 마크업(Markup) 기술 에디터**입니다.
당신의 독자는 **HTML, CSS, 웹 접근성, 모바일 웹 렌더링, iOS 이슈**에 미쳐있는 프론트엔드 개발자들입니다.
아래 내용을 분석하여 독자에게 가치가 있는지를 **매우 엄격하게(Strictly)** 평가하세요.
**분석 대상이 X(트위터) 관련 링크인 경우, 반드시 해당 링크의 단일 포스트(트윗) 내용만 분석하세요. 사용자 프로필 URL(예: https://x.com/username)인 경우, 해당 사용자의 최근 포스트만 확인하고 bio, 팔로워 수, 아바타, 계정 역사 등은 완전히 무시하세요. 포스트 모음, 프로필 페이지 전체, 또는 외부 지식을 기반으로 한 추론은 금지. 포스트가 없거나 오래된 경우(최근 1년 내 활동 없음) 무조건 0점으로 평가하세요.**
단, 트윗(X) 게시물은 내용이 짧으므로 제목과 링크 키워드를 중심으로 가치를 추론(Infer)하여 평가하세요.

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
** - X 프로필 URL처럼 포스트가 아닌 경우, 또는 포스트가 기준과 무관하면 즉시 0점.**

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

    let userContent = `
[분석 대상]
- 제목: ${trend.title}
- 링크: ${trend.link}
- 출처: ${trend.source} (${trend.category})
`;

    if (trend.link.includes('x.com/') && !trend.link.includes('/status/')) {
      userContent +=
        '\n**주의: 이 링크는 X 사용자 프로필입니다. 최근 포스트 내용만 분석하세요.**';
    }

    userContent = userContent.trim();

    return this.callGrokAPI(systemPrompt, userContent);
  }

  /**
   * 콘텐츠 포함 분석 (X 외 카테고리용) - 스크래핑된 content 포함
   */
  async analyzeWithContent(
    trend: Trend,
    content: string,
  ): Promise<GeminiAnalysisResponse> {
    const systemPrompt = `
당신은 'Trendiv' 뉴스레터의 **수석 마크업(Markup) 기술 에디터**입니다.
당신의 독자는 **HTML, CSS, 웹 접근성, 모바일 웹 렌더링, iOS 이슈**에 미쳐있는 프론트엔드 개발자들입니다.
아래 내용을 분석하여 독자에게 가치가 있는지를 **매우 엄격하게(Strictly)** 평가하세요.

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

    const userContent = `
[분석 대상]
- 제목: ${trend.title}
- 링크: ${trend.link}
- 출처: ${trend.source} (${trend.category})
- 내용:
${(content || '').substring(0, CONFIG.grok.maxContentLength)}
    `.trim();

    return this.callGrokAPI(systemPrompt, userContent);
  }

  getModelName(): string {
    return `${this.model}`;
  }
}
