-- DropIndex
DROP INDEX "Skill_searchVector_idx";

-- CreateIndex
CREATE INDEX "OrgInvite_invitedByUserId_idx" ON "OrgInvite"("invitedByUserId");
