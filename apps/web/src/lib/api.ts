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
  CreateSkillInput,
  UpdateSkillInput,
  CreateVersionInput,
  CreateReviewInput,
  OrgDetail,
  OrgMember,
  OrgInviteData,
  OrgSkillTemplateSummary,
  OrgAnalytics,
  UserOrgMembership,
  AgentSummary,
  AgentDetail,
  AgentExecutionSummary,
  SandboxRunSummary,
  TestCaseData,
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
  create: (data: Omit<CreateSkillInput, "platforms" | "visibility"> & { platforms: string[]; visibility: string }) =>
    apiFetch<SkillSummary>("/api/v1/skills", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<Omit<UpdateSkillInput, "platforms" | "visibility"> & { platforms: string[]; visibility: string }>) =>
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
  create: (slug: string, data: CreateVersionInput) =>
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
  create: (slug: string, data: CreateReviewInput) =>
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

// Organizations
export const orgs = {
  list: () =>
    apiFetch<UserOrgMembership[]>("/api/v1/orgs"),
  get: (slug: string) =>
    apiFetch<OrgDetail>(`/api/v1/orgs/${slug}`),
  create: (data: { name: string; slug: string; description?: string }) =>
    apiFetch<OrgDetail>("/api/v1/orgs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: { name?: string; description?: string; avatarUrl?: string | null }) =>
    apiFetch<OrgDetail>(`/api/v1/orgs/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (slug: string) =>
    apiFetch(`/api/v1/orgs/${slug}`, { method: "DELETE" }),
  members: (slug: string, query?: { q?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.q) params.set("q", query.q);
    if (query?.cursor) params.set("cursor", query.cursor);
    if (query?.limit) params.set("limit", String(query.limit));
    return apiFetch<PaginatedResponse<OrgMember>>(`/api/v1/orgs/${slug}/members?${params}`);
  },
  updateMemberRole: (slug: string, userId: string, role: string) =>
    apiFetch<OrgMember>(`/api/v1/orgs/${slug}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  removeMember: (slug: string, userId: string) =>
    apiFetch(`/api/v1/orgs/${slug}/members/${userId}`, { method: "DELETE" }),
  invites: (slug: string) =>
    apiFetch<OrgInviteData[]>(`/api/v1/orgs/${slug}/invites`),
  invite: (slug: string, data: { username: string; role?: string }) =>
    apiFetch<OrgInviteData>(`/api/v1/orgs/${slug}/invites`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revokeInvite: (slug: string, inviteId: string) =>
    apiFetch(`/api/v1/orgs/${slug}/invites/${inviteId}`, { method: "DELETE" }),
  skills: (slug: string, query?: { q?: string; category?: string; sort?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
    }
    return apiFetch<PaginatedResponse<SkillSummary>>(`/api/v1/orgs/${slug}/skills?${params}`);
  },
  templates: (slug: string) =>
    apiFetch<OrgSkillTemplateSummary[]>(`/api/v1/orgs/${slug}/templates`),
  createTemplate: (slug: string, data: { name: string; description?: string; categorySlug?: string; platforms?: string[]; instructions?: string }) =>
    apiFetch<OrgSkillTemplateSummary>(`/api/v1/orgs/${slug}/templates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getTemplate: (slug: string, templateId: string) =>
    apiFetch<OrgSkillTemplateSummary>(`/api/v1/orgs/${slug}/templates/${templateId}`),
  updateTemplate: (slug: string, templateId: string, data: { name?: string; description?: string; categorySlug?: string; platforms?: string[]; instructions?: string }) =>
    apiFetch<OrgSkillTemplateSummary>(`/api/v1/orgs/${slug}/templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTemplate: (slug: string, templateId: string) =>
    apiFetch(`/api/v1/orgs/${slug}/templates/${templateId}`, { method: "DELETE" }),
  createSkillFromTemplate: (slug: string, templateId: string, data?: { name?: string; description?: string; categorySlug?: string; platforms?: string[]; instructions?: string; version?: string }) =>
    apiFetch<SkillSummary>(`/api/v1/orgs/${slug}/templates/${templateId}/create-skill`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
  analytics: (slug: string) =>
    apiFetch<OrgAnalytics>(`/api/v1/orgs/${slug}/analytics`),
  connectGithub: (slug: string, data: { githubOrgSlug: string; defaultRole?: string }) =>
    apiFetch(`/api/v1/orgs/${slug}/github`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  disconnectGithub: (slug: string) =>
    apiFetch(`/api/v1/orgs/${slug}/github`, { method: "DELETE" }),
  syncGithub: (slug: string) =>
    apiFetch(`/api/v1/orgs/${slug}/github/sync`, { method: "POST" }),
};

// Invites
export const invites = {
  accept: (token: string) =>
    apiFetch(`/api/v1/invites/${token}/accept`, { method: "POST" }),
  decline: (token: string) =>
    apiFetch(`/api/v1/invites/${token}/decline`, { method: "POST" }),
};

// Install
export const installs = {
  record: (slug: string, platform = "CLAUDE_CODE") =>
    apiFetch(`/api/v1/skills/${slug}/install`, {
      method: "POST",
      body: JSON.stringify({ platform }),
    }),
};

// Agents
export const agents = {
  create: (data: { name: string; skillSlug: string; triggerType?: string; triggerConfig?: Record<string, unknown>; channelType?: string; channelConfig?: Record<string, unknown>; modelProvider?: string; modelId?: string }) =>
    apiFetch<AgentSummary>("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  list: (query?: { status?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
    }
    return apiFetch<PaginatedResponse<AgentSummary>>(`/api/v1/agents?${params}`);
  },
  get: (agentId: string) =>
    apiFetch<AgentDetail>(`/api/v1/agents/${agentId}`),
  update: (agentId: string, data: { name?: string; triggerType?: string; triggerConfig?: Record<string, unknown>; channelType?: string | null; channelConfig?: Record<string, unknown>; modelProvider?: string; modelId?: string }) =>
    apiFetch<AgentDetail>(`/api/v1/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  pause: (agentId: string) =>
    apiFetch<AgentSummary>(`/api/v1/agents/${agentId}/pause`, { method: "POST" }),
  resume: (agentId: string) =>
    apiFetch<AgentSummary>(`/api/v1/agents/${agentId}/resume`, { method: "POST" }),
  execute: (agentId: string, input?: string) =>
    apiFetch<AgentExecutionSummary>(`/api/v1/agents/${agentId}/execute`, {
      method: "POST",
      body: JSON.stringify({ input }),
    }),
  remove: (agentId: string) =>
    apiFetch(`/api/v1/agents/${agentId}`, { method: "DELETE" }),
};

// Sandbox
export const sandbox = {
  run: (slug: string, data: { input: string; testCaseId?: string }) =>
    apiFetch<SandboxRunSummary>(`/api/v1/skills/${slug}/sandbox`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listRuns: (slug: string, query?: { cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.cursor) params.set("cursor", query.cursor);
    if (query?.limit) params.set("limit", String(query.limit));
    return apiFetch<PaginatedResponse<SandboxRunSummary>>(`/api/v1/skills/${slug}/sandbox?${params}`);
  },
  listTestCases: (slug: string) =>
    apiFetch<TestCaseData[]>(`/api/v1/skills/${slug}/test-cases`),
  createTestCase: (slug: string, data: { label: string; input: string; expectedOutput?: string; sortOrder: number }) =>
    apiFetch<TestCaseData>(`/api/v1/skills/${slug}/test-cases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTestCase: (slug: string, testCaseId: string, data: { label?: string; input?: string; expectedOutput?: string; sortOrder?: number }) =>
    apiFetch<TestCaseData>(`/api/v1/skills/${slug}/test-cases/${testCaseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTestCase: (slug: string, testCaseId: string) =>
    apiFetch(`/api/v1/skills/${slug}/test-cases/${testCaseId}`, { method: "DELETE" }),
};
