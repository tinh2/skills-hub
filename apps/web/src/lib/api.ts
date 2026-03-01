import type {
  PaginatedResponse,
  SkillSummary,
  SkillDetail,
  PublicUser,
  PrivateUser,
  ReviewSummary,
  ReviewStats,
  VersionSummary,
  VersionDetail,
  ApiKeyResponse,
  ApiKeyCreatedResponse,
  AuthTokens,
  ApiError,
  SkillQuery,
} from "@skills-hub/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Deduplicates concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthTokens;
    accessToken = data.accessToken;
    return data.accessToken;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { _retried?: boolean } = {},
): Promise<T> {
  const { _retried, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (res.status === 401 && accessToken && !_retried) {
    // Attempt token refresh, deduplicating concurrent calls
    if (!refreshPromise) {
      refreshPromise = attemptRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    // Refresh failed — clear token so auth store can react
    accessToken = null;
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error?.message || `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Auth
export const auth = {
  githubLogin: () => {
    window.location.href = `${API_BASE}/api/v1/auth/github`;
  },
  callback: (code: string, state: string) =>
    apiFetch<AuthTokens & { user: PublicUser }>("/api/v1/auth/github/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    }),
  logout: () =>
    apiFetch("/api/v1/auth/session", { method: "DELETE" }),
};

// Users
export const users = {
  getProfile: (username: string) =>
    apiFetch<PublicUser>(`/api/v1/users/${username}`),
  getMe: () =>
    apiFetch<PrivateUser>("/api/v1/users/me"),
  updateMe: (data: { displayName?: string; bio?: string }) =>
    apiFetch<PrivateUser>("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createApiKey: (data: { name: string; expiresInDays?: number }) =>
    apiFetch<ApiKeyCreatedResponse>("/api/v1/users/me/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listApiKeys: () =>
    apiFetch<ApiKeyResponse[]>("/api/v1/users/me/api-keys"),
  deleteApiKey: (id: string) =>
    apiFetch("/api/v1/users/me/api-keys/" + id, { method: "DELETE" }),
};

// Skills
export const skills = {
  list: (query?: Partial<SkillQuery>) => {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
    }
    return apiFetch<PaginatedResponse<SkillSummary>>(
      `/api/v1/skills?${params}`,
    );
  },
  get: (slug: string) =>
    apiFetch<SkillDetail>(`/api/v1/skills/${slug}`),
  create: (data: any) =>
    apiFetch<SkillSummary>("/api/v1/skills", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: any) =>
    apiFetch<SkillSummary>(`/api/v1/skills/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  publish: (slug: string) =>
    apiFetch<SkillSummary>(`/api/v1/skills/${slug}/publish`, { method: "POST" }),
  archive: (slug: string) =>
    apiFetch(`/api/v1/skills/${slug}`, { method: "DELETE" }),
  setComposition: (slug: string, data: { description?: string; children: { skillSlug: string; sortOrder: number; isParallel: boolean }[] }) =>
    apiFetch<SkillDetail>(`/api/v1/skills/${slug}/composition`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  removeComposition: (slug: string) =>
    apiFetch(`/api/v1/skills/${slug}/composition`, { method: "DELETE" }),
};

// Versions
export const versions = {
  list: (slug: string) =>
    apiFetch<VersionSummary[]>(`/api/v1/skills/${slug}/versions`),
  get: (slug: string, version: string) =>
    apiFetch<VersionDetail>(`/api/v1/skills/${slug}/versions/${version}`),
  create: (slug: string, data: any) =>
    apiFetch<VersionSummary>(`/api/v1/skills/${slug}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Reviews
export const reviews = {
  list: (slug: string) =>
    apiFetch<ReviewSummary[]>(`/api/v1/skills/${slug}/reviews`),
  stats: (slug: string) =>
    apiFetch<ReviewStats>(`/api/v1/skills/${slug}/reviews/stats`),
  create: (slug: string, data: any) =>
    apiFetch<ReviewSummary>(`/api/v1/skills/${slug}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (reviewId: string, data: { title?: string; body?: string; rating?: number }) =>
    apiFetch(`/api/v1/skills/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (reviewId: string) =>
    apiFetch(`/api/v1/skills/reviews/${reviewId}`, { method: "DELETE" }),
  vote: (reviewId: string, helpful: boolean) =>
    apiFetch(`/api/v1/skills/reviews/${reviewId}/vote`, {
      method: "POST",
      body: JSON.stringify({ helpful }),
    }),
  respond: (reviewId: string, body: string) =>
    apiFetch(`/api/v1/skills/reviews/${reviewId}/response`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};

// Search
export const search = {
  query: (params: Partial<SkillQuery>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return apiFetch<PaginatedResponse<SkillSummary>>(`/api/v1/search?${qs}`);
  },
  suggestions: (q: string) =>
    apiFetch<{ skills: { name: string; slug: string }[]; tags: string[] }>(
      `/api/v1/search/suggestions?q=${encodeURIComponent(q)}`,
    ),
};

// Categories
export const categories = {
  featured: () =>
    apiFetch<Record<string, SkillSummary | null>>("/api/v1/categories/featured"),
};

// Likes
export const likes = {
  toggle: (slug: string) =>
    apiFetch<{ liked: boolean; likeCount: number }>(`/api/v1/skills/${slug}/like`, { method: "POST" }),
};

// Media
export const media = {
  add: (slug: string, data: { type: string; url: string; caption?: string; sortOrder?: number }) =>
    apiFetch(`/api/v1/skills/${slug}/media`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (slug: string, id: string) =>
    apiFetch(`/api/v1/skills/${slug}/media/${id}`, { method: "DELETE" }),
  reorder: (slug: string, mediaIds: string[]) =>
    apiFetch(`/api/v1/skills/${slug}/media/reorder`, {
      method: "PUT",
      body: JSON.stringify({ mediaIds }),
    }),
};

// Install
export const installs = {
  record: (slug: string, platform = "CLAUDE_CODE") =>
    apiFetch(`/api/v1/skills/${slug}/install`, {
      method: "POST",
      body: JSON.stringify({ platform }),
    }),
};
