-- CreateEnum
CREATE TYPE "GoogleAuthPurpose" AS ENUM ('LINK', 'LOGIN');

-- CreateTable
CREATE TABLE "google_auth_attempts" (
    "state_hash" CHAR(64) NOT NULL,
    "purpose" "GoogleAuthPurpose" NOT NULL,
    "session_id" UUID,
    "code_verifier" VARCHAR(128) NOT NULL,
    "nonce" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_auth_attempts_pkey" PRIMARY KEY ("state_hash"),
    CONSTRAINT "google_auth_attempts_purpose_session_check" CHECK (
        ("purpose" = 'LINK' AND "session_id" IS NOT NULL) OR
        ("purpose" = 'LOGIN' AND "session_id" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "google_auth_attempts_session_id_idx" ON "google_auth_attempts"("session_id");

-- CreateIndex
CREATE INDEX "google_auth_attempts_expires_at_idx" ON "google_auth_attempts"("expires_at");

-- AddForeignKey
ALTER TABLE "google_auth_attempts" ADD CONSTRAINT "google_auth_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
