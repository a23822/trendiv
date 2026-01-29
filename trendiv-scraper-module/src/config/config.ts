/**
 * Analysis Module Configuration
 */

export const CONFIG = {
  // Browser/Playwright
  browser: {
    timeout: 60000,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    bypassCSP: true,
  },
} as const;

// 🎲 랜덤 생성을 위한 데이터 풀 (Pool)
const POOLS = {
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
  ],
};

/**
 * 🛠️ Playwright Context 생성용 옵션을 랜덤하게 조합하여 반환
 */
export const getRandomContextOptions = () => {
  const randomUA =
    POOLS.userAgents[Math.floor(Math.random() * POOLS.userAgents.length)];
  const randomViewport =
    POOLS.viewports[Math.floor(Math.random() * POOLS.viewports.length)];

  return {
    userAgent: randomUA,
    viewport: randomViewport,
    locale: CONFIG.browser.locale,
    timezoneId: CONFIG.browser.timezoneId,
    bypassCSP: CONFIG.browser.bypassCSP,
  };
};
