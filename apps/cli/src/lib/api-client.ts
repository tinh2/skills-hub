import { getConfig, getAuthHeader } from "./config.js";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const config = getConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const msg = body?.error?.message || `API error: ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}
