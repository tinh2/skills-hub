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

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

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
  callback: (code: string) =>
    apiFetch<AuthTokens & { user: PublicUser }>("/api/v1/auth/github/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
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
  vote: (reviewId: string, helpful: boolean) =>
    apiFetch(`/api/v1/reviews/${reviewId}/vote`, {
      method: "POST",
      body: JSON.stringify({ helpful }),
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

// Install
export const installs = {
  record: (slug: string, platform = "CLAUDE_CODE") =>
    apiFetch(`/api/v1/skills/${slug}/install`, {
      method: "POST",
      body: JSON.stringify({ platform }),
    }),
};
