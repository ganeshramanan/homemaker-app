-- CreateTable
CREATE TABLE "DiaryPhoto" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryPhoto_userId_date_idx" ON "DiaryPhoto"("userId", "date");

-- AddForeignKey
ALTER TABLE "DiaryPhoto" ADD CONSTRAINT "DiaryPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
