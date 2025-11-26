import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { TrendItem } from './scrapers/interface';

const rssScraper = new RssScraper();
const htmlScraper = new HtmlScraper();

// 📅 날짜 필터링 함수
// 기본값: 최근 N일 이내의 글만 통과시킴
function filterRecentTrends(trends: TrendItem[], days = 7): TrendItem[] {
  if (days <= 0) return trends;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days); // 오늘로부터 N일 전

  return trends.filter((item) => {
    if (!item.date) return false; // 날짜 없으면 탈락
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate; // 최근 글만 통과
  });
}

export async function scrapeAll(days: number = 7): Promise<TrendItem[]> {
  console.log(
    `🚀 Trendiv Scraper 가동... (최근 ${days > 0 ? days + '일' : '전체'} 수집)`,
  );

  const tasks = TARGETS.map(async (target) => {
    try {
      if (target.type === 'rss') {
        return await rssScraper.scrape(target);
      } else if (target.type === 'html') {
        return await htmlScraper.scrape(target);
      }
    } catch (e) {
      console.error(`⚠️ [Skip] ${target.name} 수집 실패`);
    }
    return [];
  });

  const results = await Promise.all(tasks);

  const allResults: TrendItem[] = [];
  results.forEach((r) => allResults.push(...r));

  console.log(`📦 전체 수집량: ${allResults.length}개`);

  // 설정된 기간만큼 필터링
  const finalResults = filterRecentTrends(allResults, days);

  console.log(`✨ 필터링 적용 후: ${finalResults.length}개`);
  return finalResults;
}
