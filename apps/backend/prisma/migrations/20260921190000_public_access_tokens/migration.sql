CREATE TABLE "PublicAccessToken" (
    "id" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicAccessToken_congregationId_createdAt_idx"
ON "PublicAccessToken"("congregationId", "createdAt");

CREATE INDEX "PublicAccessToken_congregationId_isDefault_revokedAt_expiresAt_idx"
ON "PublicAccessToken"("congregationId", "isDefault", "revokedAt", "expiresAt");

CREATE UNIQUE INDEX "PublicAccessToken_one_default_per_congregation_idx"
ON "PublicAccessToken"("congregationId")
WHERE "isDefault" = true;

ALTER TABLE "PublicAccessToken"
ADD CONSTRAINT "PublicAccessToken_congregationId_fkey"
FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicAccessToken"
ADD CONSTRAINT "PublicAccessToken_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
