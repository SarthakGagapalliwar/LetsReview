/*
  Warnings:

  - You are about to drop the `respository` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[repositoryId,prNumber,headSha]` on the table `review` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "respository" DROP CONSTRAINT "respository_userId_fkey";

-- DropForeignKey
ALTER TABLE "review" DROP CONSTRAINT "review_repositoryId_fkey";

-- AlterTable
ALTER TABLE "review" ADD COLUMN     "commentId" BIGINT,
ADD COLUMN     "headSha" TEXT;

-- DropTable
DROP TABLE "respository";

-- CreateTable
CREATE TABLE "repository" (
    "id" TEXT NOT NULL,
    "githubId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_count" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_count_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repository_githubId_key" ON "repository"("githubId");

-- CreateIndex
CREATE INDEX "repository_userId_idx" ON "repository"("userId");

-- CreateIndex
CREATE INDEX "review_count_userId_idx" ON "review_count"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "review_count_userId_repositoryId_key" ON "review_count"("userId", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "review_repositoryId_prNumber_headSha_key" ON "review"("repositoryId", "prNumber", "headSha");

-- AddForeignKey
ALTER TABLE "repository" ADD CONSTRAINT "repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_count" ADD CONSTRAINT "review_count_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
