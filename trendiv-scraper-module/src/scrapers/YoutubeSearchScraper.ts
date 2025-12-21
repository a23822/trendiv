import axios from 'axios';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class YoutubeSearchScraper implements Scraper {
  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🔭 [YouTube Search] 키워드 모니터링: "${config.url}"`);

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    if (!apiKey) {
      console.error('❌ Google API Key가 없습니다.');
      return [];
    }

    try {
      // 📅 날짜 계산: 오늘로부터 7일 전 (일주일 트렌드 확인)
      // 너무 짧으면(1일) 놓치는 게 많고, 너무 길면(30일) 트렌드가 아님
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const publishedAfter = pastDate.toISOString(); // RFC 3339 포맷 (YYYY-MM-DDThh:mm:ssZ)

      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            part: 'snippet',
            q: config.url,
            key: apiKey,
            type: 'video',

            order: 'relevance', // 1. 정확도순 정렬 (기본값)
            publishedAfter: publishedAfter, // 2. 단, 최근 7일 이내 영상만!

            maxResults: 5,
          },
        },
      );

      const items = response.data.items || [];
      console.log(`   -> 🔍 [최근 7일] 검색 결과 ${items.length}건 발견`);

      return items.map((item: any) => ({
        title: item.snippet.title,
        link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        date: item.snippet.publishedAt,
        source: config.name,
        category: config.category,
      }));
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn(`⚠️ [YouTube Search] API 할당량(Quota) 초과!`);
      } else {
        console.error(`❌ [YouTube Search] 검색 실패:`, error.message);
      }
      return [];
    }
  }
}
