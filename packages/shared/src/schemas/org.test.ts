import { describe, it, expect } from "vitest";
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  orgQuerySchema,
  orgSkillQuerySchema,
} from "./org.js";

describe("createOrgSchema", () => {
  it("accepts valid input", () => {
    const result = createOrgSchema.parse({
      name: "My Team",
      slug: "my-team",
      description: "A great team",
    });
    expect(result.name).toBe("My Team");
    expect(result.slug).toBe("my-team");
  });

  it("rejects slug with uppercase", () => {
    expect(() =>
      createOrgSchema.parse({ name: "Team", slug: "My-Team" }),
    ).toThrow();
  });

  it("rejects slug with special characters", () => {
    expect(() =>
      createOrgSchema.parse({ name: "Team", slug: "my_team!" }),
    ).toThrow();
  });

  it("rejects slug starting with hyphen", () => {
    expect(() =>
      createOrgSchema.parse({ name: "Team", slug: "-my-team" }),
    ).toThrow();
  });

  it("rejects name shorter than 2 chars", () => {
    expect(() =>
      createOrgSchema.parse({ name: "A", slug: "ab" }),
    ).toThrow();
  });

  it("rejects description over 500 chars", () => {
    expect(() =>
      createOrgSchema.parse({ name: "Team", slug: "team", description: "x".repeat(501) }),
    ).toThrow();
  });
});

describe("inviteMemberSchema", () => {
  it("accepts valid username invite", () => {
    const result = inviteMemberSchema.parse({ username: "testuser" });
    expect(result.username).toBe("testuser");
    expect(result.role).toBe("MEMBER");
  });

  it("requires username", () => {
    expect(() => inviteMemberSchema.parse({})).toThrow();
  });

  it("allows custom role", () => {
    const result = inviteMemberSchema.parse({ username: "user", role: "PUBLISHER" });
    expect(result.role).toBe("PUBLISHER");
  });

  it("rejects invalid role", () => {
    expect(() =>
      inviteMemberSchema.parse({ username: "user", role: "SUPERADMIN" }),
    ).toThrow();
  });
});

describe("updateMemberRoleSchema", () => {
  it("accepts valid role", () => {
    const result = updateMemberRoleSchema.parse({ role: "ADMIN" });
    expect(result.role).toBe("ADMIN");
  });

  it("rejects invalid role", () => {
    expect(() => updateMemberRoleSchema.parse({ role: "OWNER" })).toThrow();
  });
});

describe("orgQuerySchema", () => {
  it("applies defaults for empty input", () => {
    const result = orgQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("coerces string limit to number", () => {
    const result = orgQuerySchema.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });
});

describe("orgSkillQuerySchema", () => {
  it("applies defaults", () => {
    const result = orgSkillQuerySchema.parse({});
    expect(result.sort).toBe("newest");
    expect(result.limit).toBe(20);
  });

  it("rejects invalid sort", () => {
    expect(() => orgSkillQuerySchema.parse({ sort: "invalid" })).toThrow();
  });
});
