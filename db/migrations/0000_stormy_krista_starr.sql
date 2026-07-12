CREATE TABLE "budget" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" uuid,
	"space_category_id" integer NOT NULL,
	"scope" varchar(10) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_org_space_category_scope_period_unique" UNIQUE("org_id","space_category_id","scope","period_from","period_to"),
	CONSTRAINT "budget_user_space_category_period_unique" UNIQUE("user_id","space_category_id","period_from","period_to")
);
--> statement-breakpoint
CREATE TABLE "counter_party" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"org_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "counter_party_org_name_unique" UNIQUE("org_id","name")
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"counter_party_id" integer,
	"transaction_mode_id" integer,
	"user_category_id" integer NOT NULL,
	"transfer_status" varchar(10),
	"amount" numeric(12, 2) NOT NULL,
	"type" varchar(10) DEFAULT 'expense' NOT NULL,
	"necessity_score" smallint DEFAULT 0 NOT NULL,
	"note" text,
	"transaction_timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_transactions_necessity_score_check" CHECK ("finance_transactions"."necessity_score" IN (-1, 0, 1))
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"org_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"invite_code" varchar(64) NOT NULL,
	"created_by" uuid NOT NULL,
	"is_personal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "space_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"org_id" integer NOT NULL,
	"type" varchar(10) DEFAULT 'expense' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_categories_name_org_unique" UNIQUE("name","org_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"org_id" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_org_unique" UNIQUE("name","org_id")
);
--> statement-breakpoint
CREATE TABLE "transaction_modes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_modes_org_user_name_unique" UNIQUE("org_id","user_id","name")
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "user_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"org_id" integer NOT NULL,
	"space_category_id" integer,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_categories_org_name_unique" UNIQUE("org_id","name")
);
--> statement-breakpoint
CREATE TABLE "user_category_space_category_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_category_id" integer NOT NULL,
	"target_org_id" integer NOT NULL,
	"space_category_id" integer NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"scope" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_scope_check" CHECK ("users"."scope" IN ('personal', 'shared'))
);
--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_space_category_id_space_categories_id_fk" FOREIGN KEY ("space_category_id") REFERENCES "public"."space_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_party" ADD CONSTRAINT "counter_party_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_counter_party_id_counter_party_id_fk" FOREIGN KEY ("counter_party_id") REFERENCES "public"."counter_party"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_transaction_mode_id_transaction_modes_id_fk" FOREIGN KEY ("transaction_mode_id") REFERENCES "public"."transaction_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_user_category_id_user_categories_id_fk" FOREIGN KEY ("user_category_id") REFERENCES "public"."user_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_categories" ADD CONSTRAINT "space_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_categories" ADD CONSTRAINT "space_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_modes" ADD CONSTRAINT "transaction_modes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_modes" ADD CONSTRAINT "transaction_modes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_finance_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."finance_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_space_category_id_space_categories_id_fk" FOREIGN KEY ("space_category_id") REFERENCES "public"."space_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_space_category_mappings" ADD CONSTRAINT "user_category_space_category_mappings_user_category_id_user_categories_id_fk" FOREIGN KEY ("user_category_id") REFERENCES "public"."user_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_space_category_mappings" ADD CONSTRAINT "user_category_space_category_mappings_target_org_id_organizations_id_fk" FOREIGN KEY ("target_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_space_category_mappings" ADD CONSTRAINT "user_category_space_category_mappings_space_category_id_space_categories_id_fk" FOREIGN KEY ("space_category_id") REFERENCES "public"."space_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_space_category_mappings" ADD CONSTRAINT "user_category_space_category_mappings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_org_id_idx" ON "budget" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "budget_user_id_idx" ON "budget" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budget_space_category_id_idx" ON "budget" USING btree ("space_category_id");--> statement-breakpoint
CREATE INDEX "counter_party_org_id_idx" ON "counter_party" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_transactions_exact_duplicate_unique" ON "finance_transactions" USING btree ("amount","user_id","user_category_id",coalesce("note", ''),"transaction_timestamp");--> statement-breakpoint
CREATE INDEX "finance_transactions_user_category_id_idx" ON "finance_transactions" USING btree ("user_category_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_org_id_transaction_timestamp_idx" ON "finance_transactions" USING btree ("org_id","transaction_timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "finance_transactions_org_id_user_id_idx" ON "finance_transactions" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_user_default_unique" ON "organization_members" USING btree ("user_id") WHERE "organization_members"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_personal_created_by_unique" ON "organizations" USING btree ("created_by") WHERE "organizations"."is_personal";--> statement-breakpoint
CREATE INDEX "space_categories_org_id_idx" ON "space_categories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tags_org_id_idx" ON "tags" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_modes_org_user_default_unique" ON "transaction_modes" USING btree ("org_id","user_id") WHERE "transaction_modes"."is_default";--> statement-breakpoint
CREATE INDEX "transaction_modes_user_id_idx" ON "transaction_modes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_tags_transaction_id_idx" ON "transaction_tags" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_tags_tag_id_idx" ON "transaction_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "user_categories_org_id_idx" ON "user_categories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "user_categories_space_category_id_idx" ON "user_categories" USING btree ("space_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_category_space_category_mappings_user_category_target_org_unique" ON "user_category_space_category_mappings" USING btree ("user_category_id","target_org_id");--> statement-breakpoint
CREATE INDEX "user_category_space_category_mappings_target_org_id_idx" ON "user_category_space_category_mappings" USING btree ("target_org_id");--> statement-breakpoint
CREATE INDEX "user_category_space_category_mappings_user_category_id_idx" ON "user_category_space_category_mappings" USING btree ("user_category_id");--> statement-breakpoint
CREATE INDEX "user_category_space_category_mappings_space_category_id_idx" ON "user_category_space_category_mappings" USING btree ("space_category_id");--> statement-breakpoint
CREATE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");