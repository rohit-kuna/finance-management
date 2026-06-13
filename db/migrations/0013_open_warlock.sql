ALTER TABLE "category_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "category_tags" CASCADE;--> statement-breakpoint
ALTER TABLE "tags" RENAME TO "subcategories";--> statement-breakpoint
ALTER TABLE "transaction_tags" RENAME TO "transaction_subcategories";--> statement-breakpoint
ALTER TABLE "transaction_subcategories" RENAME COLUMN "tag_id" TO "subcategory_id";--> statement-breakpoint
ALTER TABLE "subcategories" DROP CONSTRAINT "tags_org_name_unique";--> statement-breakpoint
ALTER TABLE "subcategories" DROP CONSTRAINT "tags_org_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "subcategories" DROP CONSTRAINT "tags_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_subcategories" DROP CONSTRAINT "transaction_tags_transaction_id_finance_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_subcategories" DROP CONSTRAINT "transaction_tags_tag_id_tags_id_fk";
--> statement-breakpoint
DROP INDEX "tags_org_id_idx";--> statement-breakpoint
DROP INDEX "transaction_tags_tag_id_idx";--> statement-breakpoint
ALTER TABLE "transaction_subcategories" DROP CONSTRAINT "transaction_tags_transaction_id_tag_id_pk";--> statement-breakpoint
ALTER TABLE "transaction_subcategories" ADD CONSTRAINT "transaction_subcategories_transaction_id_subcategory_id_pk" PRIMARY KEY("transaction_id","subcategory_id");--> statement-breakpoint
ALTER TABLE "subcategories" ADD COLUMN "category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_subcategories" ADD CONSTRAINT "transaction_subcategories_transaction_id_finance_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."finance_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_subcategories" ADD CONSTRAINT "transaction_subcategories_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subcategories_org_id_idx" ON "subcategories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "subcategories_category_id_idx" ON "subcategories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transaction_subcategories_subcategory_id_idx" ON "transaction_subcategories" USING btree ("subcategory_id");--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_name_unique" UNIQUE("category_id","name");