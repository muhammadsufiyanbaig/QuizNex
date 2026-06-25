CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'GOLD', 'PLATINUM', 'ORG_STARTER', 'ORG_GROWTH', 'ORG_ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."requiz_request_status" AS ENUM('PENDING', 'APPROVED', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."subscription_period" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'SYSTEM_ANNOUNCEMENT';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'REQUIZ_REQUESTED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'REQUIZ_APPROVED';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'ADMIN';--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"metadata" json,
	"ip" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tracker_token" varchar(255) NOT NULL,
	"plan" "plan" NOT NULL,
	"period" "subscription_period" NOT NULL,
	"amount_pkr" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"safepay_reference" varchar(255),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_tracker_token_unique" UNIQUE("tracker_token")
);
--> statement-breakpoint
CREATE TABLE "requiz_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"classroom_id" uuid NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" "requiz_request_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"period" "subscription_period",
	"current_period_start" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "file_url" varchar(1000) NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "s3_key" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requiz_requests" ADD CONSTRAINT "requiz_requests_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requiz_requests" ADD CONSTRAINT "requiz_requests_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requiz_requests" ADD CONSTRAINT "requiz_requests_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requiz_requests" ADD CONSTRAINT "requiz_requests_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_admin_id" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_created_at" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_user_id" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_tracker" ON "payments" USING btree ("tracker_token");--> statement-breakpoint
CREATE INDEX "idx_requiz_requests_quiz_id" ON "requiz_requests" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_requiz_requests_student_id" ON "requiz_requests" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_requiz_requests_status" ON "requiz_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_answers_attempt_id" ON "answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "idx_answers_question_id" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_classrooms_teacher_id" ON "classrooms" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_passkeys_user_id" ON "passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_proctoring_events_attempt_id" ON "proctoring_events" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "idx_questions_quiz_id" ON "questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_quiz_id" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_student_id" ON "quiz_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_quiz_student" ON "quiz_attempts" USING btree ("quiz_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_quizzes_classroom_id" ON "quizzes" USING btree ("classroom_id");--> statement-breakpoint
CREATE INDEX "idx_quizzes_classroom_status" ON "quizzes" USING btree ("classroom_id","status");--> statement-breakpoint
ALTER TABLE "ai_documents" DROP COLUMN "cloudinary_url";