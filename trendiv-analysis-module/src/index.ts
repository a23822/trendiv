import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { chromium, Browser } from 'playwright';

// 1. 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 2. Gemini 설정
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY가 없습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

console.log(`⚙️ Trendiv 심층 분석 엔진 가동 (Model: ${MODEL_NAME})`);

interface TrendItem {
  id: number;
  title: string;
  link: string;
  date: string;
  summary: string;
  source: string;
}

interface AnalyzedReport {
  title: string;
  title_ko: string;
  oneLineSummary: string;
  keyPoints: string[];
  tags: string[];
  score: number;
  reason: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 🕸️ [Playwright] 본문 추출
async function fetchArticleContent(
  browser: Browser,
  url: string,
): Promise<string> {
  let page;
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    const content = await page.evaluate(() => {
      const trash = document.querySelectorAll(
        'script, style, nav, footer, header, aside, .ads, .comments, #comments',
      );
      trash.forEach((el) => el.remove());
      // innerText 에러 방지를 위해 HTMLElement로 단언
      const article = document.querySelector(
        'article, main, .post-content, .entry-content',
      ) as HTMLElement | null;
      return (article || document.body).innerText;
    });

    return content.replace(/\s+/g, ' ').trim().substring(0, 10000);
  } catch (e) {
    console.warn(`⚠️ 본문 수집 실패 (${url}) - 요약본으로 대체합니다.`);
    return '';
  } finally {
    if (page) await page.close();
  }
}

// 재시도 로직
async function generateContentWithRetry(
  prompt: string,
  maxRetries = 3,
): Promise<any> {
  let delay = 2000; // 2초 대기부터 시작

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      // 503(서버 과부하)이거나 429(요청 너무 많음)일 때만 재시도
      const isRetryable =
        error.message.includes('503') ||
        error.message.includes('overloaded') ||
        error.message.includes('429');

      if (isRetryable && attempt < maxRetries) {
        console.warn(
          `      ⚠️ Gemini 과부하(503). ${delay / 1000}초 후 재시도합니다... (${attempt}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // 대기 시간 2배로 늘림 (2초 -> 4초 -> 8초)
        continue;
      }
      throw error; // 재시도 횟수 초과하거나 다른 에러면 포기
    }
  }
}

// 🧠 분석 함수
async function analyzeArticle(
  browser: Browser,
  item: TrendItem,
): Promise<AnalyzedReport | null> {
  console.log(`🔍 분석 대기: ${item.title.substring(0, 30)}...`);

  const fullContent = await fetchArticleContent(browser, item.link);
  const context = fullContent.length > 300 ? fullContent : item.summary;

  console.log(`🧠 심층 분석 중 (Context: ${context.length}자)`);

  const prompt = `
    당신은 'Trendiv' 뉴스레터의 **수석 마크업(Markup) 기술 에디터**입니다.
    당신의 독자는 **HTML, CSS, 웹 접근성, 모바일 웹 렌더링**에 미쳐있는 프론트엔드 개발자들입니다.
    아래 글을 분석하여 독자에게 가치가 있는지를 **매우 엄격하게(Strictly)** 평가하세요.

    [분석 대상]
    제목: ${item.title}
    본문: ${context.substring(0, 20000)}

    [🔥 채점 기준표 (Scoring Criteria)]
    
    **✅ 점수 8~10점 (필독):**
    1. **Deep CSS:** 최신 CSS 스펙(:has, @layer, container queries), 레이아웃 꿀팁, 복잡한 애니메이션 구현.
    2. **HTML & Semantics:** 시맨틱 마크업, 새로운 HTML 태그, SEO 최적화 구조.
    3. **Web Accessibility (A11y):** WCAG 가이드, ARIA 패턴, 스크린 리더 대응, 키보드 접근성 해결책.
    4. **Mobile Web Issues:** **iOS(Safari) 100vh 버그, 노치 대응, Android WebView 렌더링 이슈**, 터치 이벤트 처리 등 **모바일 웹 호환성** 문제 해결.

    **⚠️ 점수 4~7점 (참고):**
    - 모던 JS 프레임워크(React, Svelte 등)의 **UI/컴포넌트 패턴** 이야기.
    - 브라우저 렌더링 엔진(Blink, Webkit) 업데이트 소식.
    - 디자인 시스템 구축 경험기.

    **🗑️ 점수 0점 (가차 없이 탈락):**
    - **백엔드/인프라:** DB, Docker, AWS, Server, Python, Java 등.
    - **일반 AI/ML:** "LLM 모델이 나왔다", "AI가 세상을 바꾼다" 같은 뜬구름 잡는 소리.
    - **비즈니스/커리어:** 연봉, 이직, 리더십, 회사 자랑.
    - **기타:** 블록체인, 하드웨어, 게임 개발 등 웹 UI와 무관한 것.

    [출력 포맷 (JSON Only)]
    {
      "score": 0~10 (정수, 기준에 안 맞으면 과감하게 0점 줄 것),
      "title": "원문 제목 (개발자가 클릭하고 싶게)",
      "title_ko": "title 을 한국어로 번역"
      "oneLineSummary": "한 줄 요약 (한국어)",
      "keyPoints": ["핵심1", "핵심2", "핵심3"......],
      "tags": ["CSS", "A11y", "iOS" 등], 
      "reason": "점수 부여 사유 (예: 'iOS 17 사파리 렌더링 버그를 다루므로 9점'), 0점일 경우 탈락 사유"
    }
  `;

  try {
    const result = await generateContentWithRetry(prompt);
    const response = await result.response;
    let text = response
      .text()
      .replace(/```json|```/g, '')
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text) as AnalyzedReport;

    return data;
  } catch (e: any) {
    // 에러 로그만 살짝 수정
    console.error(
      `❌ 분석 최종 실패 (${item.title}): ${e.message.substring(0, 50)}...`,
    );
    return null;
  }
}

// 메인 실행
if (require.main === module) {
  (async () => {
    let browser;
    try {
      const dataDir = path.resolve(
        __dirname,
        '../../trendiv-scraper-module/data',
      );
      if (!fs.existsSync(dataDir)) throw new Error('데이터 폴더 없음');

      const files = fs
        .readdirSync(dataDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse();
      if (files.length === 0) throw new Error('데이터 파일 없음');

      const latestFile = path.join(dataDir, files[0]);
      console.log(`📂 데이터 로드: ${latestFile}`);

      const trends: TrendItem[] = JSON.parse(
        fs.readFileSync(latestFile, 'utf-8'),
      );
      const reports = [];

      console.log('🕷️ Playwright 브라우저 실행 중...');
      browser = await chromium.launch({ headless: true });

      // 상위 6개 분석
      for (const item of trends.slice(0, 6)) {
        const analysis = await analyzeArticle(browser, item);
        if (analysis) {
          reports.push({ original: item, analysis: analysis });
        }
        await delay(4500);
      }

      if (reports.length === 0) {
        console.log('😅 분석 결과 살아남은(0점 이상) 기사가 하나도 없습니다.');
      } else {
        const resultPath = path.join(__dirname, 'analysis_result.json');
        fs.writeFileSync(resultPath, JSON.stringify(reports, null, 2), 'utf-8');
        console.log(
          `💾 [${reports.length}건] 알짜배기 분석 완료! 저장됨: ${resultPath}`,
        );
      }
    } catch (e) {
      console.error('❌ 오류:', e);
    } finally {
      if (browser) await browser.close();
    }
  })();
}

export async function runAnalysis(trends: TrendItem[]): Promise<any[]> {
  console.log(`🧠 [Analysis] Start analyzing ${trends.length} items...`);

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY Missing!');
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const reports = [];

  try {
    // 비용 절약을 위해 최대 5개만 분석 (테스트용)
    const targetItems = trends.slice(0, 5);

    for (const item of targetItems) {
      console.log(`   -> Analyzing: ${item.title.substring(0, 20)}...`);
      const analysis = await analyzeArticle(browser, item);
      if (analysis) {
        // 원본 데이터와 분석 결과를 합쳐서 반환
        reports.push({
          ...analysis,
          originalLink: item.link,
          date: item.date,
          id: item.id,
        });
      }
      // Rate Limit 방지용 딜레이
      await new Promise((r) => setTimeout(r, 2000));
    }
  } finally {
    await browser.close();
  }

  return reports;
}

export async function translateTitleOnly(title: string): Promise<string> {
  const prompt = `
    Translate this tech article title to Korean naturally for developers.
    CLICK-BAIT style but professional.
    Input: "${title}"
    Output (String only):
  `;

  try {
    // 재시도 로직 없이 심플하게 호출
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error(`❌ 번역 실패: ${title}`);
    return title; // 실패하면 원문 반환
  }
}
