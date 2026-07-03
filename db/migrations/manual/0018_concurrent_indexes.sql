-- Run manually against Supabase (SQL editor or psql) AFTER `npm run drizzle-migrate`
-- has applied 0018_lame_molecule_man.sql (which drops the 7 redundant indexes).
--
-- CONCURRENTLY cannot run inside a transaction, and drizzle-kit's migrate command
-- wraps each migration file in one — so these two indexes are kept out of the
-- auto-applied migration and must be created here, one statement at a time,
-- each as its own top-level command (no BEGIN/COMMIT wrapper).

CREATE INDEX CONCURRENTLY IF NOT EXISTS "finance_transactions_org_id_transaction_timestamp_idx"
  ON "finance_transactions" USING btree ("org_id", "transaction_timestamp" DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "finance_transactions_org_id_user_id_idx"
  ON "finance_transactions" USING btree ("org_id", "user_id");
