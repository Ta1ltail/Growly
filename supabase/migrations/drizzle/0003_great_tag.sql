-- Idempotent version of migration 0003 — safe to run even if objects already exist.
-- FK is inline in CREATE TABLE so it works on fresh DBs (created) and
-- production (IF NOT EXISTS is a no-op, ignoring inline constraints).

CREATE TABLE IF NOT EXISTS "economy_bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"type" text NOT NULL,
	"date_key" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "progress_seen" ADD COLUMN IF NOT EXISTS "completed_goals" text[] DEFAULT '{}'::text[] NOT NULL;

ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "auto_freeze_threshold" integer;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_bonus_per_day"
  ON "economy_bonuses" USING btree ("user_id","type","date_key");

CREATE INDEX IF NOT EXISTS "idx_economy_bonuses_user"
  ON "economy_bonuses" USING btree ("user_id","date_key" DESC NULLS LAST);
