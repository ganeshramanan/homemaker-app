-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weightReminderDay" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "modules" SET DEFAULT 'provisions,budget,calendar,diary,weight';

-- Existing accounts that have exactly the standard four sections get the new one too; customised lists are left alone.
UPDATE "User" SET "modules" = "modules" || ',weight' WHERE "modules" = 'provisions,budget,calendar,diary';

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birthYear" INTEGER,
    "heightCm" DOUBLE PRECISION,
    "targetKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");

-- CreateIndex
CREATE INDEX "WeightEntry_userId_idx" ON "WeightEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_memberId_date_key" ON "WeightEntry"("memberId", "date");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
