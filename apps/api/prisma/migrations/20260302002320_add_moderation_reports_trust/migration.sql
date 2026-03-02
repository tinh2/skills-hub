-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('NEW', 'ESTABLISHED', 'TRUSTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('MALICIOUS', 'SPAM', 'INAPPROPRIATE', 'COPYRIGHT', 'MISLEADING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "reviewReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustLevel" "TrustLevel" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "SkillReport" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolveNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillReport_skillId_idx" ON "SkillReport"("skillId");

-- CreateIndex
CREATE INDEX "SkillReport_reporterId_idx" ON "SkillReport"("reporterId");

-- CreateIndex
CREATE INDEX "SkillReport_status_idx" ON "SkillReport"("status");

-- CreateIndex
CREATE INDEX "SkillReport_createdAt_idx" ON "SkillReport"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SkillReport_skillId_reporterId_key" ON "SkillReport"("skillId", "reporterId");

-- CreateIndex
CREATE INDEX "Skill_flaggedForReview_idx" ON "Skill"("flaggedForReview");

-- AddForeignKey
ALTER TABLE "SkillReport" ADD CONSTRAINT "SkillReport_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillReport" ADD CONSTRAINT "SkillReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
