export interface ReviewSummary {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  usedFor: string | null;
  author: { username: string; avatarUrl: string | null };
  helpfulCount: number;
  notHelpfulCount: number;
  userVote: boolean | null; // null = not voted, true = helpful, false = not helpful
  response: ReviewResponseData | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewResponseData {
  body: string;
  createdAt: string;
}

export interface ReviewStats {
  avgRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
