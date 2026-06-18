CREATE INDEX "budget_org_id_idx" ON "budget" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "budget_user_id_idx" ON "budget" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budget_category_id_idx" ON "budget" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "categories_org_id_idx" ON "categories" USING btree ("org_id");