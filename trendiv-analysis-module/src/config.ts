/**
 * Analysis Module Configuration
 */

export const CONFIG = {
  // Gemini API
  gemini: {
    defaultModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    maxRetries: 3,
    initialRetryDelay: 2000,
    maxContentLength: 25000,
  },

  // Browser/Playwright
  browser: {
    timeout: 15000,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },

  // Content fetching
  content: {
    maxLength: 20000,
    minLength: 50,
    delayBetweenRequests: 2000,
  },

  // YouTube
  youtube: {
    maxRetries: 2,
    retryDelay: 1000,
  },
} as const;
