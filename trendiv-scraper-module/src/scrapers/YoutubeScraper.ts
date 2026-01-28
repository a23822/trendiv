import Parser from 'rss-parser';
import { Scraper, ScraperConfig, TrendItem } from './interface';

export class YoutubeScraper implements Scraper {
  private parser = new Parser({
    customFields: {
      item: [['media:group', 'media']],
    },
  });

  async scrape(config: ScraperConfig): Promise<TrendItem[]> {
    console.log(`📹 [YouTube Sub] ${config.name} 채널 확인 중...`);

    try {
      const feed = await this.parser.parseURL(config.url);

      // 최신 3개만 빠르게 확인
      const items = feed.items.slice(0, 3).map((item: any) => {
        const videoId = item.id.replace('yt:video:', '');
        const link = item.link || `https://www.youtube.com/watch?v=${videoId}`;
        const media = item['media'];
        // const description = media?.['media:description']?.[0] || '';

        return {
          title: item.title || '제목 없음',
          link: link,
          date: item.isoDate || new Date().toISOString(),
          content: '',
          source: config.name,
          category: config.category,
        };
      });

      console.log(`   -> ${items.length}개 영상 감지`);
      return items;
    } catch (error: any) {
      console.error(`❌ [YouTube Sub] ${config.name} 실패:`, error.message);
      return [];
    }
  }
}
