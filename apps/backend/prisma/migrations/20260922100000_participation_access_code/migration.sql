ALTER TABLE "Assignment"
ADD COLUMN "participationAccessCodeHash" TEXT;

CREATE UNIQUE INDEX "Assignment_participationAccessCodeHash_key"
ON "Assignment"("participationAccessCodeHash");
