import axios from 'axios';
import { Scraper, ScraperConfig, TrendItem } from './interface';

interface StackOverflowQuestion {
  question_id: number;
  title: string;
  body: string; // API 필터로 가져오는 본문 필드
  link: string;
  creation_date: number;
  tags: string[];
  score: number;
  view_count: number;
  answer_count: number;
}

interface StackOverflowResponse {
  items: StackOverflowQuestion[];
  has_more: boolean;
  quota_remaining: number;
}

export class StackOverflowScraper implements Scraper {
  private readonly API_BASE = 'https://api.stackexchange.com/2.3';

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🥞 [StackOverflow API] ${config.name} 수집 시작...`);

    try {
      const tags = config.url;
      const oneWeekAgo = Math.floor(
        (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
      );

      const response = await axios.get<StackOverflowResponse>(
        `${this.API_BASE}/questions`,
        {
          params: {
            order: 'desc',
            sort: 'activity',
            tagged: tags,
            site: 'stackoverflow',
            fromdate: oneWeekAgo,
            pagesize: 15,
            filter: 'withbody',
            key: process.env.STACKOVERFLOW_KEY,
          },
          timeout: 10000,
          headers: {
            'Accept-Encoding': 'gzip',
          },
          decompress: true,
        },
      );

      console.log(
        `   📊 API Quota remaining: ${response.data.quota_remaining}`,
      );

      const answered = response.data.items.filter((q) => q.answer_count > 0);

      const items: TrendItem[] = answered.map((q) => ({
        title: q.title,
        link: q.link,
        date: new Date(q.creation_date * 1000).toISOString(),
        source: config.name,
        category: config.category,
        content: q.body, // 여기서 q.body가 정확히 매핑되는지 확인
      }));

      console.log(`   ✅ ${items.length}개 질문 수집 완료 (본문 포함)`);
      return items;
    } catch (error: any) {
      console.error(`❌ [StackOverflow API] 에러:`, error.message);
      return [];
    }
  }
}
