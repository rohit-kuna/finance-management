"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { X } from "lucide-react";
import { unmapSubcategoryAction, updateSubcategoryMappingAction } from "@/app/actions/auth-roles/subcategory-mapping.actions";
import type { SubcategoryMappingRowDto } from "@/app/actions/auth-roles/subcategory-mapping.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { CategoryRecordDto } from "@/app/lib/finance.types";
import { cn } from "@/lib/utils";

/**
 * Chip-style mapping cell for a shared space's Categories page — mirrors
 * SubcategoryChipCell's interaction pattern (chips + type-to-search +
 * reassign), but operates over the current user's own mapping rows rather
 * than subcategory records, and never creates anything (subcategories are
 * only ever created in personal space). `category: null` renders the
 * Uncategorized bucket — subcategories with no explicit mapping row for this
 * space, bucketed by the explicit mapping, not the read-time Others fallback.
 */
export function SpaceMappingChipCell({
  category,
  targetOrgId,
  myRows,
  categoriesById,
  readOnly = false,
}: {
  category: CategoryRecordDto | null;
  targetOrgId: number;
  myRows: SubcategoryMappingRowDto[];
  categoriesById: Map<number, CategoryRecordDto>;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReassign, setPendingReassign] = useState<SubcategoryMappingRowDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chipsForBucket = useMemo(
    () => myRows.filter((row) => (category ? row.mappedCategoryId === category.id : row.mappedCategoryId === null)),
    [myRows, category]
  );

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    if (!loweredQuery) return [];
    return myRows
      .filter((row) => (category ? row.mappedCategoryId !== category.id : row.mappedCategoryId !== null))
      .filter((row) => row.subcategoryName.toLowerCase().includes(loweredQuery));
  }, [myRows, loweredQuery, category]);

  function resetQuery() {
    setQuery("");
    setPendingReassign(null);
    setActionError(null);
  }

  function fromLabel(row: SubcategoryMappingRowDto) {
    if (row.mappedCategoryId === null) return "Uncategorized";
    return categoriesById.get(row.mappedCategoryId)?.name ?? "another category";
  }

  function handleSelectSuggestion(row: SubcategoryMappingRowDto) {
    setActionError(null);
    setPendingReassign(row);
  }

  function confirmReassign() {
    if (!pendingReassign || isPending) return;
    setActionError(null);

    const formData = new FormData();
    formData.append("subcategoryId", String(pendingReassign.subcategoryId));
    formData.append("targetOrgId", String(targetOrgId));
    if (category) {
      formData.append("categoryId", String(category.id));
    }

    startTransition(async () => {
      const result = category
        ? await updateSubcategoryMappingAction(financeInitialState, formData)
        : await unmapSubcategoryAction(financeInitialState, formData);

      if (result.error) {
        setActionError(result.error);
        return;
      }
      resetQuery();
    });
  }

  function unmapChip(row: SubcategoryMappingRowDto) {
    if (isPending) return;
    setActionError(null);

    const formData = new FormData();
    formData.append("subcategoryId", String(row.subcategoryId));
    formData.append("targetOrgId", String(targetOrgId));

    startTransition(async () => {
      const result = await unmapSubcategoryAction(financeInitialState, formData);
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

  if (readOnly) {
    return (
      <div className="flex min-w-56 flex-wrap gap-1.5 opacity-50 sm:min-w-64">
        {chipsForBucket.map((row) => (
          <span
            key={row.subcategoryId}
            className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {row.subcategoryName}
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
        {chipsForBucket.map((row) => (
          <span
            key={row.subcategoryId}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {row.subcategoryName}
            {category ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  unmapChip(row);
                }}
                disabled={isPending}
                className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                aria-label={`Unmap ${row.subcategoryName}`}
              >
                <X className="size-3" />
              </button>
            ) : null}
          </span>
        ))}
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
          placeholder={chipsForBucket.length ? "" : category ? "Assign a subcategory..." : "Pull a subcategory back here..."}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {isOpen ? (
        <ul className="absolute z-10 mt-1 w-full min-w-64 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {pendingReassign ? (
            <li className="space-y-2 p-2">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{pendingReassign.subcategoryName}</span> is currently{" "}
                <span className="font-medium text-foreground">{fromLabel(pendingReassign)}</span>. Move to{" "}
                <span className="font-medium text-foreground">{category ? category.name : "Uncategorized"}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={confirmReassign}
                  className="rounded-sm bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Moving..." : "Move"}
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
              {suggestions.map((row) => (
                <li key={row.subcategoryId}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(row)}
                    className={cn(
                      "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {row.subcategoryName}
                    <span className="ml-1 text-xs text-muted-foreground">({fromLabel(row)})</span>
                  </button>
                </li>
              ))}
              {!suggestions.length && trimmedQuery ? (
                <li className="px-2 py-1.5 text-muted-foreground">No matches</li>
              ) : null}
              {!trimmedQuery && !suggestions.length ? (
                <li className="px-2 py-1.5 text-muted-foreground">Type to find a subcategory to move here...</li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
      {actionError ? <p className="mt-1 text-xs text-destructive">{actionError}</p> : null}
    </div>
  );
}
