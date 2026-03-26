-- CreateEnum
CREATE TYPE "public"."GoogleContactSyncStatus" AS ENUM ('CREATED', 'LINKED');

-- AlterTable
ALTER TABLE "public"."WhatsAppAgent" ADD COLUMN     "encryptedGoogleContactsToken" TEXT,
ADD COLUMN     "googleContactsConnectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."CustomerContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "whatsappChatId" TEXT NOT NULL,
    "whatsappContactId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "whatsappPushName" TEXT,
    "organizationName" TEXT,
    "googleResourceName" TEXT,
    "googleSyncStatus" "public"."GoogleContactSyncStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_id_key" ON "public"."CustomerContact"("id");

-- CreateIndex
CREATE INDEX "CustomerContact_userId_idx" ON "public"."CustomerContact"("userId");

-- CreateIndex
CREATE INDEX "CustomerContact_phoneNumber_idx" ON "public"."CustomerContact"("phoneNumber");

-- CreateIndex
CREATE INDEX "CustomerContact_googleResourceName_idx" ON "public"."CustomerContact"("googleResourceName");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_userId_phoneNumber_key" ON "public"."CustomerContact"("userId", "phoneNumber");

-- AddForeignKey
ALTER TABLE "public"."CustomerContact" ADD CONSTRAINT "CustomerContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
