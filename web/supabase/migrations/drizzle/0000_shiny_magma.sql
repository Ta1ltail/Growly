CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economy_freezes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"date" date NOT NULL,
	"habit_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economy_spent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" integer NOT NULL,
	"item" text NOT NULL,
	CONSTRAINT "economy_spent_amount_check" CHECK ("economy_spent"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "economy_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"owned" text[] DEFAULT '{}'::text[] NOT NULL,
	"equipped" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bonus_coins" integer DEFAULT 0 NOT NULL,
	"last_check_in" date,
	"check_in_streak" integer DEFAULT 0 NOT NULL,
	"last_quest_date" date,
	"current_quest" jsonb,
	"last_spin_date" date,
	"last_spin_result" jsonb
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester" uuid NOT NULL,
	"addressee" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"target" integer NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" text,
	"deadline" date,
	"linked_habit_ids" uuid[] DEFAULT '{}'::uuid[],
	"milestones" jsonb
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"repeat_days" integer[] DEFAULT '{}'::int[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recurrence" jsonb,
	"start_date" date,
	"time_of_day" text,
	"priority" text,
	"archived" boolean DEFAULT false NOT NULL,
	"reminder" jsonb,
	CONSTRAINT "habits_priority_check" CHECK ("habits"."priority" IN ('low','med','high'))
);
--> statement-breakpoint
CREATE TABLE "marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"habit_id" uuid NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"links" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"from_user" uuid,
	"link" text DEFAULT '' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_seen" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"title" text DEFAULT 'Habit Newbie' NOT NULL,
	"shop" text[] DEFAULT '{}'::text[] NOT NULL,
	"streaks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tier_unlocks" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"username" text NOT NULL,
	"bio" text,
	"motto" text,
	"avatar" text,
	"banner" text,
	"showcase_badge_id" text
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"theme_mode" text DEFAULT 'dark' NOT NULL,
	"theme_accent" text DEFAULT 'blue' NOT NULL,
	"grace_hours" integer DEFAULT 5 NOT NULL,
	"used_template_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"widget_order" text[],
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"custom_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "user_settings_grace_hours_check" CHECK ("user_settings"."grace_hours" >= 0 AND "user_settings"."grace_hours" <= 24)
);
--> statement-breakpoint
CREATE TABLE "user_stats_snapshots" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"total_completions" integer DEFAULT 0 NOT NULL,
	"consistency_14d" integer DEFAULT 0 NOT NULL,
	"achievement_count" integer DEFAULT 0 NOT NULL,
	"title_name" text DEFAULT 'Habit Newbie' NOT NULL,
	"rank_icon" text DEFAULT '⬡' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "economy_freezes" ADD CONSTRAINT "economy_freezes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economy_freezes" ADD CONSTRAINT "economy_freezes_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economy_spent" ADD CONSTRAINT "economy_spent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economy_state" ADD CONSTRAINT "economy_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_requester_users_id_fk" FOREIGN KEY ("requester") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_addressee_users_id_fk" FOREIGN KEY ("addressee") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_users_id_fk" FOREIGN KEY ("from_user") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_seen" ADD CONSTRAINT "progress_seen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats_snapshots" ADD CONSTRAINT "user_stats_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_economy_freezes_user_id" ON "economy_freezes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_economy_spent_user_id" ON "economy_spent" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friends_pair_key" ON "friends" USING btree ("requester","addressee");--> statement-breakpoint
CREATE INDEX "idx_friends_requester" ON "friends" USING btree ("requester");--> statement-breakpoint
CREATE INDEX "idx_friends_addressee" ON "friends" USING btree ("addressee");--> statement-breakpoint
CREATE INDEX "idx_friends_requester_status" ON "friends" USING btree ("requester","status");--> statement-breakpoint
CREATE INDEX "idx_friends_addressee_status" ON "friends" USING btree ("addressee","status");--> statement-breakpoint
CREATE INDEX "idx_goals_user_id" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_habits_user_id" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marks_user_date_habit_key" ON "marks" USING btree ("user_id","date_key","habit_id");--> statement-breakpoint
CREATE INDEX "idx_marks_user_id" ON "marks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_marks_habit_id" ON "marks" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "idx_marks_date_key" ON "marks" USING btree ("date_key");--> statement-breakpoint
CREATE INDEX "idx_notes_user_id" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_suggestions_user_id" ON "suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_suggestions_created_at" ON "suggestions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unlocks_user_achievement_key" ON "unlocks" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "idx_unlocks_user_id" ON "unlocks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_username_key" ON "user_profile" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_user_profile_username" ON "user_profile" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_stats_level_desc" ON "user_stats_snapshots" USING btree ("level" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_stats_streak_desc" ON "user_stats_snapshots" USING btree ("current_streak" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_stats_consistency_desc" ON "user_stats_snapshots" USING btree ("consistency_14d" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_stats_completions_desc" ON "user_stats_snapshots" USING btree ("total_completions" DESC NULLS LAST);