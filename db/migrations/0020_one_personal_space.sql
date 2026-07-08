ALTER TABLE "organizations" ADD COLUMN "is_personal" boolean DEFAULT false NOT NULL;--> statement-breakpoint

WITH ranked_organizations AS (
  SELECT
    id,
    created_by,
    row_number() OVER (PARTITION BY created_by ORDER BY created_at, id) AS rn
  FROM "organizations"
),
personal_candidates AS (
  SELECT ranked_organizations.id
  FROM ranked_organizations
  JOIN "users" ON "users".id = ranked_organizations.created_by
  WHERE ranked_organizations.rn = 1
    AND "users".scope = 'personal'
)
UPDATE "organizations"
SET "is_personal" = true
FROM personal_candidates
WHERE "organizations".id = personal_candidates.id;--> statement-breakpoint

CREATE UNIQUE INDEX "organizations_personal_created_by_unique" ON "organizations" ("created_by") WHERE "is_personal";
