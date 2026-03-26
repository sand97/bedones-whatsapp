/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `Credit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."BillingProvider" AS ENUM ('STRIPE', 'NOTCH_PAY');

-- CreateEnum
CREATE TYPE "public"."BillingPaymentMethod" AS ENUM ('CARD', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "public"."BillingPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."Credit" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "public"."UserDailyStat" ADD COLUMN     "audioMessages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "audioMessagesHandled" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."BillingPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "public"."BillingProvider" NOT NULL,
    "paymentMethod" "public"."BillingPaymentMethod" NOT NULL,
    "status" "public"."BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "providerPaymentId" TEXT,
    "providerCheckoutUrl" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "creditsAmount" INTEGER NOT NULL,
    "subscriptionTier" "public"."SubscriptionTier" NOT NULL,
    "phoneNumber" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_id_key" ON "public"."BillingPayment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_reference_key" ON "public"."BillingPayment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_providerSessionId_key" ON "public"."BillingPayment"("providerSessionId");

-- CreateIndex
CREATE INDEX "BillingPayment_userId_idx" ON "public"."BillingPayment"("userId");

-- CreateIndex
CREATE INDEX "BillingPayment_status_idx" ON "public"."BillingPayment"("status");

-- CreateIndex
CREATE INDEX "BillingPayment_provider_idx" ON "public"."BillingPayment"("provider");

-- CreateIndex
CREATE INDEX "BillingPayment_reference_idx" ON "public"."BillingPayment"("reference");

-- CreateIndex
CREATE INDEX "BillingPayment_createdAt_idx" ON "public"."BillingPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_paymentId_key" ON "public"."Credit"("paymentId");

-- AddForeignKey
ALTER TABLE "public"."Credit" ADD CONSTRAINT "Credit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."BillingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingPayment" ADD CONSTRAINT "BillingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
