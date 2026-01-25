-- AlterTable
ALTER TABLE "public"."ProductImage" ADD COLUMN     "normalized_url" TEXT;

-- CreateIndex
CREATE INDEX "ProductImage_normalized_url_idx" ON "public"."ProductImage"("normalized_url");
