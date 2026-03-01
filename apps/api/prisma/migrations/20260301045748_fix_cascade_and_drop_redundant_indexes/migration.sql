-- DropForeignKey
ALTER TABLE "CompositionSkill" DROP CONSTRAINT "CompositionSkill_childSkillId_fkey";

-- DropIndex
DROP INDEX "OrgInvite_token_idx";

-- DropIndex
DROP INDEX "Tag_name_idx";

-- CreateIndex
CREATE INDEX "Skill_avgRating_idx" ON "Skill"("avgRating" DESC);

-- AddForeignKey
ALTER TABLE "CompositionSkill" ADD CONSTRAINT "CompositionSkill_childSkillId_fkey" FOREIGN KEY ("childSkillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
