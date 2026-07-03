-- Cheap, instant metadata-only drops of 7 unused/redundant single-column indexes
-- (verified against real query usage — see db/migrations/manual/0018_concurrent_indexes.sql
-- for the composite indexes replacing them).
DROP INDEX "finance_transactions_org_id_idx";--> statement-breakpoint
DROP INDEX "finance_transactions_user_id_idx";--> statement-breakpoint
DROP INDEX "finance_transactions_counter_party_id_idx";--> statement-breakpoint
DROP INDEX "finance_transactions_transaction_mode_id_idx";--> statement-breakpoint
DROP INDEX "finance_transactions_subcategory_id_idx";--> statement-breakpoint
DROP INDEX "finance_transactions_transfer_status_idx";--> statement-breakpoint
DROP INDEX "finance_transactions_occurred_at_idx";