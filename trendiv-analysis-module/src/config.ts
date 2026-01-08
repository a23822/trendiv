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

  // grok api
  grok: {
    apiKey: process.env.GROK_API_KEY,
    defaultModel: process.env.GROK_MODEL || 'grok-4-1-fast-reasoning',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    maxRetries: 3,
    initialRetryDelay: 2000,
    timeout: 30000,
    maxContentLength: 20000,
  },

  // Browser/Playwright
  browser: {
    timeout: 30000,
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
