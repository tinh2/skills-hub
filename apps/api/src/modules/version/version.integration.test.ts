import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as versionService from "./version.service.js";

setupIntegrationTest();

describe("version service (integration)", () => {
  describe("createVersion", () => {
    it("creates a version and sets isLatest=true", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      const result = await versionService.createVersion(user.id, skill.slug, {
        version: "2.0.0",
        instructions: "Updated instructions for v2",
        changelog: "Major update",
      });

      expect(result.version).toBe("2.0.0");
      expect(result.changelog).toBe("Major update");
      expect(result.qualityScore).toBeTypeOf("number");

      const dbVersion = await testPrisma.skillVersion.findUnique({
        where: { skillId_version: { skillId: skill.id, version: "2.0.0" } },
      });
      expect(dbVersion).toBeTruthy();
      expect(dbVersion!.isLatest).toBe(true);
    });

    it("flips previous isLatest to false when new version created", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      // createTestSkill creates v1.0.0 with isLatest=true
      const v1 = await testPrisma.skillVersion.findFirst({
        where: { skillId: skill.id, version: "1.0.0" },
      });
      expect(v1!.isLatest).toBe(true);

      await versionService.createVersion(user.id, skill.slug, {
        version: "2.0.0",
        instructions: "v2 instructions",
      });

      const v1After = await testPrisma.skillVersion.findFirst({
        where: { skillId: skill.id, version: "1.0.0" },
      });
      expect(v1After!.isLatest).toBe(false);

      const v2 = await testPrisma.skillVersion.findFirst({
        where: { skillId: skill.id, version: "2.0.0" },
      });
      expect(v2!.isLatest).toBe(true);
    });

    it("rejects duplicate version string for same skill", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      // v1.0.0 already exists from createTestSkill
      await expect(
        versionService.createVersion(user.id, skill.slug, {
          version: "1.0.0",
          instructions: "duplicate",
        }),
      ).rejects.toThrow("already exists");
    });

    it("rejects version lower than current latest", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      // Create v2.0.0
      await versionService.createVersion(user.id, skill.slug, {
        version: "2.0.0",
        instructions: "v2",
      });

      // Try to create v1.5.0 — should fail
      await expect(
        versionService.createVersion(user.id, skill.slug, {
          version: "1.5.0",
          instructions: "lower version",
        }),
      ).rejects.toThrow("must be higher");
    });

    it("updates skill qualityScore when new version created", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build", { qualityScore: 50 });

      await versionService.createVersion(user.id, skill.slug, {
        version: "2.0.0",
        instructions: "A comprehensive set of instructions that should affect the quality score",
      });

      const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
      expect(dbSkill.qualityScore).toBeTypeOf("number");
    });

    it("rejects non-author from creating versions", async () => {
      const author = await createTestUser();
      const other = await createTestUser();
      const skill = await createTestSkill(author.id, "build");

      await expect(
        versionService.createVersion(other.id, skill.slug, {
          version: "2.0.0",
          instructions: "not my skill",
        }),
      ).rejects.toThrow("own skills");
    });
  });

  describe("listVersions", () => {
    it("returns all versions sorted by createdAt DESC", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      await versionService.createVersion(user.id, skill.slug, {
        version: "2.0.0",
        instructions: "v2 instructions",
      });
      await versionService.createVersion(user.id, skill.slug, {
        version: "3.0.0",
        instructions: "v3 instructions",
        changelog: "Added more features",
      });

      const versions = await versionService.listVersions(skill.slug);
      expect(versions).toHaveLength(3); // 1.0.0 + 2.0.0 + 3.0.0
      expect(versions[0].version).toBe("3.0.0");
      expect(versions[1].version).toBe("2.0.0");
      expect(versions[2].version).toBe("1.0.0");
    });

    it("returns empty array for skill with no versions", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      // Delete the auto-created version
      await testPrisma.skillVersion.deleteMany({ where: { skillId: skill.id } });

      const versions = await versionService.listVersions(skill.slug);
      expect(versions).toEqual([]);
    });

    it("throws for non-existent skill", async () => {
      await expect(versionService.listVersions("no-such-skill")).rejects.toThrow("not found");
    });
  });

  describe("getVersion", () => {
    it("returns specific version by version string", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      const result = await versionService.getVersion(skill.slug, "1.0.0");
      expect(result.version).toBe("1.0.0");
      expect(result.instructions).toContain("Instructions for");
      expect(result.createdAt).toBeTruthy();
    });

    it("throws NotFoundError for non-existent version", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      await expect(
        versionService.getVersion(skill.slug, "9.9.9"),
      ).rejects.toThrow("not found");
    });
  });

  describe("getVersionDiff", () => {
    it("produces a diff between two versions", async () => {
      const user = await createTestUser();
      const skill = await createTestSkill(user.id, "build");

      await versionService.createVersion(user.id, skill.slug, {
        version: "2.0.0",
        instructions: "Line 1\nModified Line 2\nLine 3\nNew Line 4",
      });

      // v1.0.0 has "Instructions for Test Skill N"
      const result = await versionService.getVersionDiff(skill.slug, "1.0.0", "2.0.0");
      expect(result.fromVersion).toBe("1.0.0");
      expect(result.toVersion).toBe("2.0.0");
      expect(result.diff).toBeTruthy();
    });
  });

  describe("cross-skill version independence", () => {
    it("isLatest flags are independent per skill", async () => {
      const user = await createTestUser();
      const skill1 = await createTestSkill(user.id, "build");
      const skill2 = await createTestSkill(user.id, "test");

      // Create v2.0.0 for skill1
      await versionService.createVersion(user.id, skill1.slug, {
        version: "2.0.0",
        instructions: "skill1 v2",
      });

      // skill1: v1.0.0 isLatest=false, v2.0.0 isLatest=true
      const s1v1 = await testPrisma.skillVersion.findFirst({
        where: { skillId: skill1.id, version: "1.0.0" },
      });
      const s1v2 = await testPrisma.skillVersion.findFirst({
        where: { skillId: skill1.id, version: "2.0.0" },
      });
      expect(s1v1!.isLatest).toBe(false);
      expect(s1v2!.isLatest).toBe(true);

      // skill2: v1.0.0 should still be isLatest=true (unaffected by skill1)
      const s2v1 = await testPrisma.skillVersion.findFirst({
        where: { skillId: skill2.id, version: "1.0.0" },
      });
      expect(s2v1!.isLatest).toBe(true);
    });
  });
});
