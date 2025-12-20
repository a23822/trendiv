/**
 * Custom Error Classes
 */

export class ContentFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ContentFetchError';
  }
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly itemTitle: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public readonly attempt: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('503') ||
      message.includes('429')
    );
  }
  return false;
}
