ALTER TABLE "categories" ADD COLUMN "type" varchar(10) DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "transferred_to";