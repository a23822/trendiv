import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { TrendItem } from './scrapers/interface';

const rssScraper = new RssScraper();
const htmlScraper = new HtmlScraper();

// 📅 날짜 필터링 함수
// 기본값: 최근 N일 이내의 글만 통과시킴
function filterRecentTrends(trends: TrendItem[], days = 7): TrendItem[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days); // 오늘로부터 N일 전

  return trends.filter((item) => {
    if (!item.date) return false; // 날짜 없으면 탈락
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate; // 최근 글만 통과
  });
}

// ✅ Controller가 호출하는 메인 함수
export async function scrapeAll(): Promise<TrendItem[]> {
  console.log('🚀 Trendiv Scraper 가동...');

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

  console.log(`📦 전체 수집량 (필터 전): ${allResults.length}개`);

  const recentResults = filterRecentTrends(allResults, 7);

  console.log(`✨ 필터링 후 (최근 7일): ${recentResults.length}개`);
  return recentResults;
}
