import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { mockSkillSummary } from "@/test/fixtures";
import { SkillCard } from "./skill-card";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock("@/lib/api", () => ({
  likes: { toggle: vi.fn() },
}));

import { useAuthStore } from "@/lib/auth-store";
const mockUseAuthStore = vi.mocked(useAuthStore);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuthStore.mockReturnValue({ isAuthenticated: false } as any);
});

describe("SkillCard", () => {
  it("renders skill name and description", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("Test Skill")).toBeInTheDocument();
    expect(screen.getByText("A skill for testing things")).toBeInTheDocument();
  });

  it("renders author username", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("by tho")).toBeInTheDocument();
  });

  it("renders category and version", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
  });

  it("renders quality score with correct color for high scores", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    const scoreEl = screen.getByText("85");
    expect(scoreEl).toBeInTheDocument();
    expect(scoreEl).toHaveAttribute("aria-label", "Quality score: 85 out of 100");
  });

  it("does not render quality score when null", () => {
    renderWithProviders(
      <SkillCard skill={{ ...mockSkillSummary, qualityScore: null }} />,
    );
    expect(screen.queryByLabelText(/Quality score/)).not.toBeInTheDocument();
  });

  it("renders install count", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("42 installs")).toBeInTheDocument();
  });

  it("renders like count", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("testing")).toBeInTheDocument();
    expect(screen.getByText("ci")).toBeInTheDocument();
  });

  it("limits displayed tags to 4", () => {
    const manyTags = { ...mockSkillSummary, tags: ["a", "b", "c", "d", "e"] };
    renderWithProviders(<SkillCard skill={manyTags} />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("d")).toBeInTheDocument();
    expect(screen.queryByText("e")).not.toBeInTheDocument();
  });

  it("renders featured badge when isFeatured is true", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} isFeatured />);
    expect(screen.getByText("Top Liked")).toBeInTheDocument();
  });

  it("does not render featured badge by default", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.queryByText("Top Liked")).not.toBeInTheDocument();
  });

  it("renders composition badge for compositions", () => {
    renderWithProviders(
      <SkillCard skill={{ ...mockSkillSummary, isComposition: true }} />,
    );
    expect(screen.getByText("Composition")).toBeInTheDocument();
  });

  it("renders visibility badge for non-public skills", () => {
    renderWithProviders(
      <SkillCard skill={{ ...mockSkillSummary, visibility: "PRIVATE" }} />,
    );
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("links to skill detail page", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    const link = screen.getByRole("link", { name: "Test Skill" });
    expect(link).toHaveAttribute("href", "/skills/test-skill");
  });

  it("renders like button with accessible label when authenticated", () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true } as any);
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByLabelText("Like Test Skill")).toBeInTheDocument();
  });

  it("renders unlike label when already liked", () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true } as any);
    renderWithProviders(
      <SkillCard skill={{ ...mockSkillSummary, userLiked: true }} />,
    );
    expect(screen.getByLabelText("Unlike Test Skill")).toBeInTheDocument();
  });

  it("renders rating when present", () => {
    renderWithProviders(<SkillCard skill={mockSkillSummary} />);
    expect(screen.getByText("4.5 stars")).toBeInTheDocument();
  });

  it("does not render rating when null", () => {
    renderWithProviders(
      <SkillCard skill={{ ...mockSkillSummary, avgRating: null }} />,
    );
    expect(screen.queryByText(/stars/)).not.toBeInTheDocument();
  });
});
