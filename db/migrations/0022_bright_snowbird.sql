CREATE TABLE "subcategory_space_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"subcategory_id" integer NOT NULL,
	"target_org_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_system_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subcategory_space_mappings" ADD CONSTRAINT "subcategory_space_mappings_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategory_space_mappings" ADD CONSTRAINT "subcategory_space_mappings_target_org_id_organizations_id_fk" FOREIGN KEY ("target_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategory_space_mappings" ADD CONSTRAINT "subcategory_space_mappings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategory_space_mappings" ADD CONSTRAINT "subcategory_space_mappings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subcategory_space_mappings_subcategory_target_org_unique" ON "subcategory_space_mappings" USING btree ("subcategory_id","target_org_id");--> statement-breakpoint
CREATE INDEX "subcategory_space_mappings_target_org_id_idx" ON "subcategory_space_mappings" USING btree ("target_org_id");--> statement-breakpoint
CREATE INDEX "subcategory_space_mappings_subcategory_id_idx" ON "subcategory_space_mappings" USING btree ("subcategory_id");--> statement-breakpoint
CREATE INDEX "subcategory_space_mappings_category_id_idx" ON "subcategory_space_mappings" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_org_type_system_default_unique" ON "categories" USING btree ("org_id","type") WHERE "categories"."is_system_default";--> statement-breakpoint
CREATE INDEX "finance_transactions_subcategory_id_idx" ON "finance_transactions" USING btree ("subcategory_id");