-- CreateEnum
CREATE TYPE "public"."StatusScheduleContentType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "public"."StatusScheduleState" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."UserDailyStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "messagesHandled" INTEGER NOT NULL DEFAULT 0,
    "imageMessages" INTEGER NOT NULL DEFAULT 0,
    "imageMessagesHandled" INTEGER NOT NULL DEFAULT 0,
    "textMessages" INTEGER NOT NULL DEFAULT 0,
    "textMessagesHandled" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StatusSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "scheduledDay" VARCHAR(10) NOT NULL,
    "timezone" TEXT NOT NULL,
    "contentType" "public"."StatusScheduleContentType" NOT NULL,
    "textContent" TEXT,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "status" "public"."StatusScheduleState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyStat_id_key" ON "public"."UserDailyStat"("id");

-- CreateIndex
CREATE INDEX "UserDailyStat_userId_idx" ON "public"."UserDailyStat"("userId");

-- CreateIndex
CREATE INDEX "UserDailyStat_day_idx" ON "public"."UserDailyStat"("day");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyStat_userId_day_key" ON "public"."UserDailyStat"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "StatusSchedule_id_key" ON "public"."StatusSchedule"("id");

-- CreateIndex
CREATE INDEX "StatusSchedule_userId_idx" ON "public"."StatusSchedule"("userId");

-- CreateIndex
CREATE INDEX "StatusSchedule_scheduledDay_idx" ON "public"."StatusSchedule"("scheduledDay");

-- CreateIndex
CREATE INDEX "StatusSchedule_scheduledFor_idx" ON "public"."StatusSchedule"("scheduledFor");

-- CreateIndex
CREATE INDEX "StatusSchedule_status_idx" ON "public"."StatusSchedule"("status");

-- CreateIndex
CREATE INDEX "StatusSchedule_userId_scheduledDay_idx" ON "public"."StatusSchedule"("userId", "scheduledDay");

-- CreateIndex
CREATE INDEX "StatusSchedule_status_scheduledFor_idx" ON "public"."StatusSchedule"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "public"."UserDailyStat" ADD CONSTRAINT "UserDailyStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusSchedule" ADD CONSTRAINT "StatusSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
