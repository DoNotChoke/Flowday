CREATE TYPE "public"."activity_actor" AS ENUM('user', 'mcp');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_source" AS ENUM('web', 'mcp');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('ongoing', 'in_process', 'completed', 'canceled');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"actor" "activity_actor" NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"template" text,
	"start_date" date,
	"target_date" date,
	"budget_hours" integer,
	"task_seq" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_user_id_key_unique" UNIQUE("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "subtask" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"number" integer,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'ongoing' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_at" timestamp with time zone,
	"due_has_time" boolean DEFAULT false NOT NULL,
	"planned_at" timestamp with time zone,
	"duration_min" integer,
	"estimate_min" integer,
	"alert_enabled" boolean DEFAULT false NOT NULL,
	"position" double precision NOT NULL,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"source" "task_source" DEFAULT 'web' NOT NULL,
	"client_request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_project_id_number_unique" UNIQUE("project_id","number"),
	CONSTRAINT "task_user_id_client_request_id_unique" UNIQUE("user_id","client_request_id")
);
--> statement-breakpoint
CREATE TABLE "task_category" (
	"task_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "task_category_task_id_category_id_pk" PRIMARY KEY("task_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtask" ADD CONSTRAINT "subtask_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_category" ADD CONSTRAINT "task_category_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_category" ADD CONSTRAINT "task_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_task_idx" ON "activity" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "subtask_task_idx" ON "subtask" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_user_status_idx" ON "task" USING btree ("user_id","status","position");