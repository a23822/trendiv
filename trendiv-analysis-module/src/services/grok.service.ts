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
            temperature: 0.2,
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
${CONFIG.prompt.role}
**분석 대상이 X(트위터) 관련 링크인 경우, 반드시 해당 링크의 단일 포스트(트윗) 내용만 분석하세요. 사용자 프로필 URL(예: https://x.com/username)인 경우, 해당 사용자의 최근 포스트만 확인하고 bio, 팔로워 수, 아바타, 계정 역사 등은 완전히 무시하세요. 포스트 모음, 프로필 페이지 전체, 또는 외부 지식을 기반으로 한 추론은 금지. 포스트가 없거나 오래된 경우(최근 1년 내 활동 없음) 무조건 0점으로 평가하세요.**
단, 트윗(X) 게시물은 내용이 짧으므로 제목과 링크 키워드, 댓글들을 중심으로 평가하세요.
내용이 빈약한데 댓글도 없고 참고할 내용이 없으면 0점 처리하세요.

${CONFIG.prompt.scoringCriteria}
** - X 프로필 URL처럼 포스트가 아닌 경우, 또는 포스트가 기준과 무관하면 즉시 0점.**
** - 강의 홍보나 단순 홍보들이 정말 많으니 이런건 댓글 반응이 개발/트렌드 분석에 도움되지 않으면 무조건 0점**

${CONFIG.prompt.jsonFormat}

${CONFIG.prompt.tagGuide}
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
${CONFIG.prompt.role}

${CONFIG.prompt.scoringCriteria}

${CONFIG.prompt.jsonFormat}

${CONFIG.prompt.tagGuide}
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
