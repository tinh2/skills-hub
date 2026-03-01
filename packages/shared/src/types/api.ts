export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface AuthCallbackResponse extends AuthTokens {
  user: import("./user.js").PublicUser;
}
