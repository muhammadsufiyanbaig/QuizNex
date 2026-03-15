ALTER TABLE "email_verifications" DROP CONSTRAINT "email_verifications_token_unique";--> statement-breakpoint
ALTER TABLE "email_verifications" ALTER COLUMN "token" SET DATA TYPE varchar(10);