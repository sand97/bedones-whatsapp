-- CreateEnum
CREATE TYPE "public"."MessageMetadataType" AS ENUM ('AUDIO', 'IMAGE');

-- AlterTable
ALTER TABLE "public"."WhatsAppAgent" ADD COLUMN     "lastCatalogSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentOperation" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "chatId" TEXT NOT NULL,
    "userId" TEXT,
    "userMessage" TEXT NOT NULL,
    "agentResponse" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "totalTokens" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "modelName" TEXT,
    "toolsUsed" JSONB,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageMetadata" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "public"."MessageMetadataType" NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_id_key" ON "public"."Group"("id");

-- CreateIndex
CREATE INDEX "Group_userId_idx" ON "public"."Group"("userId");

-- CreateIndex
CREATE INDEX "Group_whatsappGroupId_idx" ON "public"."Group"("whatsappGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_userId_whatsappGroupId_key" ON "public"."Group"("userId", "whatsappGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentOperation_id_key" ON "public"."AgentOperation"("id");

-- CreateIndex
CREATE INDEX "AgentOperation_agentId_idx" ON "public"."AgentOperation"("agentId");

-- CreateIndex
CREATE INDEX "AgentOperation_chatId_idx" ON "public"."AgentOperation"("chatId");

-- CreateIndex
CREATE INDEX "AgentOperation_userId_idx" ON "public"."AgentOperation"("userId");

-- CreateIndex
CREATE INDEX "AgentOperation_status_idx" ON "public"."AgentOperation"("status");

-- CreateIndex
CREATE INDEX "AgentOperation_createdAt_idx" ON "public"."AgentOperation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageMetadata_id_key" ON "public"."MessageMetadata"("id");

-- CreateIndex
CREATE INDEX "MessageMetadata_createdAt_idx" ON "public"."MessageMetadata"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageMetadata_messageId_type_key" ON "public"."MessageMetadata"("messageId", "type");

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
