CREATE TYPE "public"."notification_type" AS ENUM('QUIZ_STARTED', 'QUIZ_RESULT', 'CLASSROOM_INVITE', 'STUDENT_JOINED', 'STUDENT_FLAGGED', 'ORG_INVITE', 'ORG_INVITE_ACCEPTED', 'ORG_INVITE_DECLINED', 'STUDENT_REMOVED');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"link" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;