import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as installService from "./install.service.js";

setupIntegrationTest();

describe("install service (integration)", () => {
  it("records an install and increments counter", async () => {
    const author = await createTestUser();
    const installer = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await installService.recordInstall(skill.slug, { platform: "CLAUDE_CODE" }, installer.id);

    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.installCount).toBe(1);

    const install = await testPrisma.install.findFirst({ where: { skillId: skill.id } });
    expect(install).toBeTruthy();
    expect(install!.userId).toBe(installer.id);
    expect(install!.version).toBe("1.0.0");
  });

  it("deduplicates authenticated user installs", async () => {
    const author = await createTestUser();
    const installer = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await installService.recordInstall(skill.slug, { platform: "CLAUDE_CODE" }, installer.id);
    await installService.recordInstall(skill.slug, { platform: "CLAUDE_CODE" }, installer.id);

    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.installCount).toBe(1); // Not double-counted
  });

  it("different users each count as separate installs", async () => {
    const author = await createTestUser();
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await installService.recordInstall(skill.slug, { platform: "CLAUDE_CODE" }, u1.id);
    await installService.recordInstall(skill.slug, { platform: "CLAUDE_CODE" }, u2.id);

    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.installCount).toBe(2);
  });

  it("getInstallCount returns denormalized count", async () => {
    const author = await createTestUser();
    const skill = await createTestSkill(author.id, "build", { installCount: 42 });

    const count = await installService.getInstallCount(skill.slug);
    expect(count).toBe(42);
  });

  it("throws NotFoundError for non-existent skill", async () => {
    await expect(
      installService.recordInstall("no-such-skill", { platform: "CLAUDE_CODE" }, null),
    ).rejects.toThrow("not found");
  });
});
