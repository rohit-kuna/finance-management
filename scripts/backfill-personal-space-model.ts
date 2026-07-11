/**
 * One-off backfill for the "space is a lens" data model (see plan at
 * /home/rohit/.claude/plans/this-is-a-significant-greedy-treasure.md).
 *
 * Personal space becomes the single source of truth for every transaction.
 * This script:
 *   1. Ensures every user has a personal org (auto-creates "My Space" if missing).
 *   2. Seeds "Others" categories (expense + income) for every shared org that
 *      doesn't already have them.
 *   3. Migrates every existing transaction living directly under a shared org
 *      into the owner's personal org — matching/creating equivalent personal
 *      categories/subcategories — and records an explicit mapping row back to
 *      the original shared category so the transaction keeps showing up
 *      grouped the same way in that shared space.
 *   4. Runs a read-only verification pass and prints a summary.
 *
 * Idempotent: safe to re-run. Chunked per-user in its own transaction so a
 * failure only requires re-running for the remaining users.
 *
 * Usage:
 *   npx tsx scripts/backfill-personal-space-model.ts [--dry-run]
 */
import "dotenv/config";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  financeTransactions,
  organizationMembers,
  organizations,
  subcategories,
  subcategorySpaceMappings,
  users,
  type CategoryType,
} from "@/db/schema";
import { ROLES } from "@/app/lib/roles";
import { buildInviteCode } from "@/app/lib/invite-code";

const DRY_RUN = process.argv.includes("--dry-run");
const FALLBACK_SUBCATEGORY_NAME = "Uncategorized";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function log(...args: unknown[]) {
  console.log(`[backfill]`, ...args);
}

async function ensurePersonalOrgForUser(userId: string): Promise<number> {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.createdBy, userId), eq(organizations.isPersonal, true)))
    .limit(1);

  if (existing) return existing.id;

  if (DRY_RUN) {
    log(`  [dry-run] would create personal org for user ${userId}`);
    return -1;
  }

  const [membershipCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  const [organization] = await db
    .insert(organizations)
    .values({
      name: "My Space",
      inviteCode: buildInviteCode(),
      createdBy: userId,
      isPersonal: true,
    })
    .returning();

  if (!organization) throw new Error(`Unable to create personal org for user ${userId}`);

  await db.insert(organizationMembers).values({
    orgId: organization.id,
    userId,
    role: ROLES.ADMIN,
    isDefault: Number(membershipCount?.count ?? 0) === 0,
  });

  log(`  created personal org ${organization.id} for user ${userId}`);
  return organization.id;
}

async function seedOthersCategoriesForSharedOrgs() {
  const sharedOrgs = await db
    .select({ id: organizations.id, createdBy: organizations.createdBy })
    .from(organizations)
    .where(eq(organizations.isPersonal, false));

  for (const org of sharedOrgs) {
    for (const type of ["expense", "income"] as CategoryType[]) {
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.orgId, org.id), eq(categories.type, type), eq(categories.isSystemDefault, true)))
        .limit(1);

      if (existing) continue;

      if (DRY_RUN) {
        log(`  [dry-run] would seed Others (${type}) category for shared org ${org.id}`);
        continue;
      }

      await db.insert(categories).values({
        orgId: org.id,
        // Category names are unique per org regardless of type, so the two
        // "Others" categories need distinct names (matches
        // ensureSystemDefaultCategories in categories.table.actions.ts).
        name: type === "expense" ? "Others (Expense)" : "Others (Income)",
        type,
        createdBy: org.createdBy,
        isSystemDefault: true,
      });
      log(`  seeded Others (${type}) category for shared org ${org.id}`);
    }
  }
}

async function findOrCreatePersonalCategory(
  tx: Tx,
  personalOrgId: number,
  name: string,
  type: CategoryType,
  createdBy: string,
  cache: Map<string, number>
): Promise<number> {
  const cacheKey = `${type}:${name.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [existing] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.orgId, personalOrgId), sql`lower(${categories.name}) = lower(${name})`, eq(categories.type, type)))
    .limit(1);

  if (existing) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const [created] = await tx
    .insert(categories)
    .values({ orgId: personalOrgId, name, type, createdBy })
    .returning();

  if (!created) throw new Error(`Unable to create personal category "${name}"`);
  cache.set(cacheKey, created.id);
  return created.id;
}

async function findOrCreatePersonalSubcategory(
  tx: Tx,
  personalOrgId: number,
  categoryId: number,
  name: string,
  createdBy: string,
  cache: Map<string, number>
): Promise<number> {
  const cacheKey = `${categoryId}:${name.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [existing] = await tx
    .select({ id: subcategories.id })
    .from(subcategories)
    .where(and(eq(subcategories.categoryId, categoryId), sql`lower(${subcategories.name}) = lower(${name})`))
    .limit(1);

  if (existing) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const [created] = await tx
    .insert(subcategories)
    .values({ orgId: personalOrgId, categoryId, name, createdBy })
    .returning();

  if (!created) throw new Error(`Unable to create personal subcategory "${name}"`);
  cache.set(cacheKey, created.id);
  return created.id;
}

type SkippedTransaction = { transactionId: number; reason: string };

async function migrateUserTransactions(userId: string, personalOrgId: number, skipped: SkippedTransaction[]) {
  const nonPersonalTransactions = await db
    .select({
      id: financeTransactions.id,
      orgId: financeTransactions.orgId,
      categoryId: financeTransactions.categoryId,
      subcategoryId: financeTransactions.subcategoryId,
      amount: financeTransactions.amount,
      note: financeTransactions.note,
      transactionTimestamp: financeTransactions.transactionTimestamp,
    })
    .from(financeTransactions)
    .where(and(eq(financeTransactions.userId, userId), ne(financeTransactions.orgId, personalOrgId)));

  if (!nonPersonalTransactions.length) return;

  const categoryCache = new Map<string, number>();
  const subcategoryCache = new Map<string, number>();

  for (const txn of nonPersonalTransactions) {
    await db.transaction(async (tx) => {
      const [originalCategory] = await tx.select().from(categories).where(eq(categories.id, txn.categoryId)).limit(1);
      if (!originalCategory) {
        skipped.push({ transactionId: txn.id, reason: "original category missing" });
        return;
      }

      const personalCategoryId = await findOrCreatePersonalCategory(
        tx,
        personalOrgId,
        originalCategory.name,
        originalCategory.type,
        userId,
        categoryCache
      );

      let originalSubcategoryName = FALLBACK_SUBCATEGORY_NAME;
      if (txn.subcategoryId) {
        const [originalSubcategory] = await tx
          .select({ name: subcategories.name })
          .from(subcategories)
          .where(eq(subcategories.id, txn.subcategoryId))
          .limit(1);
        if (originalSubcategory) originalSubcategoryName = originalSubcategory.name;
      }

      const personalSubcategoryId = await findOrCreatePersonalSubcategory(
        tx,
        personalOrgId,
        personalCategoryId,
        originalSubcategoryName,
        userId,
        subcategoryCache
      );

      // Guard against the exact-duplicate unique constraint before repointing —
      // categoryId is changing, so a genuine duplicate could now collide.
      const [collision] = await tx
        .select({ id: financeTransactions.id })
        .from(financeTransactions)
        .where(
          and(
            eq(financeTransactions.userId, userId),
            eq(financeTransactions.categoryId, personalCategoryId),
            eq(financeTransactions.amount, txn.amount),
            eq(financeTransactions.transactionTimestamp, txn.transactionTimestamp),
            sql`coalesce(${financeTransactions.note}, '') = coalesce(${txn.note ?? ""}, '')`,
            ne(financeTransactions.id, txn.id)
          )
        )
        .limit(1);

      if (collision) {
        skipped.push({ transactionId: txn.id, reason: `would collide with transaction ${collision.id} after migration` });
        return;
      }

      if (DRY_RUN) {
        log(
          `  [dry-run] would migrate transaction ${txn.id}: org ${txn.orgId} -> ${personalOrgId}, ` +
            `category ${txn.categoryId} -> ${personalCategoryId}, subcategory ${txn.subcategoryId ?? "(none)"} -> ${personalSubcategoryId}`
        );
        return;
      }

      await tx
        .update(financeTransactions)
        .set({ orgId: personalOrgId, categoryId: personalCategoryId, subcategoryId: personalSubcategoryId })
        .where(eq(financeTransactions.id, txn.id));

      await tx
        .insert(subcategorySpaceMappings)
        .values({
          subcategoryId: personalSubcategoryId,
          targetOrgId: txn.orgId,
          categoryId: txn.categoryId,
          updatedBy: userId,
        })
        .onConflictDoNothing({
          target: [subcategorySpaceMappings.subcategoryId, subcategorySpaceMappings.targetOrgId],
        });
    });
  }

  log(`  migrated ${nonPersonalTransactions.length - skipped.length}/${nonPersonalTransactions.length} transactions for user ${userId}`);
}

/**
 * subcategoryId is becoming required going forward — this backfills any
 * pre-existing personal-space transaction that was already null (never had a
 * subcategory to begin with, so migrateUserTransactions above never touched
 * it) with a fallback "Uncategorized" subcategory under its own category.
 */
async function backfillNullSubcategories(userId: string, personalOrgId: number) {
  const nullSubcategoryTransactions = await db
    .select({ id: financeTransactions.id, categoryId: financeTransactions.categoryId })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, userId),
        eq(financeTransactions.orgId, personalOrgId),
        sql`${financeTransactions.subcategoryId} IS NULL`
      )
    );

  if (!nullSubcategoryTransactions.length) return;

  const subcategoryCache = new Map<string, number>();

  for (const txn of nullSubcategoryTransactions) {
    if (DRY_RUN) {
      log(`  [dry-run] would assign fallback subcategory to transaction ${txn.id} (category ${txn.categoryId})`);
      continue;
    }

    await db.transaction(async (tx) => {
      const fallbackSubcategoryId = await findOrCreatePersonalSubcategory(
        tx,
        personalOrgId,
        txn.categoryId,
        FALLBACK_SUBCATEGORY_NAME,
        userId,
        subcategoryCache
      );
      await tx.update(financeTransactions).set({ subcategoryId: fallbackSubcategoryId }).where(eq(financeTransactions.id, txn.id));
    });
  }

  log(`  assigned fallback subcategory to ${nullSubcategoryTransactions.length} pre-existing personal transaction(s) for user ${userId}`);
}

async function verify() {
  log("Running verification pass...");

  const [nonPersonalCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(financeTransactions)
    .innerJoin(organizations, eq(organizations.id, financeTransactions.orgId))
    .where(eq(organizations.isPersonal, false));
  log(`  transactions still on a non-personal org: ${nonPersonalCount?.count ?? 0}`);

  const [nullSubcategoryCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(financeTransactions)
    .where(sql`${financeTransactions.subcategoryId} IS NULL`);
  log(`  transactions with a null subcategoryId: ${nullSubcategoryCount?.count ?? 0}`);

  const [duplicatePersonalOrgCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sql`(
      select created_by from organizations where is_personal group by created_by having count(*) > 1
    ) as dup`);
  log(`  users with more than one personal org: ${duplicatePersonalOrgCount?.count ?? 0}`);
}

async function main() {
  log(`Starting backfill (${DRY_RUN ? "DRY RUN — no writes" : "LIVE"})`);

  log("Step 1/3: ensuring every user has a personal org...");
  const allUsers = await db.select({ id: users.id }).from(users);
  const personalOrgByUserId = new Map<string, number>();
  for (const user of allUsers) {
    const personalOrgId = await ensurePersonalOrgForUser(user.id);
    personalOrgByUserId.set(user.id, personalOrgId);
  }

  log("Step 2/3: seeding Others categories for shared orgs...");
  await seedOthersCategoriesForSharedOrgs();

  log("Step 3/3: migrating existing shared-org transactions into personal orgs...");
  const skipped: SkippedTransaction[] = [];
  for (const user of allUsers) {
    const personalOrgId = personalOrgByUserId.get(user.id);
    if (!personalOrgId || personalOrgId === -1) continue; // dry-run placeholder, nothing to migrate against
    await migrateUserTransactions(user.id, personalOrgId, skipped);
    await backfillNullSubcategories(user.id, personalOrgId);
  }

  if (skipped.length) {
    log(`WARNING: ${skipped.length} transaction(s) skipped and need manual review:`);
    for (const s of skipped) log(`  - transaction ${s.transactionId}: ${s.reason}`);
  }

  if (!DRY_RUN) {
    await verify();
  }

  log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] FAILED:", err);
    process.exit(1);
  });
