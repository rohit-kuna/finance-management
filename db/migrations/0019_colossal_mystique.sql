ALTER TABLE "users" ADD COLUMN "scope" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_scope_check" CHECK ("users"."scope" IN ('personal', 'shared'));