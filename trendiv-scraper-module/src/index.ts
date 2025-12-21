import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { YoutubeScraper } from './scrapers/YoutubeScraper';
import { GoogleSearchScraper } from './scrapers/GoogleSearchScraper';
import { StackOverflowScraper } from './scrapers/StackOverflowScraper';
import { YoutubeSearchScraper } from './scrapers/YoutubeSearchScraper';
import { TrendItem } from './scrapers/interface';

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// 📅 날짜 필터링 함수
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

// ⏳ 잠시 대기하는 헬퍼 함수 (메모리 정리 시간 확보용)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeAll(days: number = 7): Promise<TrendItem[]> {
  console.log(
    `🚀 Trendiv Scraper 가동... (최근 ${days > 0 ? days + '일' : '전체'} 수집)`,
  );

  const allResults: TrendItem[] = [];

  // 🚨 [핵심 변경] Promise.all(병렬) -> for..of 루프(직렬)로 변경
  // 하나씩 차례대로 실행하여 VM 메모리 폭발 방지
  for (const target of TARGETS) {
    console.log(`\n▶️ [Processing] ${target.name} (${target.type})...`);

    try {
      let results: TrendItem[] = [];

      // 🏭 팩토리 패턴: 타입에 맞는 스크래퍼 실행
      switch (target.type) {
        case 'rss':
          results = await new RssScraper().scrape(target);
          break;
        case 'html':
          results = await new HtmlScraper().scrape(target);
          break;
        case 'youtube':
          results = await new YoutubeScraper().scrape(target);
          break;
        case 'youtube_search':
          results = await new YoutubeSearchScraper().scrape(target);
          break;
        case 'google_search':
          results = await new GoogleSearchScraper().scrape(target);
          break;
        case 'stackoverflow':
          results = await new StackOverflowScraper().scrape(target);
          break;
        default:
          console.warn(`⚠️ 알 수 없는 타입: ${target.type}`);
          results = [];
      }

      // 결과 합치기
      if (results.length > 0) {
        allResults.push(...results);
        console.log(`   ✅ ${results.length}건 수집 완료`);
      }
    } catch (e) {
      console.error(`⚠️ [Skip] ${target.name} 수집 실패:`, e);
      // 하나가 실패해도 다음 루프로 계속 진행
    }

    // 💡 CPU/RAM 숨 고르기 (1초 휴식)
    await delay(1000);
  }
  console.log(`\n📦 전체 수집량: ${allResults.length}개`);

  // const finalResults = filterRecentTrends(allResults, days);

  // console.log(`✨ 필터링 적용 후: ${finalResults.length}개`);
  // return finalResults;
  return allResults;
}
