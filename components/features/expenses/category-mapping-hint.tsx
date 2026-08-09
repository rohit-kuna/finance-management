import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceCategoryRecordDto, UserCategoryRecordDto } from "@/app/lib/finance.types";

// Reference-only hint: shows this user's own User Categories grouped under
// their Space Categories, so they know what to pick when adding a
// transaction. `userCategories` must always be scoped to the current user —
// User Categories are private, never another member's, regardless of which
// space (personal/shared) or scope toggle is active.
export function CategoryMappingHint({
  spaceCategories,
  userCategories,
}: {
  spaceCategories: SpaceCategoryRecordDto[];
  userCategories: UserCategoryRecordDto[];
}) {
  if (!userCategories.length) return null;

  const groups = new Map<number | null, UserCategoryRecordDto[]>();
  groups.set(null, []);
  for (const spaceCategory of spaceCategories) groups.set(spaceCategory.id, []);
  for (const userCategory of userCategories) {
    const bucket = groups.get(userCategory.spaceCategoryId) ?? groups.get(null)!;
    bucket.push(userCategory);
  }

  const mappedGroups = spaceCategories
    .map((spaceCategory) => ({ spaceCategory, userCategories: groups.get(spaceCategory.id) ?? [] }))
    .filter((group) => group.userCategories.length);
  const unmapped = groups.get(null) ?? [];

  if (!mappedGroups.length && !unmapped.length) return null;

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-lg tracking-tight">Your Category Mapping</CardTitle>
        <p className="text-sm text-muted-foreground">
          A quick reference for how your user categories map into space categories.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        {mappedGroups.map((group) => (
          <div key={group.spaceCategory.id} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.spaceCategory.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.userCategories.map((userCategory) => (
                <Badge key={userCategory.id} variant="outline">
                  {userCategory.name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        {unmapped.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unmapped</p>
            <div className="flex flex-wrap gap-2">
              {unmapped.map((userCategory) => (
                <Badge key={userCategory.id} variant="secondary" className="text-muted-foreground">
                  {userCategory.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
