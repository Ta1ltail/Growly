ALTER TABLE "goals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_goals_active" ON "goals" USING btree ("user_id") WHERE "goals"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_habits_active" ON "habits" USING btree ("user_id") WHERE "habits"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_notes_active" ON "notes" USING btree ("user_id") WHERE "notes"."deleted_at" IS NULL;