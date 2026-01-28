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

/**
 * 🚀 전체 스크래핑 실행 함수
 */
export async function scrapeAll(days: number = 7): Promise<TrendItem[]> {
  console.log(
    `🚀 Trendiv Scraper 가동... (최근 ${days > 0 ? days + '일' : '전체'} 수집)`,
  );

  let allResults: TrendItem[] = [];

  let browser: Browser | null = null;
  const BATCH_SIZE = 5;

  const launchBrowser = async () => {
    try {
      if (browser) await browser.close().catch(() => {});
      console.log('🌍 브라우저 인스턴스 시작 (Memory Clean)...');
      return await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
        ],
        env: {
          ...process.env,
          DBUS_SESSION_BUS_ADDRESS: '/dev/null',
        },
      });
    } catch (e: unknown) {
      console.error('❌ 브라우저 실행 실패:', e);
      return null;
    }
  };

  browser = await launchBrowser();

  // 직렬 실행으로 VM 메모리 부하 방지
  for (let i = 0; i < TARGETS.length; i++) {
    const target = TARGETS[i];

    // 주기적 재시작 로직
    if (i > 0 && i % BATCH_SIZE === 0) {
      console.log(`♻️ [System] ${BATCH_SIZE}개 처리 완료. 브라우저 재시작...`);
      browser = await launchBrowser();
    }

    console.log(`\n▶️ [Processing] ${target.name} (${target.type})...`);

    try {
      let results: TrendItem[] = [];

      switch (target.type) {
        case 'rss':
          results = await new RssScraper(browser || undefined).scrape(target);
          break;
        case 'html':
          results = await new HtmlScraper(browser || undefined).scrape(target);
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
        console.log(`   ℹ️ 수집된 결과가 없습니다. (정상 혹은 파싱 실패)`);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`⚠️ [Skip] ${target.name} 수집 실패:`, {
        message: err.message,
        type: target.type,
      });
    }

    // 💡 CPU/RAM 숨 고르기 (1초 휴식)
    await delay(1000);
  }

  // 모든 작업이 끝나면 브라우저 종료
  if (browser) {
    console.log('🌍 브라우저 인스턴스 종료...');
    await browser.close();
  }

  console.log(`\n📦 전체 수집 데이터: ${allResults.length}개`);

  // 최종 필터링
  const finalResults = filterRecentTrends(allResults, days);

  console.log(`✨ 날짜 필터링 적용 후 최종: ${finalResults.length}개`);

  return finalResults;
}
