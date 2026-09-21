CREATE TYPE "AssignmentResponseStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

ALTER TABLE "Assignment"
ADD COLUMN "responseStatus" "AssignmentResponseStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "respondedAt" TIMESTAMP(3),
ADD COLUMN "participationTokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "participationTokenIssuedAt" TIMESTAMP(3);

ALTER TABLE "AuditLog"
ADD COLUMN "meetingId" TEXT,
ADD COLUMN "changedByParticipantId" TEXT,
ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN "action" TEXT NOT NULL DEFAULT 'UPDATED',
ADD COLUMN "context" JSONB,
ALTER COLUMN "changedByUserId" DROP NOT NULL;

UPDATE "AuditLog"
SET "meetingId" = "entityId"
WHERE "entityType" = 'Meeting'
  AND EXISTS (
    SELECT 1 FROM "Meeting" WHERE "Meeting"."id" = "AuditLog"."entityId"
  );

UPDATE "AuditLog" AS audit
SET "meetingId" = meeting_section."meetingId"
FROM "MeetingPartSlot" AS meeting_part_slot
INNER JOIN "MeetingPart" AS meeting_part
  ON meeting_part."id" = meeting_part_slot."meetingPartId"
INNER JOIN "MeetingSection" AS meeting_section
  ON meeting_section."id" = meeting_part."meetingSectionId"
WHERE audit."entityType" = 'Assignment'
  AND audit."entityId" = meeting_part_slot."id";

DROP INDEX IF EXISTS "AuditLog_meetingId_changedAt_idx";
CREATE INDEX "AuditLog_meetingId_changedAt_idx" ON "AuditLog"("meetingId", "changedAt");

ALTER TABLE "AuditLog"
DROP CONSTRAINT "AuditLog_changedByUserId_fkey";

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_changedByUserId_fkey"
FOREIGN KEY ("changedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_changedByParticipantId_fkey"
FOREIGN KEY ("changedByParticipantId") REFERENCES "Participant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
