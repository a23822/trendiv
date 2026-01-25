export interface TrendItem {
  title?: string;
  link?: string;
  date?: string;
  source: string;
  category: string;
  content?: string;
}

export interface ScraperConfig {
  name: string;
  category: string;
  type:
    | 'rss'
    | 'html'
    | 'youtube_search'
    | 'youtube'
    | 'google_search'
    | 'stackoverflow'
    | 'reddit';
  url: string;
  selector?: string;
  useProxy?: boolean;
}

export interface Scraper {
  scrape(config: ScraperConfig): Promise<TrendItem[]>;
}
