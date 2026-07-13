/**
 * Retry an async operation with exponential backoff.
 * Useful for wrapping Supabase queries that may hit transient network blips.
 */
export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const defaultShouldRetry = (error: unknown) => {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? '';
  // Retry network/timeout issues, not auth/permission errors.
  if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('jwt')) return false;
  return true;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 2, baseDelayMs = 300, maxDelayMs = 2000, shouldRetry = defaultShouldRetry } = opts;
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !shouldRetry(err, attempt)) throw err;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
  throw lastError;
}
