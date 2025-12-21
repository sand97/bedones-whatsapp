-- CreateEnum
CREATE TYPE "public"."MemoryType" AS ENUM ('PREFERENCE', 'VIP_NOTE', 'ORDER', 'CONTEXT');

-- CreateEnum
CREATE TYPE "public"."IntentionType" AS ENUM ('FOLLOW_UP', 'ORDER_REMINDER', 'PAYMENT_REMINDER', 'DELIVERY_UPDATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."IntentionStatus" AS ENUM ('PENDING', 'TRIGGERED', 'COMPLETED', 'CANCELLED', 'OBSOLETE');

-- CreateTable
CREATE TABLE "public"."ConversationMemory" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" "public"."MemoryType" NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ConversationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Intention" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" "public"."IntentionType" NOT NULL,
    "status" "public"."IntentionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "conditionToCheck" TEXT NOT NULL,
    "actionIfTrue" TEXT,
    "actionIfFalse" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "scheduledMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "triggeredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByRole" TEXT,

    CONSTRAINT "Intention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "context" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CatalogProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "availability" TEXT,
    "collectionId" TEXT,
    "collectionName" TEXT,
    "retailerId" TEXT,
    "maxAvailable" INTEGER,
    "imageHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CatalogSyncMetadata" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "quickHash" TEXT NOT NULL,
    "fullHash" TEXT NOT NULL,
    "productsCount" INTEGER NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSyncMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationMemory_chatId_idx" ON "public"."ConversationMemory"("chatId");

-- CreateIndex
CREATE INDEX "ConversationMemory_type_idx" ON "public"."ConversationMemory"("type");

-- CreateIndex
CREATE INDEX "ConversationMemory_expiresAt_idx" ON "public"."ConversationMemory"("expiresAt");

-- CreateIndex
CREATE INDEX "ConversationMemory_chatId_type_idx" ON "public"."ConversationMemory"("chatId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Intention_scheduledMessageId_key" ON "public"."Intention"("scheduledMessageId");

-- CreateIndex
CREATE INDEX "Intention_chatId_idx" ON "public"."Intention"("chatId");

-- CreateIndex
CREATE INDEX "Intention_type_idx" ON "public"."Intention"("type");

-- CreateIndex
CREATE INDEX "Intention_status_idx" ON "public"."Intention"("status");

-- CreateIndex
CREATE INDEX "Intention_scheduledFor_idx" ON "public"."Intention"("scheduledFor");

-- CreateIndex
CREATE INDEX "Intention_chatId_status_idx" ON "public"."Intention"("chatId", "status");

-- CreateIndex
CREATE INDEX "ScheduledMessage_chatId_idx" ON "public"."ScheduledMessage"("chatId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_scheduledFor_idx" ON "public"."ScheduledMessage"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledMessage_status_idx" ON "public"."ScheduledMessage"("status");

-- CreateIndex
CREATE INDEX "CatalogProduct_name_idx" ON "public"."CatalogProduct"("name");

-- CreateIndex
CREATE INDEX "CatalogProduct_collectionId_idx" ON "public"."CatalogProduct"("collectionId");

-- CreateIndex
CREATE INDEX "CatalogProduct_lastSyncedAt_idx" ON "public"."CatalogProduct"("lastSyncedAt");

-- AddForeignKey
ALTER TABLE "public"."Intention" ADD CONSTRAINT "Intention_scheduledMessageId_fkey" FOREIGN KEY ("scheduledMessageId") REFERENCES "public"."ScheduledMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
