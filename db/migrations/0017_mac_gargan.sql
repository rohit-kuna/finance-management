ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_necessity_score_check";--> statement-breakpoint
UPDATE "finance_transactions" SET "necessity_score" = CASE WHEN "necessity_score" = 1 THEN -1 WHEN "necessity_score" IN (2, 3) THEN 0 WHEN "necessity_score" IN (4, 5) THEN 1 ELSE 0 END;--> statement-breakpoint
ALTER TABLE "finance_transactions" ALTER COLUMN "necessity_score" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_necessity_score_check" CHECK ("finance_transactions"."necessity_score" IN (-1, 0, 1));