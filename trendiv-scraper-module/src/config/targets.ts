import { ScraperConfig } from '../scrapers/interface';

export const TARGETS: ScraperConfig[] = [
  // =========================
  // 1. Global Web Trends (Hacker News & MDN)
  // =========================
  {
    name: 'Hacker News (Web)', // 해커뉴스에서 'web' 키워드 포함된 인기글만 필터링 (hnrss 사용)
    type: 'rss',
    url: 'https://hnrss.org/newest?q=web&points=100', // 100점 이상 인기글만
  },
  {
    name: 'MDN Web Docs Blog', // Mozilla 공식 웹 표준 문서 블로그
    type: 'rss',
    url: 'https://developer.mozilla.org/en-US/blog/rss.xml',
  },
  {
    name: 'CSS-Tricks',
    type: 'rss',
    url: 'https://css-tricks.com/feed/',
  },
  {
    name: 'Smashing Magazine',
    type: 'rss',
    url: 'https://www.smashingmagazine.com/feed/',
  },

  // =========================
  // 2. iOS & Swift (애플 생태계)
  // =========================
  {
    name: 'Apple Developer News', // 공식 뉴스 (AR/VR, iOS 19 등)
    type: 'rss',
    url: 'https://developer.apple.com/news/rss/news.rss',
  },
  {
    name: 'iOS Dev Weekly', // 주간 요약 뉴스레터 RSS
    type: 'rss',
    url: 'https://iosdevweekly.com/issues.rss',
  },
  {
    name: 'Swift.org', // 공식 블로그
    type: 'rss',
    url: 'https://www.swift.org/atom.xml',
  },
  {
    name: 'StackOverflow (iOS/Swift)', // iOS 또는 Swift 태그가 달린 인기 질문
    type: 'rss',
    url: 'https://stackoverflow.com/feeds/tag?tagnames=ios+or+swift&sort=newest',
  },

  // =========================
  // 3. Android & Kotlin
  // =========================
  {
    name: 'Android Developers Blog', // 구글 공식
    type: 'rss',
    url: 'http://feeds.feedburner.com/blogspot/hsDu',
  },
  {
    name: 'Android Weekly', // 안드로이드 주간 뉴스
    type: 'rss',
    url: 'https://androidweekly.net/rss.xml',
  },
  {
    name: 'Kotlin Blog', // 코틀린 공식
    type: 'rss',
    url: 'https://blog.jetbrains.com/kotlin/feed/',
  },
  {
    name: 'Reddit r/androiddev', // 안드로이드 개발자 서브레딧 (주간 Top)
    type: 'rss',
    url: 'https://www.reddit.com/r/androiddev/top/.rss?t=week',
  },
  {
    name: 'XDA Developers', // 모바일 하드웨어/소프트웨어 딥다이브
    type: 'rss',
    url: 'https://www.xda-developers.com/feed/',
  },

  // =========================
  // 4. Official Framework Blogs
  // =========================
  {
    name: 'React Blog',
    type: 'rss',
    url: 'https://react.dev/feed.xml',
  },
  {
    name: 'Vercel Blog',
    type: 'rss',
    url: 'https://vercel.com/atom',
  },
];
