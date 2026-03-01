import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, testPrisma } from "../../test/setup.js";
import * as orgCrud from "./org-crud.service.js";
import * as orgMembers from "./org-members.service.js";
import * as orgInvites from "./org-invites.service.js";
import * as orgTemplates from "./org-templates.service.js";

setupIntegrationTest();

// Helper: create an org and return both the org and its admin user
async function createTestOrg(overrides: { slug?: string; name?: string } = {}) {
  const admin = await createTestUser();
  const org = await orgCrud.createOrg(admin.id, {
    slug: overrides.slug ?? "test-org",
    name: overrides.name ?? "Test Org",
    description: "A test organization",
  });
  return { admin, org };
}

// Helper: add a member to an org via direct DB insert (skips invite flow)
async function addMember(orgId: string, userId: string, role: "MEMBER" | "PUBLISHER" | "ADMIN" = "MEMBER") {
  return testPrisma.orgMembership.create({
    data: { orgId: orgId, userId, role },
  });
}

// ─── CRUD ───────────────────────────────────────────────────────────────

describe("org CRUD (integration)", () => {
  it("creates an org and assigns creator as ADMIN", async () => {
    const { admin, org } = await createTestOrg();

    expect(org.slug).toBe("test-org");
    expect(org.name).toBe("Test Org");
    expect(org.memberCount).toBe(1);
    expect(org.skillCount).toBe(0);
    expect(org.currentUserRole).toBe("ADMIN");

    // Verify DB membership
    const membership = await testPrisma.orgMembership.findFirst({
      where: { userId: admin.id },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("ADMIN");
  });

  it("rejects duplicate org slug", async () => {
    await createTestOrg({ slug: "dupe-slug" });
    const user2 = await createTestUser();

    await expect(
      orgCrud.createOrg(user2.id, { slug: "dupe-slug", name: "Another Org" }),
    ).rejects.toThrow("already taken");
  });

  it("getOrg returns org detail with correct counts", async () => {
    const { admin, org } = await createTestOrg();

    const detail = await orgCrud.getOrg(org.slug, admin.id);
    expect(detail.slug).toBe(org.slug);
    expect(detail.memberCount).toBe(1);
    expect(detail.currentUserRole).toBe("ADMIN");
  });

  it("getOrg returns null role for non-member requester", async () => {
    const { org } = await createTestOrg();
    const outsider = await createTestUser();

    const detail = await orgCrud.getOrg(org.slug, outsider.id);
    expect(detail.currentUserRole).toBeNull();
  });

  it("getOrg throws for non-existent org", async () => {
    await expect(orgCrud.getOrg("no-such-org")).rejects.toThrow("not found");
  });

  it("listUserOrgs returns all orgs a user belongs to", async () => {
    const user = await createTestUser();
    await orgCrud.createOrg(user.id, { slug: "org-a", name: "Org A" });
    await orgCrud.createOrg(user.id, { slug: "org-b", name: "Org B" });

    const orgs = await orgCrud.listUserOrgs(user.id);
    expect(orgs).toHaveLength(2);
    expect(orgs.map((o) => o.org.slug).sort()).toEqual(["org-a", "org-b"]);
  });

  it("updateOrg updates name and description (ADMIN only)", async () => {
    const { admin, org } = await createTestOrg();

    const updated = await orgCrud.updateOrg(admin.id, org.slug, {
      name: "Updated Name",
      description: "Updated desc",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.description).toBe("Updated desc");
  });

  it("updateOrg rejects non-admin", async () => {
    const { org } = await createTestOrg();
    const member = await createTestUser();
    await addMember(org.id, member.id, "MEMBER");

    await expect(
      orgCrud.updateOrg(member.id, org.slug, { name: "Nope" }),
    ).rejects.toThrow("Requires ADMIN");
  });

  it("deleteOrg removes org and disassociates skills", async () => {
    const { admin, org } = await createTestOrg();

    // Create a skill in the org
    const category = await testPrisma.category.findFirstOrThrow();
    const skill = await testPrisma.skill.create({
      data: {
        slug: "org-skill",
        name: "Org Skill",
        description: "test",
        categoryId: category.id,
        authorId: admin.id,
        orgId: org.id,
        visibility: "ORG",
        platforms: ["CLAUDE_CODE"],
      },
    });

    await orgCrud.deleteOrg(admin.id, org.slug);

    // Org should be gone
    const dbOrg = await testPrisma.organization.findUnique({ where: { slug: org.slug } });
    expect(dbOrg).toBeNull();

    // Skill should still exist but set to PRIVATE and orgId=null
    const dbSkill = await testPrisma.skill.findUnique({ where: { id: skill.id } });
    expect(dbSkill).not.toBeNull();
    expect(dbSkill!.visibility).toBe("PRIVATE");
    expect(dbSkill!.orgId).toBeNull();
  });

  it("deleteOrg rejects non-admin", async () => {
    const { org } = await createTestOrg();
    const member = await createTestUser();
    await addMember(org.id, member.id, "PUBLISHER");

    await expect(orgCrud.deleteOrg(member.id, org.slug)).rejects.toThrow("Requires ADMIN");
  });
});

// ─── Members ────────────────────────────────────────────────────────────

describe("org members (integration)", () => {
  it("listMembers returns all members", async () => {
    const { admin, org } = await createTestOrg();
    const user2 = await createTestUser();
    await addMember(org.id, user2.id);

    const result = await orgMembers.listMembers(org.slug, admin.id, { limit: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(false);
  });

  it("listMembers requires membership", async () => {
    const { org } = await createTestOrg();
    const outsider = await createTestUser();

    await expect(
      orgMembers.listMembers(org.slug, outsider.id, { limit: 20 }),
    ).rejects.toThrow("not a member");
  });

  it("listMembers supports search by username", async () => {
    const { admin, org } = await createTestOrg();
    const user2 = await createTestUser({ username: "alice-dev" });
    const user3 = await createTestUser({ username: "bob-dev" });
    await addMember(org.id, user2.id);
    await addMember(org.id, user3.id);

    const result = await orgMembers.listMembers(org.slug, admin.id, { limit: 20, q: "alice" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].user.username).toBe("alice-dev");
  });

  it("updateMemberRole promotes member to PUBLISHER", async () => {
    const { admin, org } = await createTestOrg();
    const member = await createTestUser();
    await addMember(org.id, member.id, "MEMBER");

    const updated = await orgMembers.updateMemberRole(admin.id, org.slug, member.id, "PUBLISHER");
    expect(updated.role).toBe("PUBLISHER");
  });

  it("updateMemberRole rejects non-admin", async () => {
    const { org } = await createTestOrg();
    const publisher = await createTestUser();
    const member = await createTestUser();
    await addMember(org.id, publisher.id, "PUBLISHER");
    await addMember(org.id, member.id, "MEMBER");

    await expect(
      orgMembers.updateMemberRole(publisher.id, org.slug, member.id, "PUBLISHER"),
    ).rejects.toThrow("Requires ADMIN");
  });

  it("cannot demote the last admin", async () => {
    const { admin, org } = await createTestOrg();

    await expect(
      orgMembers.updateMemberRole(admin.id, org.slug, admin.id, "MEMBER"),
    ).rejects.toThrow("last admin");
  });

  it("removeMember — admin removes a member", async () => {
    const { admin, org } = await createTestOrg();
    const member = await createTestUser();
    await addMember(org.id, member.id);

    await orgMembers.removeMember(admin.id, org.slug, member.id);

    const membership = await testPrisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: member.id } },
    });
    expect(membership).toBeNull();
  });

  it("removeMember — user can remove themselves", async () => {
    const { org } = await createTestOrg();
    const member = await createTestUser();
    await addMember(org.id, member.id);

    // member removes themselves — no ADMIN check needed
    await orgMembers.removeMember(member.id, org.slug, member.id);

    const membership = await testPrisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: member.id } },
    });
    expect(membership).toBeNull();
  });

  it("cannot remove the last admin", async () => {
    const { admin, org } = await createTestOrg();

    await expect(
      orgMembers.removeMember(admin.id, org.slug, admin.id),
    ).rejects.toThrow("last admin");
  });
});

// ─── Invites ────────────────────────────────────────────────────────────

describe("org invites (integration)", () => {
  it("inviteMember creates a pending invite", async () => {
    const { admin, org } = await createTestOrg();
    const invitee = await createTestUser({ username: "invitee-user" });

    const invite = await orgInvites.inviteMember(admin.id, org.slug, {
      username: "invitee-user",
      role: "MEMBER",
    });

    expect(invite.inviteeUsername).toBe("invitee-user");
    expect(invite.role).toBe("MEMBER");
    expect(invite.status).toBe("PENDING");
    expect(invite.invitedBy).toBe(admin.username);
    expect(invite.token).toBeDefined();
  });

  it("inviteMember rejects non-admin", async () => {
    const { org } = await createTestOrg();
    const publisher = await createTestUser();
    await addMember(org.id, publisher.id, "PUBLISHER");
    const invitee = await createTestUser({ username: "invited-person" });

    await expect(
      orgInvites.inviteMember(publisher.id, org.slug, { username: "invited-person" }),
    ).rejects.toThrow("Requires ADMIN");
  });

  it("rejects invite for existing member", async () => {
    const { admin, org } = await createTestOrg();
    const member = await createTestUser({ username: "already-member" });
    await addMember(org.id, member.id);

    await expect(
      orgInvites.inviteMember(admin.id, org.slug, { username: "already-member" }),
    ).rejects.toThrow("already a member");
  });

  it("rejects duplicate pending invite", async () => {
    const { admin, org } = await createTestOrg();
    await createTestUser({ username: "dupe-invite" });

    await orgInvites.inviteMember(admin.id, org.slug, { username: "dupe-invite" });
    await expect(
      orgInvites.inviteMember(admin.id, org.slug, { username: "dupe-invite" }),
    ).rejects.toThrow("pending invite");
  });

  it("acceptInvite adds user to org and marks invite ACCEPTED", async () => {
    const { admin, org } = await createTestOrg();
    const invitee = await createTestUser({ username: "accept-me" });

    const invite = await orgInvites.inviteMember(admin.id, org.slug, {
      username: "accept-me",
      role: "PUBLISHER",
    });

    await orgInvites.acceptInvite(invitee.id, invite.token);

    // Should now be a member
    const membership = await testPrisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: invitee.id } },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("PUBLISHER");

    // Invite should be ACCEPTED
    const dbInvite = await testPrisma.orgInvite.findUnique({ where: { token: invite.token } });
    expect(dbInvite!.status).toBe("ACCEPTED");
  });

  it("acceptInvite rejects wrong user", async () => {
    const { admin, org } = await createTestOrg();
    const invitee = await createTestUser({ username: "target-user" });
    const wrongUser = await createTestUser();

    const invite = await orgInvites.inviteMember(admin.id, org.slug, { username: "target-user" });

    await expect(orgInvites.acceptInvite(wrongUser.id, invite.token)).rejects.toThrow(
      "not for you",
    );
  });

  it("acceptInvite rejects expired invite", async () => {
    const { admin, org } = await createTestOrg();
    const invitee = await createTestUser({ username: "expired-user" });

    const invite = await orgInvites.inviteMember(admin.id, org.slug, { username: "expired-user" });

    // Manually expire the invite
    await testPrisma.orgInvite.update({
      where: { token: invite.token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(orgInvites.acceptInvite(invitee.id, invite.token)).rejects.toThrow("expired");
  });

  it("declineInvite marks invite as DECLINED", async () => {
    const { admin, org } = await createTestOrg();
    const invitee = await createTestUser({ username: "decline-me" });

    const invite = await orgInvites.inviteMember(admin.id, org.slug, { username: "decline-me" });
    await orgInvites.declineInvite(invitee.id, invite.token);

    const dbInvite = await testPrisma.orgInvite.findUnique({ where: { token: invite.token } });
    expect(dbInvite!.status).toBe("DECLINED");
  });

  it("revokeInvite deletes a pending invite", async () => {
    const { admin, org } = await createTestOrg();
    await createTestUser({ username: "revoke-target" });

    const invite = await orgInvites.inviteMember(admin.id, org.slug, { username: "revoke-target" });
    await orgInvites.revokeInvite(admin.id, org.slug, invite.id);

    const dbInvite = await testPrisma.orgInvite.findUnique({ where: { token: invite.token } });
    expect(dbInvite).toBeNull();
  });

  it("listInvites returns pending invites", async () => {
    const { admin, org } = await createTestOrg();
    await createTestUser({ username: "list-invite-a" });
    await createTestUser({ username: "list-invite-b" });

    await orgInvites.inviteMember(admin.id, org.slug, { username: "list-invite-a" });
    await orgInvites.inviteMember(admin.id, org.slug, { username: "list-invite-b" });

    const invites = await orgInvites.listInvites(org.slug, admin.id);
    expect(invites).toHaveLength(2);
  });
});

// ─── Templates ──────────────────────────────────────────────────────────

describe("org templates (integration)", () => {
  it("createTemplate creates a template (PUBLISHER+)", async () => {
    const { org } = await createTestOrg();
    const publisher = await createTestUser();
    await addMember(org.id, publisher.id, "PUBLISHER");

    const template = await orgTemplates.createTemplate(publisher.id, org.slug, {
      name: "My Template",
      description: "A skill template",
      categorySlug: "build",
      platforms: ["CLAUDE_CODE"],
      instructions: "Do the thing",
    });

    expect(template.name).toBe("My Template");
    expect(template.categorySlug).toBe("build");
  });

  it("createTemplate rejects MEMBER role", async () => {
    const { org } = await createTestOrg();
    const member = await createTestUser();
    await addMember(org.id, member.id, "MEMBER");

    await expect(
      orgTemplates.createTemplate(member.id, org.slug, { name: "Nope" }),
    ).rejects.toThrow("Requires PUBLISHER");
  });

  it("listTemplates returns all templates for the org", async () => {
    const { admin, org } = await createTestOrg();

    await orgTemplates.createTemplate(admin.id, org.slug, { name: "T1" });
    await orgTemplates.createTemplate(admin.id, org.slug, { name: "T2" });

    const templates = await orgTemplates.listTemplates(org.slug, admin.id);
    expect(templates).toHaveLength(2);
  });

  it("getTemplate returns template with instructions", async () => {
    const { admin, org } = await createTestOrg();

    const created = await orgTemplates.createTemplate(admin.id, org.slug, {
      name: "Full Template",
      instructions: "Step 1: do stuff",
    });

    const detail = await orgTemplates.getTemplate(org.slug, created.id, admin.id);
    expect(detail.name).toBe("Full Template");
    expect(detail.instructions).toBe("Step 1: do stuff");
  });

  it("updateTemplate modifies fields", async () => {
    const { admin, org } = await createTestOrg();

    const created = await orgTemplates.createTemplate(admin.id, org.slug, { name: "Original" });
    const updated = await orgTemplates.updateTemplate(admin.id, org.slug, created.id, {
      name: "Renamed",
      description: "New desc",
    });

    expect(updated.name).toBe("Renamed");
    expect(updated.description).toBe("New desc");
  });

  it("deleteTemplate removes the template (ADMIN only)", async () => {
    const { admin, org } = await createTestOrg();

    const created = await orgTemplates.createTemplate(admin.id, org.slug, { name: "To Delete" });
    await orgTemplates.deleteTemplate(admin.id, org.slug, created.id);

    const templates = await orgTemplates.listTemplates(org.slug, admin.id);
    expect(templates).toHaveLength(0);
  });

  it("deleteTemplate rejects PUBLISHER role", async () => {
    const { admin, org } = await createTestOrg();
    const publisher = await createTestUser();
    await addMember(org.id, publisher.id, "PUBLISHER");

    const created = await orgTemplates.createTemplate(admin.id, org.slug, { name: "Protected" });

    await expect(
      orgTemplates.deleteTemplate(publisher.id, org.slug, created.id),
    ).rejects.toThrow("Requires ADMIN");
  });
});
