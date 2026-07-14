export type ExpenseScope = "personal" | "shared";

export const ALL_MEMBERS = "all";

/**
 * Shared personal/shared/member-narrowing filter for shared-space views
 * (Transactions table, Analytics dashboard). "personal" always means "just
 * me"; "shared" means every member unless narrowed to one via selectedMemberId.
 */
export function filterByScope<T extends { userId: string }>(
  items: T[],
  currentUserId: string,
  scope: ExpenseScope,
  selectedMemberId: string
): T[] {
  if (scope === "personal") {
    return items.filter((item) => item.userId === currentUserId);
  }

  if (selectedMemberId === ALL_MEMBERS) {
    return items;
  }

  return items.filter((item) => item.userId === selectedMemberId);
}
