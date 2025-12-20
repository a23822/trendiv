import axios from 'axios';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class StackOverflowScraper implements Scraper {
  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🥞 [StackOverflow] ${config.name} 인기 이슈 스캔 중...`);

    try {
      // 24시간 전 타임스탬프 계산 (Unix Epoch Time)
      const oneWeekAgo = Math.floor(
        (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
      );
      const response = await axios.get(
        'https://api.stackexchange.com/2.3/search',
        {
          params: {
            site: 'stackoverflow',
            order: 'desc',
            sort: 'votes', // 추천 많은 순 (검증된 이슈)
            tagged: config.url, // 예: 'css;html;accessibility'
            min: 5, // ✨ 최소 추천 5개 이상 (노이즈 제거)
            fromdate: oneWeekAgo, // 지난 7일 내 생성된 글
            pagesize: 10,
          },
        },
      );

      const items = response.data.items || [];
      console.log(`   -> ${items.length}개의 핫한 이슈 발견`);

      return items.map((item: any) => ({
        title: item.title,
        link: item.link,
        date: new Date(item.creation_date * 1000).toISOString(),
        source: config.name, // 예: "StackOverflow"
        category: config.category, // 예: "StackOverflow"
      }));
    } catch (error: any) {
      console.error(`❌ [StackOverflow] API 요청 실패: ${error.message}`);
      return [];
    }
  }
}
