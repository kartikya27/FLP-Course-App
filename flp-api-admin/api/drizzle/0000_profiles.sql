CREATE TYPE "public"."profile_role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "profile_role" DEFAULT 'student' NOT NULL,
	"full_name" text,
	"phone" text,
	"email" text,
	"status" "profile_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;