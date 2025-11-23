import fs from 'fs';
import path from 'path';
import { TARGETS } from './config/targets';
import { RssScraper } from './scrapers/RssScraper';
import { HtmlScraper } from './scrapers/HtmlScraper';
import { TrendItem } from './scrapers/interface';

const rssScraper = new RssScraper();
const htmlScraper = new HtmlScraper();

// 📅 [신규 기능] 날짜 필터링 함수 (기본값: 최근 7일)
function filterRecentTrends(trends: TrendItem[], days = 7): TrendItem[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days); // 오늘로부터 N일 전

  return trends.filter((item) => {
    if (!item.date) return false; // 날짜 없으면 탈락
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate; // 최근 글만 통과
  });
}

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

  console.log(`📦 전체 수집량: ${allResults.length}개`);
  return allResults;
}

if (require.main === module) {
  (async () => {
    try {
      // 1. 전체 수집
      const rawTrends = await scrapeAll();

      // 2. [핵심] 최근 7일 데이터만 필터링 (다이어트!)
      const recentTrends = filterRecentTrends(rawTrends, 7);
      console.log(`✨ 필터링 후: ${recentTrends.length}개 (최근 7일)`);

      if (recentTrends.length === 0) {
        console.log('😅 최근 7일간 올라온 새 글이 없습니다.');
      }

      // 3. 저장
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const fileName = `trends_${yyyy}_${mm}_${dd}.json`;

      const filePath = path.join(dataDir, fileName);

      // 필터링된 가벼운 데이터만 저장
      fs.writeFileSync(
        filePath,
        JSON.stringify(recentTrends, null, 2),
        'utf-8',
      );

      console.log(`💾 저장 완료: ${filePath}`);
    } catch (e) {
      console.error('❌ 오류:', e);
    } finally {
      console.log('👋 작업 종료.');
      process.exit(0);
    }
  })();
}
