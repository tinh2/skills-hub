-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'PUBLISHER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('SCREENSHOT', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "SandboxStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULE', 'WEBHOOK', 'CHANNEL');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- AlterEnum
ALTER TYPE "Visibility" ADD VALUE 'ORG';

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubAccessToken" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "githubOrgId" INTEGER,
    "githubOrg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "inviteeUsername" TEXT,
    "inviteeUserId" TEXT,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgSkillTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categorySlug" TEXT,
    "platforms" "Platform"[],
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSkillTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillLike" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillMedia" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxRun" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testCaseId" TEXT,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "status" "SandboxStatus" NOT NULL DEFAULT 'PENDING',
    "durationMs" INTEGER,
    "tokenCount" INTEGER,
    "errorMessage" TEXT,
    "inputHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandboxRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'STOPPED',
    "triggerType" "TriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggerConfig" JSONB,
    "channelType" TEXT,
    "channelConfig" JSONB,
    "modelProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "modelId" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250514',
    "openfangHandId" TEXT,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "input" TEXT,
    "output" TEXT,
    "durationMs" INTEGER,
    "tokenCount" INTEGER,
    "errorMessage" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_githubOrgId_key" ON "Organization"("githubOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_githubOrg_key" ON "Organization"("githubOrg");

-- CreateIndex
CREATE INDEX "OrgMembership_userId_idx" ON "OrgMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembership_orgId_userId_key" ON "OrgMembership"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInvite_token_key" ON "OrgInvite"("token");

-- CreateIndex
CREATE INDEX "OrgInvite_orgId_idx" ON "OrgInvite"("orgId");

-- CreateIndex
CREATE INDEX "OrgInvite_inviteeUserId_idx" ON "OrgInvite"("inviteeUserId");

-- CreateIndex
CREATE INDEX "OrgInvite_token_idx" ON "OrgInvite"("token");

-- CreateIndex
CREATE INDEX "OrgSkillTemplate_orgId_idx" ON "OrgSkillTemplate"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgSkillTemplate_orgId_name_key" ON "OrgSkillTemplate"("orgId", "name");

-- CreateIndex
CREATE INDEX "SkillLike_skillId_idx" ON "SkillLike"("skillId");

-- CreateIndex
CREATE INDEX "SkillLike_userId_idx" ON "SkillLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillLike_skillId_userId_key" ON "SkillLike"("skillId", "userId");

-- CreateIndex
CREATE INDEX "SkillMedia_skillId_idx" ON "SkillMedia"("skillId");

-- CreateIndex
CREATE INDEX "TestCase_skillId_idx" ON "TestCase"("skillId");

-- CreateIndex
CREATE INDEX "SandboxRun_skillId_idx" ON "SandboxRun"("skillId");

-- CreateIndex
CREATE INDEX "SandboxRun_userId_idx" ON "SandboxRun"("userId");

-- CreateIndex
CREATE INDEX "SandboxRun_inputHash_idx" ON "SandboxRun"("inputHash");

-- CreateIndex
CREATE INDEX "SandboxRun_createdAt_idx" ON "SandboxRun"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Agent_ownerId_idx" ON "Agent"("ownerId");

-- CreateIndex
CREATE INDEX "Agent_skillId_idx" ON "Agent"("skillId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "AgentExecution_agentId_idx" ON "AgentExecution"("agentId");

-- CreateIndex
CREATE INDEX "AgentExecution_createdAt_idx" ON "AgentExecution"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Skill_orgId_idx" ON "Skill"("orgId");

-- CreateIndex
CREATE INDEX "Skill_likeCount_idx" ON "Skill"("likeCount" DESC);

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgSkillTemplate" ADD CONSTRAINT "OrgSkillTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillLike" ADD CONSTRAINT "SkillLike_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillLike" ADD CONSTRAINT "SkillLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillMedia" ADD CONSTRAINT "SkillMedia_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxRun" ADD CONSTRAINT "SandboxRun_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxRun" ADD CONSTRAINT "SandboxRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxRun" ADD CONSTRAINT "SandboxRun_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
