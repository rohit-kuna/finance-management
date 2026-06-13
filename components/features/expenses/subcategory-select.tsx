"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { createSubcategoryInline } from "@/app/actions/auth-roles/subcategories.actions";
import type { SubcategoryRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SubcategorySelect({
  subcategories,
  name,
  defaultSelectedId = null,
  categoryId,
}: {
  subcategories: SubcategoryRecordDto[];
  name: string;
  defaultSelectedId?: number | null;
  categoryId?: number | null;
}) {
  const [localSubcategories, setLocalSubcategories] = useState<SubcategoryRecordDto[]>(subcategories);
  const [selectedId, setSelectedId] = useState<number | null>(defaultSelectedId);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSubcategories(subcategories);
  }, [subcategories]);

  useEffect(() => {
    setSelectedId((current) =>
      current != null && localSubcategories.some((subcategory) => subcategory.id === current && subcategory.categoryId === categoryId)
        ? current
        : null
    );
  }, [categoryId, localSubcategories]);

  const categorySubcategories = useMemo(
    () => localSubcategories.filter((subcategory) => subcategory.categoryId === categoryId),
    [localSubcategories, categoryId]
  );

  const selectedSubcategory = useMemo(
    () => categorySubcategories.find((subcategory) => subcategory.id === selectedId) ?? null,
    [selectedId, categorySubcategories]
  );

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    return categorySubcategories.filter((subcategory) => {
      if (subcategory.id === selectedId) return false;
      if (!loweredQuery) return true;
      return subcategory.name.toLowerCase().includes(loweredQuery);
    });
  }, [categorySubcategories, selectedId, loweredQuery]);

  const canCreate =
    Boolean(categoryId) &&
    trimmedQuery.length >= 2 &&
    !categorySubcategories.some((subcategory) => subcategory.name.toLowerCase() === loweredQuery);

  function selectSubcategory(subcategoryId: number) {
    setSelectedId(subcategoryId);
    setQuery("");
    setIsOpen(false);
  }

  function clearSubcategory() {
    setSelectedId(null);
  }

  function handleCreateSubcategory() {
    if (!trimmedQuery || isCreating || !categoryId) return;
    setCreateError(null);
    const name = trimmedQuery;

    startCreating(async () => {
      const result = await createSubcategoryInline(categoryId, name);

      if ("error" in result) {
        setCreateError(result.error);
        return;
      }

      setLocalSubcategories((current) =>
        current.some((subcategory) => subcategory.id === result.subcategory.id)
          ? current
          : [result.subcategory, ...current]
      );
      selectSubcategory(result.subcategory.id);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !query && selectedId != null) {
      clearSubcategory();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const exactMatch = suggestions.find((subcategory) => subcategory.name.toLowerCase() === loweredQuery);
      if (exactMatch) {
        selectSubcategory(exactMatch.id);
      } else if (canCreate) {
        handleCreateSubcategory();
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

  const disabled = !categoryId;

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {selectedId != null ? <input type="hidden" name={name} value={selectedId} /> : null}
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedSubcategory ? (
          <Badge variant="secondary" className="gap-1 pr-1">
            {selectedSubcategory.name}
            <button
              type="button"
              onClick={() => clearSubcategory()}
              className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${selectedSubcategory.name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ) : null}
        <input
          type="text"
          value={query}
          disabled={disabled || Boolean(selectedSubcategory)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Select a category first"
              : selectedSubcategory
                ? ""
                : "Type to find a subcategory..."
          }
          className="h-7 min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {isOpen && !disabled && !selectedSubcategory && (suggestions.length || canCreate) ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {suggestions.map((subcategory) => (
            <li key={subcategory.id}>
              <button
                type="button"
                onClick={() => selectSubcategory(subcategory.id)}
                className={cn(
                  "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {subcategory.name}
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateSubcategory}
                className={cn(
                  "block w-full rounded-sm px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isCreating ? "Creating..." : `Create "${trimmedQuery}"`}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {createError ? <p className="mt-1 text-xs text-destructive">{createError}</p> : null}
    </div>
  );
}
