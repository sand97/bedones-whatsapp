-- CreateEnum
CREATE TYPE "public"."SyncImageStatus" AS ENUM ('PENDING', 'SYNCING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "coverImageDescription" TEXT,
ADD COLUMN     "indexDescriptionAt" TIMESTAMP(3),
ADD COLUMN     "indexImageAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."WhatsAppAgent" ADD COLUMN     "customDescriptionPrompt" TEXT,
ADD COLUMN     "lastImageSyncDate" TIMESTAMP(3),
ADD COLUMN     "lastImageSyncError" TEXT,
ADD COLUMN     "promptBasedOnProductsCount" INTEGER,
ADD COLUMN     "promptGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "syncImageStatus" "public"."SyncImageStatus" NOT NULL DEFAULT 'PENDING';
