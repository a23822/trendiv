import axios from 'axios';
import { Scraper, ScraperConfig, TrendItem } from './interface';

interface StackOverflowQuestion {
  question_id: number;
  title: string;
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
      // config.url에서 태그 추출 (예: "css;html;accessibility")
      const tags = config.url;

      // 7일 전 타임스탬프
      const oneWeekAgo = Math.floor(
        (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
      );

      const response = await axios.get<StackOverflowResponse>(
        `${this.API_BASE}/questions`,
        {
          params: {
            order: 'desc',
            sort: 'activity', // 최근 활동순
            tagged: tags,
            site: 'stackoverflow',
            fromdate: oneWeekAgo,
            pagesize: 15,
            filter: '!nNPvSNdWme', // 기본 필터 (body 제외, 가벼움)
          },
          timeout: 10000,
          // gzip 압축 해제 (StackExchange API 필수)
          headers: {
            'Accept-Encoding': 'gzip',
          },
          decompress: true,
        },
      );

      console.log(
        `   📊 API Quota remaining: ${response.data.quota_remaining}`,
      );

      // 답변 있는 질문만 필터링
      const answered = response.data.items.filter((q) => q.answer_count > 0);

      const items: TrendItem[] = answered.map((q) => ({
        title: q.title,
        link: q.link,
        date: new Date(q.creation_date * 1000).toISOString(),
        source: config.name,
        category: config.category,
      }));

      console.log(
        `   ✅ ${items.length}개 질문 수집 (답변 있는 것만, 전체 ${response.data.items.length}개 중)`,
      );
      return items;
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.error(`❌ [StackOverflow API] 잘못된 태그: ${config.url}`);
      } else if (error.response?.status === 502) {
        console.error(`❌ [StackOverflow API] 서버 일시 장애 (502)`);
      } else {
        console.error(`❌ [StackOverflow API] 에러:`, error.message);
      }
      return [];
    }
  }
}
