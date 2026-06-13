ALTER TABLE "transaction_subcategories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "transaction_subcategories" CASCADE;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD COLUMN "subcategory_id" integer;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "finance_transactions_subcategory_id_idx" ON "finance_transactions" USING btree ("subcategory_id");