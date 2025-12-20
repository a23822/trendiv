import axios from 'axios';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class GoogleSearchScraper implements Scraper {
  // 📅 날짜 추출 헬퍼 함수 (핵심 개선)
  private extractDate(item: any): string {
    try {
      // 1순위: 메타태그(pagemap)에 있는 정확한 날짜 확인
      const metatags = item.pagemap?.metatags?.[0];
      if (metatags) {
        const publishedTime =
          metatags['article:published_time'] || metatags['date'];
        if (publishedTime) {
          return new Date(publishedTime).toISOString();
        }
      }

      // 2순위: 스니펫(요약글) 앞부분 날짜 파싱 (예: "Dec 18, 2025 ...")
      // 구글 검색 결과는 종종 "날짜 ... 내용" 형식으로 옴
      const dateMatch = item.snippet?.match(/^([A-Z][a-z]{2} \d{1,2}, \d{4})/);
      if (dateMatch) {
        return new Date(dateMatch[1]).toISOString();
      }

      // 3순위: 상대적 시간 표현 파싱 (예: "20 hours ago")
      const relativeMatch = item.snippet?.match(
        /^(\d+) (hour|minute|day)s? ago/,
      );
      if (relativeMatch) {
        const amount = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2];
        const date = new Date();

        if (unit === 'day') date.setDate(date.getDate() - amount);
        else if (unit === 'hour') date.setHours(date.getHours() - amount);
        else if (unit === 'minute') date.setMinutes(date.getMinutes() - amount);

        return date.toISOString();
      }
    } catch (e) {
      // 파싱 실패 시 조용히 넘어감
    }

    // 4순위: 정 안 되면 수집 시점(현재 시간) 반환
    return new Date().toISOString();
  }

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`🔍 [Google] ${config.name} 검색 시작...`);

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
      console.error('❌ Google Search API Key 또는 CX가 설정되지 않았습니다.');
      return [];
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: apiKey,
            cx: cx,
            q: config.url,
            dateRestrict: 'd1', // 24시간 이내
            sort: 'date',
          },
        },
      );

      const items = response.data.items || [];
      console.log(`   -> 🕊️ ${items.length}개의 검색 결과 발견`);

      return items.map((item: any) => ({
        title: item.title || '제목 없음',
        link: item.link,

        // ❌ summary 삭제 (DB 저장 안 함)

        // ✨ 개선된 날짜 적용
        date: this.extractDate(item),

        source: config.name,
        category: config.category,
      }));
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(
          '⚠️ [Google] 일일 무료 쿼터(100회) 초과! 내일 다시 시도하세요.',
        );
      } else {
        console.error(`❌ [Google] 검색 실패: ${error.message}`);
      }
      return [];
    }
  }
}
