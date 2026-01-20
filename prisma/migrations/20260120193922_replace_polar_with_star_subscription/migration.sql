/*
  Warnings:

  - You are about to drop the column `polarCustomerId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `polarSubsriptionId` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_polarCustomerId_key";

-- DropIndex
DROP INDEX "user_polarSubsriptionId_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "polarCustomerId",
DROP COLUMN "polarSubsriptionId",
ADD COLUMN     "starCheckedAt" TIMESTAMP(3),
ADD COLUMN     "starredRepo" BOOLEAN NOT NULL DEFAULT false;
