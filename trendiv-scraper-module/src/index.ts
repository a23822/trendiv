import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { YoutubeScraper } from './scrapers/YoutubeScraper';
import { GoogleSearchScraper } from './scrapers/GoogleSearchScraper';
import { StackOverflowScraper } from './scrapers/StackOverflowScraper';
import { YoutubeSearchScraper } from './scrapers/YoutubeSearchScraper';
import { TrendItem } from './scrapers/interface';

// 📅 날짜 필터링 함수 (기존 유지)
function filterRecentTrends(trends: TrendItem[], days = 7): TrendItem[] {
  if (days <= 0) return trends;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return trends.filter((item) => {
    if (!item.date) return false;
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate;
  });
}

export async function scrapeAll(days: number = 7): Promise<TrendItem[]> {
  console.log(
    `🚀 Trendiv Scraper 가동... (최근 ${days > 0 ? days + '일' : '전체'} 수집)`,
  );

  const tasks = TARGETS.map(async (target) => {
    try {
      // 🏭 팩토리 패턴: 타입에 맞는 스크래퍼 실행
      switch (target.type) {
        case 'rss':
          return await new RssScraper().scrape(target);
        case 'html':
          return await new HtmlScraper().scrape(target);
        case 'youtube':
          return await new YoutubeScraper().scrape(target); // ✅
        case 'youtube_search':
          return await new YoutubeSearchScraper().scrape(target);
        case 'google_search':
          return await new GoogleSearchScraper().scrape(target); // ✅
        case 'stackoverflow':
          return await new StackOverflowScraper().scrape(target); // ✅
        default:
          console.warn(`⚠️ 알 수 없는 타입: ${target.type}`);
          return [];
      }
    } catch (e) {
      console.error(`⚠️ [Skip] ${target.name} 수집 실패`);
      return [];
    }
  });

  const results = await Promise.all(tasks);

  const allResults: TrendItem[] = [];
  results.forEach((r) => allResults.push(...r));

  console.log(`📦 전체 수집량: ${allResults.length}개`);

  const finalResults = filterRecentTrends(allResults, days);

  console.log(`✨ 필터링 적용 후: ${finalResults.length}개`);
  return finalResults;
}
