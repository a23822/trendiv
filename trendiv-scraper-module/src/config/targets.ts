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
  // 마크업 핵심 (CSS, HTML, 접근성, 웹 디자인)
  {
    name: 'Reddit Web Markup',
    category: 'Reddit',
    type: 'rss',
    url: 'https://www.reddit.com/r/css+html+accessibility+a11y+web_design/top/.rss?t=day',
  },
  // iOS Safari 이슈 참고용
  {
    name: 'Reddit iOS',
    category: 'Reddit',
    type: 'rss',
    url: 'https://www.reddit.com/r/ios/top/.rss?t=week',
  },
  // StackOverflow - 공식 API 사용 (Cloudflare 우회)
  {
    name: 'StackOverflow Web',
    category: 'StackOverflow',
    type: 'stackoverflow',
    url: 'css;html;accessibility;a11y',
  },
  {
    name: 'StackOverflow iOS',
    category: 'StackOverflow',
    type: 'stackoverflow',
    url: 'ios;safari',
  },

  // =================================================
  // 2. YouTube (Grouped by Platform)
  // =================================================
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
  {
    name: 'YouTube Search',
    category: 'YouTube',
    type: 'youtube_search',
    url: 'html | css | a11y | Web accessibility',
  },

  // =================================================
  // 3. Official Blogs (Each Name = Category)
  // =================================================
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
    useProxy: true,
  },
  // ❌ Apple Developer - Cloud Run IP 차단
  // {
  //   name: 'Apple Developer',
  //   category: 'Apple Developer',
  //   type: 'rss',
  //   url: 'https://developer.apple.com/news/rss/news.rss',
  // },
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
  // ✅ React Blog
  {
    name: 'React Blog',
    category: 'React Blog',
    type: 'rss',
    url: 'https://react.dev/rss.xml',
  },
  {
    name: 'Vercel Blog',
    category: 'Vercel Blog',
    type: 'rss',
    url: 'https://vercel.com/atom',
  },
];
