ALTER TABLE "expenses" RENAME COLUMN "amt" TO "amount";--> statement-breakpoint
DROP INDEX "expenses_exact_duplicate_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_exact_duplicate_unique" ON "expenses" USING btree ("amount","user_id","category_id",coalesce("note", ''),"transaction_timestamp");