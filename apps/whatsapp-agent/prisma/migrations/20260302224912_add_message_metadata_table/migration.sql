-- CreateEnum
CREATE TYPE "public"."MessageMetadataType" AS ENUM ('AUDIO', 'IMAGE', 'PRODUCT', 'QUOTED');

-- CreateTable
CREATE TABLE "public"."message_metadata" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "public"."MessageMetadataType" NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_metadata_messageId_idx" ON "public"."message_metadata"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "message_metadata_messageId_type_key" ON "public"."message_metadata"("messageId", "type");
