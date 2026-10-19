-- AlterTable
ALTER TABLE "User" ALTER COLUMN "modules" SET DEFAULT 'provisions,budget';

-- CreateTable
CREATE TABLE "BudgetEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetEntry_userId_month_idx" ON "BudgetEntry"("userId", "month");

-- AddForeignKey
ALTER TABLE "BudgetEntry" ADD CONSTRAINT "BudgetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing users get the new Budget section too
UPDATE "User" SET "modules" = "modules" || ',budget' WHERE "modules" NOT LIKE '%budget%';
