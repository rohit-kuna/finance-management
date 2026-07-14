"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createUserCategoryInline } from "@/app/actions/auth-roles/user-categories.actions";
import { createSpaceCategoryInline } from "@/app/actions/auth-roles/organization-finance.actions";
import type { SpaceCategoryRecordDto, UserCategoryRecordDto } from "@/app/lib/finance.types";
import type { CategoryType } from "@/db/schema";
import { cn } from "@/lib/utils";

function CreateUserCategoryRow({
  query,
  disabled,
  onCreate,
}: {
  query: string;
  disabled?: boolean;
  onCreate: (name: string) => void;
}) {
  if (query.length < 2 || disabled) return null;

  return (
    <button
      type="button"
      onClick={() => onCreate(query)}
      className="block w-full rounded-sm px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {`Create "${query}"`}
    </button>
  );
}

type Suggestion =
  | { kind: "space"; item: SpaceCategoryRecordDto }
  | { kind: "user"; item: UserCategoryRecordDto; spaceCategory: SpaceCategoryRecordDto };

function CreateSpaceCategoryRow({
  query,
  onCreate,
}: {
  query: string;
  onCreate: (name: string, type: CategoryType) => void;
}) {
  const [type, setType] = useState<CategoryType>("expense");

  if (query.length < 2) return null;

  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <button
        type="button"
        onClick={() => onCreate(query, type)}
        className="flex-1 rounded-sm px-1.5 py-1.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {`Add "${query}" ›`}
      </button>
      <select
        value={type}
        onChange={(event) => setType(event.target.value as CategoryType)}
        onClick={(event) => event.stopPropagation()}
        className="h-7 shrink-0 rounded-md border border-input bg-background px-1 text-xs"
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
    </div>
  );
}

/**
 * Single cascading field for picking a transaction's category: type to
 * search/create a SpaceCategory first (implicitly setting the transaction's
 * type from it); once picked it collapses into a chip prefix and the same
 * field switches to searching/creating a UserCategory scoped to it. A
 * UserCategory created here is mapped to the chosen SpaceCategory immediately
 * — this is the explicit "place a transaction in a category" flow, distinct
 * from the Kanban board's "+ New" flow where new UserCategories always start
 * Unmapped. Backspace on an empty query (or the chip's × button) clears the
 * SpaceCategory choice and drops back to the first step.
 */
export function TransactionCategorySelect({
  spaceCategories,
  userCategories,
  defaultUserCategoryId = null,
  onChange,
}: {
  spaceCategories: SpaceCategoryRecordDto[];
  userCategories: UserCategoryRecordDto[];
  defaultUserCategoryId?: number | null;
  onChange?: (state: { userCategoryId: number | null; type: CategoryType | null }) => void;
}) {
  const [localSpaceCategories, setLocalSpaceCategories] = useState<SpaceCategoryRecordDto[]>([]);
  const [localUserCategories, setLocalUserCategories] = useState<UserCategoryRecordDto[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultUserCategory = userCategories.find((c) => c.id === defaultUserCategoryId) ?? null;
  const [selectedSpaceCategoryId, setSelectedSpaceCategoryId] = useState<number | null>(
    defaultUserCategory?.spaceCategoryId ?? null
  );
  const [selectedUserCategoryId, setSelectedUserCategoryId] = useState<number | null>(defaultUserCategoryId);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const allSpaceCategories = useMemo(() => {
    const serverIds = new Set(spaceCategories.map((c) => c.id));
    const additions = localSpaceCategories.filter((c) => !serverIds.has(c.id));
    return additions.length ? [...additions, ...spaceCategories] : spaceCategories;
  }, [spaceCategories, localSpaceCategories]);

  const allUserCategories = useMemo(() => {
    const serverIds = new Set(userCategories.map((c) => c.id));
    const additions = localUserCategories.filter((c) => !serverIds.has(c.id));
    return additions.length ? [...additions, ...userCategories] : userCategories;
  }, [userCategories, localUserCategories]);

  const selectedSpaceCategory = allSpaceCategories.find((c) => c.id === selectedSpaceCategoryId) ?? null;
  const selectedUserCategory = allUserCategories.find((c) => c.id === selectedUserCategoryId) ?? null;
  const stage: "space" | "user" = selectedSpaceCategory ? "user" : "space";

  const userCategoryOptions = useMemo(
    () => allUserCategories.filter((c) => c.spaceCategoryId === selectedSpaceCategoryId),
    [allUserCategories, selectedSpaceCategoryId]
  );

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo<Suggestion[]>(() => {
    if (stage === "user") {
      const matches = loweredQuery
        ? userCategoryOptions.filter((item) => item.name.toLowerCase().includes(loweredQuery))
        : userCategoryOptions;
      return matches.map((item) => ({ kind: "user", item, spaceCategory: selectedSpaceCategory! }));
    }

    const spaceMatches: Suggestion[] = (
      loweredQuery ? allSpaceCategories.filter((item) => item.name.toLowerCase().includes(loweredQuery)) : allSpaceCategories
    ).map((item) => ({ kind: "space", item }));

    // While still picking the SpaceCategory, also surface existing
    // UserCategories whose name matches — shown with their full path —
    // so a query can jump straight to "Groceries › Kirana" without first
    // selecting Groceries.
    const userMatches: Suggestion[] = loweredQuery
      ? allUserCategories
          .filter((item) => item.spaceCategoryId != null && item.name.toLowerCase().includes(loweredQuery))
          .map((item) => {
            const spaceCategory = allSpaceCategories.find((c) => c.id === item.spaceCategoryId);
            return spaceCategory ? ({ kind: "user", item, spaceCategory } as Suggestion) : null;
          })
          .filter((suggestion): suggestion is Suggestion => suggestion != null)
      : [];

    return [...spaceMatches, ...userMatches];
  }, [stage, loweredQuery, allSpaceCategories, allUserCategories, userCategoryOptions, selectedSpaceCategory]);

  const canCreate =
    trimmedQuery.length >= 2 &&
    (stage === "space"
      ? !allSpaceCategories.some((item) => item.name.toLowerCase() === loweredQuery)
      : !userCategoryOptions.some((item) => item.name.toLowerCase() === loweredQuery));

  useEffect(() => {
    onChange?.({ userCategoryId: selectedUserCategoryId, type: selectedSpaceCategory?.type ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserCategoryId, selectedSpaceCategory?.type]);

  function openDropdown() {
    if (!containerRef.current) {
      setIsOpen(true);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    setIsOpen(true);
  }

  function handleFocus() {
    setQuery(stage === "user" ? selectedUserCategory?.name ?? "" : "");
    openDropdown();
  }

  function selectSpaceCategory(item: SpaceCategoryRecordDto) {
    setCreateError(null);
    setSelectedSpaceCategoryId(item.id);
    setSelectedUserCategoryId(null);
    setQuery("");
    setHighlightedIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectUserCategory(item: UserCategoryRecordDto, spaceCategory: SpaceCategoryRecordDto) {
    setCreateError(null);
    setSelectedSpaceCategoryId(spaceCategory.id);
    setSelectedUserCategoryId(item.id);
    setQuery("");
    setIsOpen(false);
  }

  function pickSuggestion(suggestion: Suggestion) {
    if (suggestion.kind === "space") {
      selectSpaceCategory(suggestion.item);
    } else {
      selectUserCategory(suggestion.item, suggestion.spaceCategory);
    }
  }

  function clearSpaceCategory() {
    setCreateError(null);
    setSelectedSpaceCategoryId(null);
    setSelectedUserCategoryId(null);
    setQuery("");
    setHighlightedIndex(-1);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      openDropdown();
    });
  }

  function handleCreateSpaceCategory(name: string, type: CategoryType) {
    if (isPending) return;
    setCreateError(null);
    startTransition(async () => {
      const result = await createSpaceCategoryInline(name, type);
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setLocalSpaceCategories((current) =>
        current.some((c) => c.id === result.spaceCategory.id) ? current : [result.spaceCategory, ...current]
      );
      selectSpaceCategory(result.spaceCategory);
    });
  }

  function handleCreateUserCategory(name: string) {
    if (isPending || selectedSpaceCategoryId == null || !selectedSpaceCategory) return;
    setCreateError(null);
    const spaceCategory = selectedSpaceCategory;
    startTransition(async () => {
      const result = await createUserCategoryInline(name, selectedSpaceCategoryId);
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setLocalUserCategories((current) =>
        current.some((c) => c.id === result.userCategory.id) ? current : [result.userCategory, ...current]
      );
      selectUserCategory(result.userCategory, spaceCategory);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && query === "" && stage === "user") {
      event.preventDefault();
      clearSpaceCategory();
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      if (suggestions.length) setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      if (suggestions.length) setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        pickSuggestion(suggestions[highlightedIndex]);
        return;
      }
      const exact = suggestions.find((suggestion) => suggestion.item.name.toLowerCase() === loweredQuery);
      if (exact) pickSuggestion(exact);
    }
  }

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      closeDropdown();
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node | null)) {
        closeDropdown();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    function updatePosition() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    }
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const inputValue = isOpen ? query : stage === "user" ? selectedUserCategory?.name ?? "" : "";
  const placeholder =
    stage === "space"
      ? "Type to find or create a space category..."
      : "Type to find or create a user category...";

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {selectedUserCategoryId != null ? <input type="hidden" name="userCategoryId" value={selectedUserCategoryId} /> : null}
      <div
        className="flex h-10 w-full items-center gap-1.5 rounded-md border border-input bg-background px-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedSpaceCategory ? (
          <span className="shrink-0 whitespace-nowrap text-muted-foreground">
            {selectedSpaceCategory.name} <span aria-hidden="true">&gt;</span>
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(event) => {
            if (!isOpen) openDropdown();
            setQuery(event.target.value);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {isOpen ? (
        <ul style={dropdownStyle} className="max-h-64 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.kind}-${suggestion.item.id}`}>
              <button
                type="button"
                onClick={() => pickSuggestion(suggestion)}
                className={cn(
                  "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                  highlightedIndex === index && "bg-accent text-accent-foreground"
                )}
              >
                {suggestion.kind === "user" && stage === "space" ? (
                  <>
                    <span className="text-muted-foreground">{suggestion.spaceCategory.name} &rsaquo; </span>
                    {suggestion.item.name}
                  </>
                ) : (
                  suggestion.item.name
                )}
              </button>
            </li>
          ))}
          {!suggestions.length && !canCreate ? (
            <li className="px-2 py-1.5 text-muted-foreground">
              {stage === "user" ? "No user categories yet" : "No matches"}
            </li>
          ) : null}
          {canCreate ? (
            <li className="border-t pt-1">
              {stage === "space" ? (
                <CreateSpaceCategoryRow query={trimmedQuery} onCreate={handleCreateSpaceCategory} />
              ) : (
                <CreateUserCategoryRow query={trimmedQuery} disabled={isPending} onCreate={handleCreateUserCategory} />
              )}
            </li>
          ) : null}
        </ul>
      ) : null}
      {defaultUserCategory && defaultUserCategory.spaceCategoryId == null && selectedUserCategoryId === defaultUserCategoryId ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {`Currently Unmapped — pick a space category to place "${defaultUserCategory.name}" into it.`}
        </p>
      ) : null}
      {createError ? <p className="mt-1 text-xs text-destructive">{createError}</p> : null}
    </div>
  );
}
