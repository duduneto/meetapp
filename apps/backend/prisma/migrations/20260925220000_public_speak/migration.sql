-- AlterTable Congregation
ALTER TABLE "Congregation" ADD COLUMN "sanitizedName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Congregation" ADD COLUMN "userId" TEXT;
ALTER TABLE "Congregation" ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Congregation"
SET "sanitizedName" = lower(regexp_replace(trim("name"), '[^a-zA-Z0-9 ]', ' ', 'g'));

CREATE INDEX "Congregation_deletedAt_idx" ON "Congregation"("deletedAt");
CREATE INDEX "Congregation_sanitizedName_idx" ON "Congregation"("sanitizedName");

ALTER TABLE "Congregation" ADD CONSTRAINT "Congregation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable PublicSpeakTheme
CREATE TABLE "PublicSpeakTheme" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fullTitle" TEXT NOT NULL,
    "sanitizedFullTitle" TEXT NOT NULL,
    "documentId" TEXT,
    "path" TEXT,
    "userId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSpeakTheme_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicSpeakTheme_number_key" ON "PublicSpeakTheme"("number");
CREATE INDEX "PublicSpeakTheme_sanitizedFullTitle_idx" ON "PublicSpeakTheme"("sanitizedFullTitle");
CREATE INDEX "PublicSpeakTheme_deletedAt_idx" ON "PublicSpeakTheme"("deletedAt");

ALTER TABLE "PublicSpeakTheme" ADD CONSTRAINT "PublicSpeakTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable PublicSpeaker
CREATE TABLE "PublicSpeaker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sanitizedName" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "hostCongregationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "userId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSpeaker_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicSpeaker_hostCongregationId_deletedAt_idx" ON "PublicSpeaker"("hostCongregationId", "deletedAt");
CREATE INDEX "PublicSpeaker_sanitizedName_idx" ON "PublicSpeaker"("sanitizedName");

ALTER TABLE "PublicSpeaker" ADD CONSTRAINT "PublicSpeaker_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicSpeaker" ADD CONSTRAINT "PublicSpeaker_hostCongregationId_fkey" FOREIGN KEY ("hostCongregationId") REFERENCES "Congregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicSpeaker" ADD CONSTRAINT "PublicSpeaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Assignment
ALTER TABLE "Assignment" ALTER COLUMN "participantId" DROP NOT NULL;
ALTER TABLE "Assignment" ADD COLUMN "publicSpeakerId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "publicSpeakThemeId" TEXT;

CREATE INDEX "Assignment_publicSpeakerId_idx" ON "Assignment"("publicSpeakerId");
CREATE INDEX "Assignment_publicSpeakThemeId_idx" ON "Assignment"("publicSpeakThemeId");

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_publicSpeakerId_fkey" FOREIGN KEY ("publicSpeakerId") REFERENCES "PublicSpeaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_publicSpeakThemeId_fkey" FOREIGN KEY ("publicSpeakThemeId") REFERENCES "PublicSpeakTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_participant_xor_publicSpeaker_chk"
  CHECK ("participantId" IS NULL OR "publicSpeakerId" IS NULL);
