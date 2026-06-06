ALTER TABLE "expenses" RENAME TO "finance_transactions";--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "expenses_necessity_score_check";--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "expenses_org_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "expenses_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "expenses_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "expenses_counter_party_id_counter_party_id_fk";
--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "expenses_transaction_mode_id_transaction_modes_id_fk";
--> statement-breakpoint
DROP INDEX "expenses_exact_duplicate_unique";--> statement-breakpoint
DROP INDEX "expenses_org_id_idx";--> statement-breakpoint
DROP INDEX "expenses_user_id_idx";--> statement-breakpoint
DROP INDEX "expenses_category_id_idx";--> statement-breakpoint
DROP INDEX "expenses_counter_party_id_idx";--> statement-breakpoint
DROP INDEX "expenses_transaction_mode_id_idx";--> statement-breakpoint
DROP INDEX "expenses_transfer_status_idx";--> statement-breakpoint
DROP INDEX "expenses_occurred_at_idx";--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_counter_party_id_counter_party_id_fk" FOREIGN KEY ("counter_party_id") REFERENCES "public"."counter_party"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_transaction_mode_id_transaction_modes_id_fk" FOREIGN KEY ("transaction_mode_id") REFERENCES "public"."transaction_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finance_transactions_exact_duplicate_unique" ON "finance_transactions" USING btree ("amount","user_id","category_id",coalesce("note", ''),"transaction_timestamp");--> statement-breakpoint
CREATE INDEX "finance_transactions_org_id_idx" ON "finance_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_user_id_idx" ON "finance_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_category_id_idx" ON "finance_transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_counter_party_id_idx" ON "finance_transactions" USING btree ("counter_party_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_transaction_mode_id_idx" ON "finance_transactions" USING btree ("transaction_mode_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_transfer_status_idx" ON "finance_transactions" USING btree ("transfer_status");--> statement-breakpoint
CREATE INDEX "finance_transactions_occurred_at_idx" ON "finance_transactions" USING btree ("transaction_timestamp");--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_necessity_score_check" CHECK ("finance_transactions"."necessity_score" >= 1 AND "finance_transactions"."necessity_score" <= 5);