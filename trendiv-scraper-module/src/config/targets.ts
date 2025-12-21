import { ScraperConfig } from '../scrapers/interface';

export const TARGETS: ScraperConfig[] = [
  // =================================================
  // 1. Social & Community (Platform Name = Category)
  // =================================================
  {
    name: 'X (Twitter)',
    category: 'X',
    type: 'google_search',
    url: 'site:x.com (css OR html OR "web accessibility" OR a11y) -"marketing" -"hiring" -"job"',
  },
  {
    name: 'Hacker News',
    category: 'Hacker News',
    type: 'rss',
    url: 'https://hnrss.org/newest?q=web&points=100',
  },
  {
    name: 'Reddit',
    category: 'Reddit',
    type: 'rss',
    url: 'https://www.reddit.com/r/css+html+accessibility+a11y/top/.rss?t=day',
  },
  {
    name: 'Reddit',
    category: 'Reddit',
    type: 'rss',
    url: 'https://www.reddit.com/r/androiddev/top/.rss?t=week',
  },
  {
    name: 'StackOverflow',
    category: 'StackOverflow',
    type: 'rss',
    url: 'https://stackoverflow.com/feeds/tag?tagnames=ios+or+swift&sort=newest',
  },
  {
    name: 'StackOverflow',
    category: 'StackOverflow',
    type: 'stackoverflow',
    url: 'css;html;accessibility',
  },

  // =================================================
  // 2. YouTube (Grouped by Platform)
  // =================================================
  // 유튜브는 채널이 많고 개별 채널보다는 '유튜브 영상'이라는 포맷이 중요하므로 묶습니다.
  {
    name: 'Kevin Powell',
    category: 'YouTube',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJZv4d5rbIKd4QHMPkcABCw',
  },
  {
    name: 'Google Chrome Developers',
    category: 'YouTube',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCnUYZLuoy1rq1aVMwx4aTzw',
  },
  {
    name: 'Hyperplexed',
    category: 'YouTube',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCmEzz-dPBVrsy4ZluSsYHDg',
  },
  {
    name: 'Deque Systems',
    category: 'YouTube',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvNQ5aJllZ5Oi49jtMKeb0Q',
  },
  {
    name: 'TPGi',
    category: 'YouTube',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCmZe7GiM8tY5M8YHSg-Robg',
  },

  // =================================================
  //  YouTube Keywords (API - 발굴 개념 / 비용 100)
  // =================================================
  // 주의: 하루 쿼터(10,000) 고려하여 너무 많이 등록하지 말 것.
  // 예: 1시간마다 실행 시 24회 * 100점 = 2,400점 소모 (안전)
  {
    name: 'YouTube Search',
    category: 'YouTube',
    type: 'youtube_search', // API 모드
    url: 'html | css | a11y | Web accessibility', // 검색어
  },

  // =================================================
  // 3. Official Blogs (Each Name = Category)
  // =================================================
  // 블로그는 각각이 하나의 독립된 미디어이므로 이름을 카테고리로 사용합니다.
  {
    name: 'MDN Web Docs',
    category: 'MDN Web Docs',
    type: 'rss',
    url: 'https://developer.mozilla.org/en-US/blog/rss.xml',
  },
  {
    name: 'CSS-Tricks',
    category: 'CSS-Tricks',
    type: 'rss',
    url: 'https://css-tricks.com/feed/',
  },
  {
    name: 'Smashing Magazine',
    category: 'Smashing Magazine',
    type: 'rss',
    url: 'https://www.smashingmagazine.com/feed/',
  },
  {
    name: 'Apple Developer',
    category: 'Apple Developer',
    type: 'rss',
    url: 'https://developer.apple.com/news/rss/news.rss',
  },
  {
    name: 'iOS Dev Weekly',
    category: 'iOS Dev Weekly',
    type: 'rss',
    url: 'https://iosdevweekly.com/issues.rss',
  },
  {
    name: 'Swift.org',
    category: 'Swift.org',
    type: 'rss',
    url: 'https://www.swift.org/atom.xml',
  },
  {
    name: 'Android Developers',
    category: 'Android Developers',
    type: 'rss',
    url: 'http://feeds.feedburner.com/blogspot/hsDu',
  },
  {
    name: 'Android Weekly',
    category: 'Android Weekly',
    type: 'rss',
    url: 'https://androidweekly.net/rss.xml',
  },
  {
    name: 'Kotlin Blog',
    category: 'Kotlin Blog',
    type: 'rss',
    url: 'https://blog.jetbrains.com/kotlin/feed/',
  },
  {
    name: 'XDA Developers',
    category: 'XDA Developers',
    type: 'rss',
    url: 'https://www.xda-developers.com/feed/',
  },
  {
    name: 'React Blog',
    category: 'React Blog',
    type: 'rss',
    url: 'https://react.dev/feed.xml',
  },
  {
    name: 'Vercel Blog',
    category: 'Vercel Blog',
    type: 'rss',
    url: 'https://vercel.com/atom',
  },
];
