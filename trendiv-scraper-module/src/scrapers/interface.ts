export interface TrendItem {
  title?: string;
  link?: string;
  date?: string;
  summary?: string;
  source: string;
}

export interface ScraperConfig {
  name: string;
  type: 'rss' | 'html';
  url: string;
  selector?: string;
}

export interface Scraper {
  scrape(config: ScraperConfig): Promise<TrendItem[]>;
}
