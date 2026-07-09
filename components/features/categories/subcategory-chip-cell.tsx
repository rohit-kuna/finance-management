"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  createSubcategoryInline,
  deleteSubcategoryAction,
  updateSubcategoryAction,
} from "@/app/actions/auth-roles/subcategories.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { CategoryRecordDto, SubcategoryRecordDto } from "@/app/lib/finance.types";
import { ROUTES } from "@/app/lib/constants";
import { cn } from "@/lib/utils";

function canManageSubcategory(
  subcategory: SubcategoryRecordDto,
  currentUserId: string,
  isAdmin: boolean
) {
  return isAdmin || subcategory.createdBy === currentUserId;
}

export function SubcategoryChipCell({
  category,
  allSubcategories,
  categoriesById,
  currentUserId,
  isAdmin,
  disabled = false,
}: {
  category: CategoryRecordDto;
  allSubcategories: SubcategoryRecordDto[];
  categoriesById: Map<number, CategoryRecordDto>;
  currentUserId: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const [localAdditions, setLocalAdditions] = useState<SubcategoryRecordDto[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReassign, setPendingReassign] = useState<{
    subcategory: SubcategoryRecordDto;
    fromCategory: CategoryRecordDto | undefined;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const orgSubcategories = useMemo(() => {
    const serverIds = new Set(allSubcategories.map((s) => s.id));
    const additions = localAdditions.filter((s) => !serverIds.has(s.id));
    return additions.length ? [...additions, ...allSubcategories] : allSubcategories;
  }, [allSubcategories, localAdditions]);

  const chipsForCategory = useMemo(
    () => orgSubcategories.filter((s) => s.categoryId === category.id),
    [orgSubcategories, category.id]
  );

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const exactMatchAnywhere = useMemo(
    () => orgSubcategories.find((s) => s.name.toLowerCase() === loweredQuery),
    [orgSubcategories, loweredQuery]
  );

  const suggestions = useMemo(() => {
    if (!loweredQuery) return [];
    return orgSubcategories
      .filter((s) => s.categoryId !== category.id)
      .filter((s) => s.name.toLowerCase().includes(loweredQuery));
  }, [orgSubcategories, loweredQuery, category.id]);

  const canCreate = trimmedQuery.length >= 2 && !exactMatchAnywhere;

  function resetQuery() {
    setQuery("");
    setPendingReassign(null);
    setActionError(null);
  }

  function addChipOptimistically(subcategory: SubcategoryRecordDto) {
    setLocalAdditions((current) =>
      current.some((s) => s.id === subcategory.id) ? current : [subcategory, ...current]
    );
  }

  function handleCreateNew() {
    if (!trimmedQuery || isPending) return;
    setActionError(null);
    const name = trimmedQuery;

    startTransition(async () => {
      const result = await createSubcategoryInline(category.id, name);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      addChipOptimistically(result.subcategory);
      resetQuery();
    });
  }

  function handleSelectSuggestion(subcategory: SubcategoryRecordDto) {
    if (subcategory.categoryId === category.id) {
      resetQuery();
      return;
    }

    if (!canManageSubcategory(subcategory, currentUserId, isAdmin)) {
      setActionError("You can only reassign subcategories you created");
      return;
    }

    setActionError(null);
    setPendingReassign({
      subcategory,
      fromCategory: categoriesById.get(subcategory.categoryId),
    });
  }

  function confirmReassign() {
    if (!pendingReassign || isPending) return;
    setActionError(null);

    const formData = new FormData();
    formData.append("subcategoryId", String(pendingReassign.subcategory.id));
    formData.append("name", pendingReassign.subcategory.name);
    formData.append("categoryId", String(category.id));
    formData.append("returnTo", ROUTES.CATEGORIES);

    startTransition(async () => {
      const result = await updateSubcategoryAction(financeInitialState, formData);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      resetQuery();
    });
  }

  function removeChip(subcategory: SubcategoryRecordDto) {
    if (!canManageSubcategory(subcategory, currentUserId, isAdmin) || isPending) return;
    setActionError(null);

    const formData = new FormData();
    formData.append("subcategoryId", String(subcategory.id));

    startTransition(async () => {
      const result = await deleteSubcategoryAction(financeInitialState, formData);
      if (result.error) {
        setActionError(result.error);
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      resetQuery();
      inputRef.current?.blur();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (pendingReassign) {
        confirmReassign();
        return;
      }
      if (exactMatchAnywhere) {
        handleSelectSuggestion(exactMatchAnywhere);
        return;
      }
      if (canCreate) {
        handleCreateNew();
      }
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node | null)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  if (disabled) {
    return (
      <div className="flex min-w-56 flex-wrap gap-1.5 opacity-50 sm:min-w-64">
        {chipsForCategory.map((subcategory) => (
          <span
            key={subcategory.id}
            className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {subcategory.name}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-56 sm:min-w-64" onBlur={handleBlur}>
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => inputRef.current?.focus()}
      >
        {chipsForCategory.map((subcategory) => {
          const canRemove = canManageSubcategory(subcategory, currentUserId, isAdmin);
          return (
            <span
              key={subcategory.id}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {subcategory.name}
              {canRemove ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeChip(subcategory);
                  }}
                  disabled={isPending}
                  className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                  aria-label={`Remove ${subcategory.name}`}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPendingReassign(null);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={chipsForCategory.length ? "" : "Add subcategory..."}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {isOpen ? (
        <ul className="absolute z-10 mt-1 w-full min-w-64 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {pendingReassign ? (
            <li className="space-y-2 p-2">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{pendingReassign.subcategory.name}</span> is under{" "}
                <span className="font-medium text-foreground">
                  {pendingReassign.fromCategory?.name ?? "another category"}
                </span>
                . Reassign to <span className="font-medium text-foreground">{category.name}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={confirmReassign}
                  className="rounded-sm bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Reassigning..." : "Reassign"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingReassign(null)}
                  className="rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </button>
              </div>
            </li>
          ) : (
            <>
              {suggestions.map((subcategory) => {
                const fromCategory = categoriesById.get(subcategory.categoryId);
                const reassignable = canManageSubcategory(subcategory, currentUserId, isAdmin);
                return (
                  <li key={subcategory.id}>
                    <button
                      type="button"
                      disabled={!reassignable}
                      onClick={() => handleSelectSuggestion(subcategory)}
                      title={reassignable ? undefined : "You can only reassign subcategories you created"}
                      className={cn(
                        "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      )}
                    >
                      {subcategory.name}
                      <span className="ml-1 text-xs text-muted-foreground">({fromCategory?.name ?? "other"})</span>
                    </button>
                  </li>
                );
              })}
              {canCreate ? (
                <li>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCreateNew}
                    className={cn(
                      "block w-full rounded-sm px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    {isPending ? "Creating..." : `Create "${trimmedQuery}"`}
                  </button>
                </li>
              ) : null}
              {!suggestions.length && !canCreate && trimmedQuery ? (
                <li className="px-2 py-1.5 text-muted-foreground">No matches</li>
              ) : null}
              {!trimmedQuery && !suggestions.length ? (
                <li className="px-2 py-1.5 text-muted-foreground">Type to find or create a subcategory...</li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
      {actionError ? <p className="mt-1 text-xs text-destructive">{actionError}</p> : null}
    </div>
  );
}
