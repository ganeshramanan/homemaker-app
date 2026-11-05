-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reminderDays" TEXT NOT NULL DEFAULT '7',
ADD COLUMN     "reminderEmails" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ReminderSent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "onDate" TEXT NOT NULL,
    "daysAhead" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderSent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSent_userId_eventId_onDate_daysAhead_key" ON "ReminderSent"("userId", "eventId", "onDate", "daysAhead");
