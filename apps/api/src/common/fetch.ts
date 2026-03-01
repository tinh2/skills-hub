/**
 * Fetch wrapper with timeout for external API calls.
 * Prevents indefinite hangs when external services are unresponsive.
 */
const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds

export function fetchWithTimeout(
  url: string | URL,
  options?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}
