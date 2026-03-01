import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { mockSkillDetail } from "@/test/fixtures";
import { InstallSection } from "./install-section";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/api", () => ({
  installs: { record: vi.fn() },
  skills: { get: vi.fn() },
  versions: { get: vi.fn() },
}));

vi.mock("@/lib/download", () => ({
  buildSkillMd: vi.fn(() => "---\nname: test\n---\ninstructions"),
  triggerFileDownload: vi.fn(),
  triggerBlobDownload: vi.fn(),
}));

vi.mock("fflate", () => ({
  zipSync: vi.fn(() => new Uint8Array([1, 2, 3])),
  strToU8: vi.fn((s: string) => new TextEncoder().encode(s)),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InstallSection", () => {
  it("renders install command with skill slug", () => {
    renderWithProviders(<InstallSection skill={mockSkillDetail} />);
    expect(screen.getByText(`npx @skills-hub-ai/cli install ${mockSkillDetail.slug}`)).toBeInTheDocument();
  });

  it("renders copy button", () => {
    renderWithProviders(<InstallSection skill={mockSkillDetail} />);
    expect(screen.getByLabelText("Copy install command to clipboard")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("renders Download SKILL.md button", () => {
    renderWithProviders(<InstallSection skill={mockSkillDetail} />);
    expect(screen.getByText("Download SKILL.md")).toBeInTheDocument();
  });

  it("does not render Download All button for non-compositions", () => {
    renderWithProviders(<InstallSection skill={mockSkillDetail} />);
    expect(screen.queryByText("Download All (.zip)")).not.toBeInTheDocument();
  });

  it("renders Download All button for compositions", () => {
    const compositionSkill = {
      ...mockSkillDetail,
      composition: {
        description: "A pipeline",
        children: [
          { skill: { slug: "child-1", name: "Child 1", qualityScore: 80 }, sortOrder: 0, isParallel: false },
        ],
      },
    };
    renderWithProviders(<InstallSection skill={compositionSkill} />);
    expect(screen.getByText("Download All (.zip)")).toBeInTheDocument();
  });

  it("renders CLI docs link", () => {
    renderWithProviders(<InstallSection skill={mockSkillDetail} />);
    const link = screen.getByRole("link", { name: /CLI commands/ });
    expect(link).toHaveAttribute("href", "/docs/cli");
  });
});
