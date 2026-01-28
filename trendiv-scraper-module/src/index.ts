import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { YoutubeScraper } from './scrapers/YoutubeScraper';
import { GoogleSearchScraper } from './scrapers/GoogleSearchScraper';
import { StackOverflowScraper } from './scrapers/StackOverflowScraper';
import { YoutubeSearchScraper } from './scrapers/YoutubeSearchScraper';
import { RedditScraper } from './scrapers/RedditScraper';
import { TrendItem, Scraper } from './scrapers/interface';
import { chromium, Browser } from 'playwright';

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

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

// 🆕 모드 타입 정의
export type ScrapeMode = 'daily' | 'weekly';

/**
 * 메인 스크래핑 함수
 * @param mode 'daily' | 'weekly' (기본값 'daily')
 * @param manualDays (선택) 강제로 수집할 기간. 지정하지 않으면 모드에 따라 자동 설정됨 (Daily=3일, Weekly=4일)
 */
export async function scrapeAll(
  mode: ScrapeMode = 'daily',
  manualDays?: number,
): Promise<TrendItem[]> {
  // 1. 기간 자동 설정 로직
  // manualDays가 있으면(예: 365) 그걸 쓰고, 없으면 모드별 기본값 사용
  const days = manualDays ?? (mode === 'weekly' ? 4 : 3);

  console.log(
    `🚀 Trendiv Scraper 가동... (Mode: ${mode.toUpperCase()}, 기간: 최근 ${days}일)`,
  );

  const allResults: TrendItem[] = [];
  let browser: Browser | null = null;

  // 🆕 모드에 따른 타겟 필터링
  // Daily: X, Reddit (빠른 트렌드 반영이 필요한 소스)
  // Weekly: 그 외 나머지 (주간 단위로 확인해도 되는 소스)
  const targetsToRun = TARGETS.filter((t) => {
    const isDailyTarget = t.category === 'X' || t.category === 'YouTube';

    if (mode === 'daily') return isDailyTarget;
    if (mode === 'weekly') return !isDailyTarget;
    return true;
  });

  console.log(
    `📋 [Plan] 총 ${TARGETS.length}개 중 ${targetsToRun.length}개 타겟 실행`,
  );

  try {
    for (const target of targetsToRun) {
      console.log(`\n▶️ [Processing] ${target.name} (${target.type})...`);

      try {
        let results: TrendItem[] = [];

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
          case 'reddit':
            results = await new RedditScraper().scrape(target);
            break;
          default:
            console.warn(`⚠️ 알 수 없는 타입: ${target.type}`);
            results = [];
        }

        if (results.length > 0) {
          allResults.push(...results);
          console.log(`   ✅ ${results.length}건 수집 완료`);
        } else {
          console.log(`   ℹ️ 수집된 결과가 없습니다.`);
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error(`⚠️ [Skip] ${target.name} 수집 실패:`, err.message);
      }
      await delay(500);
    }
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('❌ Scraper Critical Error:', err.message);
  } finally {
    if (browser) {
      await (browser as Browser).close();
    }
  }

  console.log(`\n📦 전체 수집량: ${allResults.length}개`);
  const finalResults = filterRecentTrends(allResults, days);
  console.log(`✨ 필터링 적용 후: ${finalResults.length}개`);

  return finalResults;
}
