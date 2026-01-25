-- AlterTable
ALTER TABLE "repository" ADD COLUMN     "indexStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "indexedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "repository_review" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "review" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agentResults" JSONB,
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repository_review_repositoryId_idx" ON "repository_review"("repositoryId");

-- CreateIndex
CREATE INDEX "repository_review_status_idx" ON "repository_review"("status");

-- AddForeignKey
ALTER TABLE "repository_review" ADD CONSTRAINT "repository_review_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
