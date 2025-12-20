import { chromium } from 'playwright';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class HtmlScraper implements Scraper {
  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🕷️ [HTML] ${config.name} 수집 시작...`);

    if (!config.selector) {
      console.error(`⚠️ ${config.name} 설정 오류: Selector 필수`);
      return [];
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      // 1. 페이지 접속
      await page.goto(config.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // ✅ [핵심 수정] 선택자에 해당하는 요소가 화면에 뜰 때까지 최대 10초 기다림
      try {
        await page.waitForSelector(config.selector, {
          timeout: 10000,
          state: 'visible',
        });
      } catch (e) {
        console.log(`⚠️ ${config.name}: 요소를 찾는 데 시간이 너무 걸립니다.`);
      }

      // 2. 데이터 추출 (브라우저 내부 실행)
      const trends = await page.evaluate((selector) => {
        // 선택자로 요소 찾기
        const elements = Array.from(document.querySelectorAll(selector));

        return elements
          .map((el) => {
            // Velog 구조 특화:
            // selector가 'a h4'라면 el은 h4임. 부모인 a 태그를 찾아야 링크를 얻음.
            // 반대로 selector가 카드 전체라면 내부에서 title/link를 찾아야 함.

            // 유연한 탐색 로직:
            // 1. 현재 요소가 a태그면 그거 씀
            // 2. 아니면 가장 가까운 부모 a태그 찾음 (closest)
            // 3. 그것도 없으면 내부에서 a태그 찾음 (querySelector)
            const linkEl =
              el.tagName === 'A'
                ? el
                : el.closest('a') || el.querySelector('a');
            const titleText = el.textContent?.trim();

            return {
              title: titleText,
              link: linkEl?.getAttribute('href') || undefined,
              date: new Date().toISOString(), // HTML은 날짜 찾기 어려우니 수집일로 대체
              summary: '',
            };
          })
          .filter((item) => item.title && item.link); // 제목/링크 없으면 버림
      }, config.selector);

      // Velog 링크가 상대주소(/@user/post...)인 경우 도메인 붙여주기
      const finalTrends = trends.map((t) => ({
        ...t,
        source: config.name,
        category: config.category,
        link: t.link?.startsWith('http')
          ? t.link
          : new URL(t.link || '', config.url).href,
      }));

      return finalTrends;
    } catch (error) {
      console.error(`❌ [HTML] ${config.name} 에러:`, error);
      return [];
    } finally {
      await browser.close();
    }
  }
}
