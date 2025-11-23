import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { chromium, Browser } from 'playwright';

// 1. 환경 변수 로드
dotenv.config();

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
  title: string;
  link: string;
  date: string;
  summary: string;
  source: string;
}

interface AnalyzedReport {
  title: string;
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

// 🧠 분석 함수
async function analyzeArticle(
  browser: Browser,
  item: TrendItem,
): Promise<AnalyzedReport | null> {
  console.log(`🔍 분석 대기: ${item.title.substring(0, 30)}...`);

  const fullContent = await fetchArticleContent(browser, item.link);
  const context = fullContent.length > 300 ? fullContent : item.summary;

  console.log(`🧠 심층 분석 중 (Context: ${context.length}자)`);

  // 🔥 [핵심 수정] 사용자 요청 반영: HTML/CSS/접근성/모바일 이슈 강조
  const prompt = `
    당신은 'Trendiv' 뉴스레터의 **수석 기술 에디터**입니다.
    아래 글을 분석하여 한국 개발자를 위한 인사이트를 JSON으로 작성하세요.

    [분석 대상]
    제목: ${item.title}
    본문: ${context}

    [🔥 가치 평가 및 필터링 기준]
    다음 주제 중 하나라도 **깊이 있게** 다루는 경우에만 높은 점수(Score > 5)를 부여하세요.
    1. **HTML/CSS/Modern Web**: 최신 CSS 기능(예: :has, View Transitions), HTML 시맨틱, 브라우저 렌더링 엔진 이슈.
    2. **Web Accessibility (A11y)**: **WCAG 가이드라인, ARIA, 스크린 리더 호환성, 키보드 접근성.** (가산점 부여 ⭐)
    3. **Mobile Web Issues**: iOS(Safari)나 Android(Chrome) 환경에서의 **렌더링 버그, 뷰포트 문제, 터치 이벤트, PWA** 해결책.
    
    *경고: 단순한 백엔드, 인프라(Server/DB), 일반적인 AI 모델링, 단순 기업 뉴스는 **반드시 Score 0점** 처리하세요.*

    [출력 포맷 (JSON)]
    {
      "score": 0~10 (숫자, 0이면 탈락),
      "title": "한국어 제목 (매력적으로)",
      "oneLineSummary": "한 줄 요약 (한국어)",
      "keyPoints": ["핵심1", "핵심2", "핵심3"],
      "tags": ["태그1", "태그2", "태그3"],
      "reason": "선정 또는 탈락 이유"
    }
    
    *반드시 JSON 형식만 반환하세요.*
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response
      .text()
      .replace(/```json|```/g, '')
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text) as AnalyzedReport;

    // 0점이면 가차 없이 버림 (return null)
    if (data.score === 0) {
      console.log(
        `🗑️ [탈락] 주제 불일치 (${data.reason}): ${item.title.substring(0, 20)}...`,
      );
      return null;
    }

    return data;
  } catch (error) {
    console.error(`❌ 분석 에러 (${item.title}):`, error);
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
