// Network utilities - timeout and retry logic for API requests

export interface FetchWithRetryOptions {
  /** Timeout in milliseconds (default: 30000 = 30s) */
  timeout?: number;
  /** Number of retry attempts (default: 2) */
  retries?: number;
  /** Base delay between retries in ms (default: 1000). Uses exponential backoff. */
  retryDelay?: number;
  /** HTTP methods that should be retried (default: GET, HEAD, OPTIONS) */
  retryableMethods?: string[];
  /** HTTP status codes that should trigger a retry (default: 408, 429, 500, 502, 503, 504) */
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  timeout: 30000,
  retries: 2,
  retryDelay: 1000,
  retryableMethods: ['GET', 'HEAD', 'OPTIONS'],
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'NETWORK' | 'RETRY_EXHAUSTED' | 'ABORT',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = DEFAULT_OPTIONS.timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError(
        `Request timed out after ${timeout}ms`,
        'TIMEOUT',
        error
      );
    }
    throw new NetworkError(
      'Network request failed',
      'NETWORK',
      error instanceof Error ? error : undefined
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with timeout and automatic retry with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_OPTIONS.timeout,
    retries = DEFAULT_OPTIONS.retries,
    retryDelay = DEFAULT_OPTIONS.retryDelay,
    retryableMethods = DEFAULT_OPTIONS.retryableMethods,
    retryableStatuses = DEFAULT_OPTIONS.retryableStatuses,
    ...fetchOptions
  } = options;

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const shouldRetryMethod = retryableMethods.includes(method);

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout,
      });

      // Check if we should retry based on status code
      if (
        shouldRetryMethod &&
        retryableStatuses.includes(response.status) &&
        attempt < retries
      ) {
        console.log(
          `[Network] Retry ${attempt + 1}/${retries} for ${url} (status: ${response.status})`
        );
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on timeout or abort for non-idempotent methods
      if (!shouldRetryMethod) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= retries) {
        break;
      }

      console.log(
        `[Network] Retry ${attempt + 1}/${retries} for ${url} (error: ${lastError.message})`
      );
      await sleep(retryDelay * Math.pow(2, attempt));
    }
  }

  throw new NetworkError(
    `Request failed after ${retries + 1} attempts`,
    'RETRY_EXHAUSTED',
    lastError
  );
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a user-friendly error message based on error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    switch (error.code) {
      case 'TIMEOUT':
        return 'Request timed out. Please check your connection and try again.';
      case 'NETWORK':
        return 'Network error. Please check your internet connection.';
      case 'RETRY_EXHAUSTED':
        return 'Service is temporarily unavailable. Please try again later.';
      case 'ABORT':
        return 'Request was cancelled.';
    }
  }

  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) {
      return 'Authentication error. Please try again later.';
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return 'Request failed. Please try again.';
  }

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred.';
  }

  return 'An unexpected error occurred.';
}
