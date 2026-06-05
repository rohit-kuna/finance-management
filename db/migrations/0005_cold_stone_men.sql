ALTER TABLE "expenses" RENAME COLUMN "occurred_at" TO "transaction_timestamp";--> statement-breakpoint
DROP INDEX "expenses_exact_duplicate_unique";--> statement-breakpoint
DROP INDEX "expenses_occurred_at_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_exact_duplicate_unique" ON "expenses" USING btree ("amt","user_id","category_id",coalesce("note", ''),"transaction_timestamp");--> statement-breakpoint
CREATE INDEX "expenses_occurred_at_idx" ON "expenses" USING btree ("transaction_timestamp");