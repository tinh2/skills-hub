export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  githubUrl: string;
  createdAt: string;
  skillCount: number;
  totalInstalls: number;
}

export interface PrivateUser extends PublicUser {
  email: string | null;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string; // Only returned once at creation
}
