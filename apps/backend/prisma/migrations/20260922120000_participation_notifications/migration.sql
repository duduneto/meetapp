CREATE TYPE "ParticipationNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "ParticipationNotification" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "batchId" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL,
    "recipientWhatsapp" TEXT NOT NULL,
    "status" "ParticipationNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "ParticipationNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParticipationNotification_assignmentId_tokenVersion_key"
ON "ParticipationNotification"("assignmentId", "tokenVersion");

CREATE INDEX "ParticipationNotification_batchId_idx"
ON "ParticipationNotification"("batchId");

CREATE INDEX "ParticipationNotification_assignmentId_createdAt_idx"
ON "ParticipationNotification"("assignmentId", "createdAt");

CREATE INDEX "ParticipationNotification_status_createdAt_idx"
ON "ParticipationNotification"("status", "createdAt");

ALTER TABLE "ParticipationNotification"
ADD CONSTRAINT "ParticipationNotification_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParticipationNotification"
ADD CONSTRAINT "ParticipationNotification_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
