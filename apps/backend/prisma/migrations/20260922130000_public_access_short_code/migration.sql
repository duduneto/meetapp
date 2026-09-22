ALTER TABLE "PublicAccessToken"
ADD COLUMN "accessCode" TEXT;

CREATE UNIQUE INDEX "PublicAccessToken_accessCode_key"
ON "PublicAccessToken"("accessCode");
