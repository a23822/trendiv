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

const CONCURRENCY_LIMIT = 3;

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
 * 개별 타겟 처리 함수 (병렬 실행용)
 */
async function processTarget(target: any): Promise<TrendItem[]> {
  try {
    let results: TrendItem[] = [];
    // console.log(`   ▶️ [Start] ${target.name} (${target.type})...`);

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
      console.log(`      ✅ [Done] ${target.name}: ${results.length}건`);
    } else {
      console.log(`      ℹ️ [Empty] ${target.name}`);
    }
    return results;
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error(`      ❌ [Fail] ${target.name}: ${err.message}`);
    return [];
  }
}

/**
 * 메인 스크래핑 함수
 */
export async function scrapeAll(
  mode: ScrapeMode = 'daily',
  manualDays?: number,
): Promise<TrendItem[]> {
  const days = manualDays ?? (mode === 'weekly' ? 4 : 3);

  console.log(
    `🚀 Trendiv Scraper 가동... (Mode: ${mode.toUpperCase()}, 기간: 최근 ${days}일)`,
  );

  const allResults: TrendItem[] = [];
  const browser: Browser | null = null; // Browser 인스턴스 관리가 필요하다면 여기서 처리

  // 타겟 필터링
  const targetsToRun = TARGETS.filter((t) => {
    const isDailyTarget = t.category === 'X' || t.category === 'YouTube';
    if (mode === 'daily') return isDailyTarget;
    if (mode === 'weekly') return !isDailyTarget;
    return true;
  });

  console.log(
    `📋 [Plan] 총 ${TARGETS.length}개 중 ${targetsToRun.length}개 타겟 실행 (병렬 처리)`,
  );

  try {
    // ⚡️ 배치 처리 (Batch Processing)
    // 한 번에 CONCURRENCY_LIMIT 개수만큼 병렬로 실행하여 시간 단축
    for (let i = 0; i < targetsToRun.length; i += CONCURRENCY_LIMIT) {
      const batch = targetsToRun.slice(i, i + CONCURRENCY_LIMIT);
      console.log(
        `\n🔄 [Batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}] Processing ${batch.length} targets...`,
      );

      // 병렬

      const batchResults = await Promise.allSettled(
        batch.map((target) => processTarget(target)),
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        } else {
          console.error('Batch item rejected:', result.reason);
        }
      });

      // 배치 사이 약간 대기 (CPU 부하 조절)
      if (i + CONCURRENCY_LIMIT < targetsToRun.length) {
        await delay(3000);
      }
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
