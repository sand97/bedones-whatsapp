/*
  Warnings:

  - You are about to drop the column `conversationId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversationTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `whatsappChatId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConversationTag" DROP CONSTRAINT "ConversationTag_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConversationTag" DROP CONSTRAINT "ConversationTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Tag" DROP CONSTRAINT "Tag_userId_fkey";

-- DropIndex
DROP INDEX "public"."Order_conversationId_idx";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "conversationId",
ADD COLUMN     "whatsappChatId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Conversation";

-- DropTable
DROP TABLE "public"."ConversationTag";

-- DropTable
DROP TABLE "public"."Group";

-- DropTable
DROP TABLE "public"."Message";

-- DropTable
DROP TABLE "public"."Tag";

-- DropEnum
DROP TYPE "public"."GroupType";

-- DropEnum
DROP TYPE "public"."MessageType";

-- CreateIndex
CREATE INDEX "Order_whatsappChatId_idx" ON "public"."Order"("whatsappChatId");
