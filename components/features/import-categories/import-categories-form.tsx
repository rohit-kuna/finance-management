"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  importSharedSpaceCategoriesAction,
  type ImportCategoriesDataDto,
} from "@/app/actions/auth-roles/user-category-mapping.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SharedSpaceOption = {
  orgId: number;
  name: string;
};

export function ImportCategoriesForm({
  sharedSpaces,
  selectedOrgId,
  importData,
}: {
  sharedSpaces: SharedSpaceOption[];
  selectedOrgId: number | null;
  importData: ImportCategoriesDataDto | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(importSharedSpaceCategoriesAction, financeInitialState);

  return (
    <div className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-xl tracking-tight">Choose a shared space</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          {sharedSpaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">You aren&apos;t a member of any shared spaces yet.</p>
          ) : (
            <select
              defaultValue={selectedOrgId ?? ""}
              onChange={(event) => {
                const orgId = event.target.value;
                router.push(orgId ? `/import-categories?orgId=${orgId}` : "/import-categories");
              }}
              className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a space…</option>
              {sharedSpaces.map((space) => (
                <option key={space.orgId} value={space.orgId}>
                  {space.name}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {importData ? (
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-xl tracking-tight">{importData.organizationName} categories</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            {importData.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">This space has no categories yet.</p>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="targetOrgId" value={importData.targetOrgId} />
                <ul className="space-y-2">
                  {importData.categories.map((category) => (
                    <li key={category.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`import-category-${category.id}`}
                        name="spaceCategoryId"
                        value={category.id}
                        defaultChecked={!category.alreadyExists}
                        disabled={category.alreadyExists}
                        className="h-4 w-4 rounded border-input"
                      />
                      <label htmlFor={`import-category-${category.id}`} className="text-sm">
                        {category.name}
                      </label>
                      {category.alreadyExists ? (
                        <span className="text-xs text-muted-foreground">Already in your personal space — skipped</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <Button type="submit" disabled={pending}>
                  {pending ? "Importing..." : "Import selected"}
                </Button>
                {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
