ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_subcategory_id_subcategories_id_fk";
--> statement-breakpoint
ALTER TABLE "finance_transactions" ALTER COLUMN "subcategory_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE no action ON UPDATE no action;