ALTER TABLE "user" ADD COLUMN "focus_min" integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "short_break_min" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "long_break_min" integer DEFAULT 15 NOT NULL;