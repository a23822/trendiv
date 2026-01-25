import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { YoutubeScraper } from './scrapers/YoutubeScraper';
import { GoogleSearchScraper } from './scrapers/GoogleSearchScraper';
import { StackOverflowScraper } from './scrapers/StackOverflowScraper';
import { YoutubeSearchScraper } from './scrapers/YoutubeSearchScraper';
import { RedditScraper } from './scrapers/RedditScraper';
import { TrendItem, Scraper } from './scrapers/interface';

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * 🏭 [인스턴스 캐싱] 루프 내부에서 매번 생성하지 않도록 미리 싱글톤으로 관리
 */
const scrapers: Record<string, Scraper> = {
  rss: new RssScraper(),
  html: new HtmlScraper(),
  youtube: new YoutubeScraper(),
  youtube_search: new YoutubeSearchScraper(),
  google_search: new GoogleSearchScraper(),
  stackoverflow: new StackOverflowScraper(),
  reddit: new RedditScraper(),
};

/**
 * 📅 날짜 필터링 함수
 */
function filterRecentTrends(trends: TrendItem[], days = 7): TrendItem[] {
  if (days <= 0) return trends;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return trends.filter((item) => {
    if (!item.date) {
      console.warn(`⚠️ date 없는 아이템 발견: ${item.title}`);
      return false;
    }
    const itemDate = new Date(item.date);
    return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
  });
}

/**
 * ⏳ 잠시 대기하는 헬퍼 함수
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 🚀 전체 스크래핑 실행 함수
 */
export async function scrapeAll(days: number = 7): Promise<TrendItem[]> {
  console.log(
    `🚀 Trendiv Scraper 가동... (최근 ${days > 0 ? days + '일' : '전체'} 수집)`,
  );

  let allResults: TrendItem[] = [];

  // 직렬 실행으로 VM 메모리 부하 방지
  for (const target of TARGETS) {
    console.log(`\n▶️ [Processing] ${target.name} (${target.type})...`);

    try {
      const scraper = scrapers[target.type];

      if (!scraper) {
        console.warn(`⚠️ 알 수 없는 타입 건너뜀: ${target.type}`);
        continue;
      }

      const results = await scraper.scrape(target);

      // results가 null/undefined일 경우 대비 및 대량 데이터 안전 병합
      if (results && Array.isArray(results) && results.length > 0) {
        // push(...spread) 대신 concat을 사용하여 Stack Overflow 방지
        allResults = allResults.concat(results);
        console.log(`   ✅ ${results.length}건 수집 완료`);
      } else {
        console.log(`   ℹ️ 수집된 결과가 없습니다. (정상 혹은 파싱 실패)`);
      }
    } catch (e: any) {
      console.error(`❌ [Error] ${target.name} (${target.type}) 수집 실패:`, {
        message: e.message,
        stack: e.stack,
        url: target.url,
        cause: e.cause,
      });
    }

    // 💡 CPU/RAM 숨 고르기 (1초 휴식)
    await delay(1000);
  }

  console.log(`\n📦 전체 수집 데이터: ${allResults.length}개`);

  // 최종 필터링
  const finalResults = filterRecentTrends(allResults, days);

  console.log(`✨ 날짜 필터링 적용 후 최종: ${finalResults.length}개`);

  return finalResults;
}
