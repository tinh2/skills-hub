import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { ReviewSection } from "./review-section";
import type { ReviewSummary } from "@skills-hub-ai/shared";

vi.mock("@/lib/api", () => ({
  reviews: { create: vi.fn() },
}));

vi.mock("./review-card", () => ({
  ReviewCard: ({ review }: { review: ReviewSummary }) => (
    <div data-testid={`review-${review.id}`}>{review.title}</div>
  ),
}));

const mockReview: ReviewSummary = {
  id: "r1",
  rating: 5,
  title: "Great skill!",
  body: "Works perfectly",
  usedFor: null,
  author: { username: "reviewer1", avatarUrl: null },
  helpfulCount: 3,
  notHelpfulCount: 0,
  userVote: null,
  response: null,
  createdAt: "2026-01-10T00:00:00Z",
  updatedAt: "2026-01-10T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReviewSection", () => {
  it("renders review count in heading", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={5}
        reviewList={[]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
      />,
    );
    expect(screen.getByText("Reviews (5)")).toBeInTheDocument();
  });

  it("renders empty state when no reviews", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={0}
        reviewList={[]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
      />,
    );
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
  });

  it("renders review cards", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={1}
        reviewList={[mockReview]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
      />,
    );
    expect(screen.getByTestId("review-r1")).toBeInTheDocument();
    expect(screen.getByText("Great skill!")).toBeInTheDocument();
  });

  it("shows Write a Review button for authenticated users", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={0}
        reviewList={[]}
        authUsername="other-user"
        skillAuthorUsername="tho"
        isAuthenticated={true}
      />,
    );
    expect(screen.getByText("Write a Review")).toBeInTheDocument();
  });

  it("hides Write a Review button when user already reviewed", () => {
    const userReview = { ...mockReview, author: { username: "tho", avatarUrl: null } };
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={1}
        reviewList={[userReview]}
        authUsername="tho"
        skillAuthorUsername="skill-author"
        isAuthenticated={true}
      />,
    );
    expect(screen.queryByText("Write a Review")).not.toBeInTheDocument();
  });

  it("hides Write a Review button for unauthenticated users", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={0}
        reviewList={[]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
      />,
    );
    expect(screen.queryByText("Write a Review")).not.toBeInTheDocument();
  });

  it("renders Load More button when hasMoreReviews", () => {
    const onLoadMore = vi.fn();
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={1}
        reviewList={[mockReview]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
        hasMoreReviews={true}
        onLoadMoreReviews={onLoadMore}
      />,
    );
    expect(screen.getByText("Load More Reviews")).toBeInTheDocument();
  });

  it("does not render Load More button when no more reviews", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={1}
        reviewList={[mockReview]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
        hasMoreReviews={false}
      />,
    );
    expect(screen.queryByText("Load More Reviews")).not.toBeInTheDocument();
  });

  it("has accessible section landmark", () => {
    renderWithProviders(
      <ReviewSection
        slug="test-skill"
        reviewCount={0}
        reviewList={[]}
        authUsername={undefined}
        skillAuthorUsername="tho"
        isAuthenticated={false}
      />,
    );
    expect(screen.getByRole("region", { name: /Reviews/ })).toBeInTheDocument();
  });
});
