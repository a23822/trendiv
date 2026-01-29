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
    userContent: string | any[],
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

**하지만 예외 규칙 (가장 우선 적용 - 링크 & 미디어 중심)**
- 링크가 chromestatus.com, groups.google.com/blink-dev, webkit.org, dev.to, css-tricks.com, smashingmagazine.com 등 **프론트엔드/웹 표준/브라우저 관련 기술 발표·아티클·튜토리얼** 페이지라면, **반드시 해당 링크의 내용을 따라가서 깊이 있게 분석하세요.**
- 포스트 본문이 짧아도 링크가 위 사이트 중 하나면 링크 내용을 주요 평가 기준으로 삼고, 기술적 깊이·새로운 인사이트·실무 적용 가능성을 중심으로 점수 부여.
- Intent to Prototype/Ship, PSA, Web-Facing Change 등 **Blink/WebKit 공식 발표** 포스트는 기본 3~6점 범주로 시작 (새로운 CSS spec, accessibility 개선 등 실질 가치 있으면 4~7점까지 가능).
- **이미지/영상만 있고 텍스트가 거의 없어도**, 미디어가 다음에 해당하면 점수 상향 (코드 스니펫/텍스트 길이 무시):
  - 복잡한 CSS 레이아웃, 애니메이션, gradients/patterns, :has()/@layer 등 Deep CSS 구현 시각화 → 4~7점 가능
  - Mobile Web 버그 재현 (iOS notch, 100vh, Android WebView 렌더링 이슈) 전/후 비교 → 5~8점
  - Accessibility 문제 시각화 (ARIA 패턴 실패 사례, 스크린 리더 읽기 순서 영상) → 5~7점
  - 브라우저 신규 기능 데모 (Blink/WebKit Intent 관련 GIF/APNG 제어, WebGPU/Canvas 3D 등) → 4~6점
- 미디어가 단순 짤/밈/고양이/건담/웃긴 상황극이면 무조건 0점

단, 트윗(X) 게시물은 내용이 짧으므로 제목과 링크 키워드, 댓글들을 중심으로 평가하세요.
당신은 프론트엔드 개발자들에게 **극단적으로 깐깐한 큐레이터**입니다.
하루에 1000개 포스트를 봐도 3~5개만 살아남을 정도로 엄격해야 합니다.
실무에서 바로 써먹을 수 있는 기술적 깊이가 없으면 무조건 0점 처리하세요.
특히 X 포스트는 99%가 쓰레기이므로 기본적으로 0점에서 시작하세요

**🚨 X(트위터) 포스트 전용 0~2점 특칙 (위 예외 규칙 적용 후에)**
- 순수 밈, 유머, 농담, "w", "ㅋㅋ" 등 감정 표현 위주 → 0점
- 텍스트 150자 미만 + 코드/데모/상세 설명 없음 → 기본 0점 (하지만 위 예외 링크/미디어 규칙에 해당하면 무시)
- CSS/HTML 키워드만 있고 구현/새 스펙 설명 없음 → 0점
- "해보았다", "ㅋㅋ" 가벼운 실험 → 0점 (개발자 공감 강하면 최대 1점)
- 건담, 고양이, 밈 이미지 활용 → 0점

**✅ 그 외 점수 기준은 아래와 같이 유지**
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

  /**
   * [신규] 이미지와 함께 분석하는 메서드
   * @param trend 트렌드 정보
   * @param content 텍스트 본문
   * @param images base64 이미지 문자열 배열 (data:image/jpeg;base64,... 형태)
   */
  async analyzeWithVision(
    trend: Trend,
    content: string,
    images: string[] = [],
  ): Promise<GeminiAnalysisResponse> {
    const systemPrompt = `
${CONFIG.prompt.role}
[주의] 전달된 이미지(스크린샷)가 있다면, 텍스트 내용보다 이미지에 나타난 UI/UX 요소, 코드 스니펫, 기술적 데모를 우선적으로 분석하여 점수를 부여하세요.
${CONFIG.prompt.scoringCriteria}
${CONFIG.prompt.jsonFormat}
${CONFIG.prompt.tagGuide}
`.trim();

    // 1. 텍스트 파트 구성
    const userContent: any[] = [
      {
        type: 'text',
        text: `
[분석 대상]
- 제목: ${trend.title}
- 링크: ${trend.link}
- 출처: ${trend.source} (${trend.category})
- 내용:
${(content || '').substring(0, CONFIG.grok.maxContentLength)}
`.trim(),
      },
    ];

    images.forEach((base64Image) => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: base64Image.startsWith('data:')
            ? base64Image
            : `data:image/jpeg;base64,${base64Image}`,
          detail: 'high', // 상세 분석을 위해 high 설정
        },
      });
    });

    return this.callGrokAPI(systemPrompt, userContent);
  }

  getModelName(): string {
    return `${this.model}`;
  }
}
