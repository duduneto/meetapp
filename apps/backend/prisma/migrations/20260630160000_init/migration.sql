-- CreateTable
CREATE TABLE "Congregation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Congregation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CongregationSettings" (
    "id" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Fortaleza',
    "midweekDefaultWeekday" INTEGER NOT NULL DEFAULT 3,
    "weekendDefaultWeekday" INTEGER NOT NULL DEFAULT 6,
    "anonymousReadTokenHash" TEXT NOT NULL,
    "anonymousReadTokenCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scriptApiKeyHash" TEXT NOT NULL,
    "scriptApiKeyCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CongregationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingWeek" (
    "id" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "yearWeek" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "bibleReading" TEXT,
    "rawSourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "meetingWeekId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3),
    "publicTalkTheme" TEXT,
    "publicSpeakerName" TEXT,
    "publicSpeakerCongregation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSection" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingPart" (
    "id" TEXT NOT NULL,
    "meetingSectionId" TEXT NOT NULL,
    "partKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "assignable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingPartSlot" (
    "id" TEXT NOT NULL,
    "meetingPartId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingPartSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "meetingPartSlotId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CongregationSettings_congregationId_key" ON "CongregationSettings"("congregationId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "User_congregationId_email_key" ON "User"("congregationId", "email");
CREATE INDEX "Participant_congregationId_deletedAt_idx" ON "Participant"("congregationId", "deletedAt");
CREATE INDEX "MeetingWeek_congregationId_startAt_idx" ON "MeetingWeek"("congregationId", "startAt");
CREATE UNIQUE INDEX "MeetingWeek_congregationId_ref_key" ON "MeetingWeek"("congregationId", "ref");
CREATE UNIQUE INDEX "MeetingWeek_congregationId_year_yearWeek_key" ON "MeetingWeek"("congregationId", "year", "yearWeek");
CREATE UNIQUE INDEX "Meeting_meetingWeekId_type_key" ON "Meeting"("meetingWeekId", "type");
CREATE INDEX "MeetingSection_meetingId_order_idx" ON "MeetingSection"("meetingId", "order");
CREATE UNIQUE INDEX "MeetingSection_meetingId_sectionKey_key" ON "MeetingSection"("meetingId", "sectionKey");
CREATE INDEX "MeetingPart_meetingSectionId_order_idx" ON "MeetingPart"("meetingSectionId", "order");
CREATE UNIQUE INDEX "MeetingPart_meetingSectionId_partKey_key" ON "MeetingPart"("meetingSectionId", "partKey");
CREATE UNIQUE INDEX "MeetingPartSlot_meetingPartId_position_key" ON "MeetingPartSlot"("meetingPartId", "position");
CREATE UNIQUE INDEX "Assignment_meetingPartSlotId_key" ON "Assignment"("meetingPartSlotId");
CREATE INDEX "AuditLog_congregationId_changedAt_idx" ON "AuditLog"("congregationId", "changedAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

ALTER TABLE "CongregationSettings" ADD CONSTRAINT "CongregationSettings_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingWeek" ADD CONSTRAINT "MeetingWeek_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_meetingWeekId_fkey" FOREIGN KEY ("meetingWeekId") REFERENCES "MeetingWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingSection" ADD CONSTRAINT "MeetingSection_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingPart" ADD CONSTRAINT "MeetingPart_meetingSectionId_fkey" FOREIGN KEY ("meetingSectionId") REFERENCES "MeetingSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingPartSlot" ADD CONSTRAINT "MeetingPartSlot_meetingPartId_fkey" FOREIGN KEY ("meetingPartId") REFERENCES "MeetingPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_meetingPartSlotId_fkey" FOREIGN KEY ("meetingPartSlotId") REFERENCES "MeetingPartSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
