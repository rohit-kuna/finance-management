"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createUserCategoryInline } from "@/app/actions/auth-roles/user-categories.actions";
import { createSpaceCategoryInline } from "@/app/actions/auth-roles/organization-finance.actions";
import type { SpaceCategoryRecordDto, UserCategoryRecordDto } from "@/app/lib/finance.types";
import type { CategoryType } from "@/db/schema";
import { cn } from "@/lib/utils";

type ComboboxItem = { id: number; name: string };

/**
 * Generic type-to-search dropdown shared by the SpaceCategory and UserCategory
 * steps below. `renderCreate`, if provided, renders a trailing row for
 * creating a new item from the current query text.
 */
function Combobox<T extends ComboboxItem>({
  items,
  selected,
  onSelect,
  placeholder,
  disabled,
  renderCreate,
}: {
  items: T[];
  selected: T | null;
  onSelect: (item: T | null) => void;
  placeholder: string;
  disabled?: boolean;
  renderCreate?: (query: string, close: () => void) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    if (!loweredQuery) return items;
    return items.filter((item) => item.name.toLowerCase().includes(loweredQuery));
  }, [items, loweredQuery]);

  function selectItem(item: T) {
    onSelect(item);
    setQuery("");
    setIsOpen(false);
  }

  function openDropdown() {
    if (disabled) return;
    if (!containerRef.current) {
      setIsOpen(true);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    setIsOpen(true);
  }

  function handleFocus() {
    setQuery(selected?.name ?? "");
    openDropdown();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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
        selectItem(suggestions[highlightedIndex]);
        return;
      }
      const exact = suggestions.find((item) => item.name.toLowerCase() === loweredQuery);
      if (exact) selectItem(exact);
    }
  }

  const closeAndMaybeClearSelection = useCallback(() => {
    setIsOpen((wasOpen) => {
      if (wasOpen && !trimmedQuery && selected) {
        onSelect(null);
      }
      return false;
    });
    setQuery("");
  }, [trimmedQuery, selected, onSelect]);

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      closeAndMaybeClearSelection();
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node | null)) {
        closeAndMaybeClearSelection();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, closeAndMaybeClearSelection]);

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

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : selected?.name ?? ""}
        onChange={(event) => {
          if (!isOpen) openDropdown();
          setQuery(event.target.value);
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {isOpen ? (
        <ul style={dropdownStyle} className="max-h-64 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {suggestions.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(item)}
                className={cn(
                  "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                  highlightedIndex === index && "bg-accent text-accent-foreground"
                )}
              >
                {item.name}
              </button>
            </li>
          ))}
          {!suggestions.length && !renderCreate ? (
            <li className="px-2 py-1.5 text-muted-foreground">No matches</li>
          ) : null}
          {renderCreate ? <li className="border-t pt-1">{renderCreate(trimmedQuery, () => setIsOpen(false))}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

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
        {`Create "${query}"`}
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
 * Two-step category picker for a transaction: pick a SpaceCategory first
 * (implicitly setting the transaction's type from it), then pick or create a
 * UserCategory scoped to that SpaceCategory. A UserCategory created here is
 * mapped to the chosen SpaceCategory immediately — this is the explicit
 * "place a transaction in a category" flow, distinct from the Kanban board's
 * "+ New" flow where new UserCategories always start Unmapped.
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

  const userCategoryOptions = useMemo(
    () => allUserCategories.filter((c) => c.spaceCategoryId === selectedSpaceCategoryId),
    [allUserCategories, selectedSpaceCategoryId]
  );

  useEffect(() => {
    onChange?.({ userCategoryId: selectedUserCategoryId, type: selectedSpaceCategory?.type ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserCategoryId, selectedSpaceCategory?.type]);

  function handleSelectSpaceCategory(item: SpaceCategoryRecordDto | null) {
    setCreateError(null);
    setSelectedSpaceCategoryId(item?.id ?? null);
    setSelectedUserCategoryId(null);
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
      setSelectedSpaceCategoryId(result.spaceCategory.id);
      setSelectedUserCategoryId(null);
    });
  }

  function handleCreateUserCategory(name: string) {
    if (isPending || selectedSpaceCategoryId == null) return;
    setCreateError(null);
    startTransition(async () => {
      const result = await createUserCategoryInline(name, selectedSpaceCategoryId);
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setLocalUserCategories((current) =>
        current.some((c) => c.id === result.userCategory.id) ? current : [result.userCategory, ...current]
      );
      setSelectedUserCategoryId(result.userCategory.id);
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {selectedUserCategoryId != null ? <input type="hidden" name="userCategoryId" value={selectedUserCategoryId} /> : null}
      <div>
        <Combobox
          items={allSpaceCategories}
          selected={selectedSpaceCategory}
          onSelect={handleSelectSpaceCategory}
          placeholder="Type to find or create a category..."
          renderCreate={(query, close) => (
            <CreateSpaceCategoryRow
              query={query}
              onCreate={(name, type) => {
                handleCreateSpaceCategory(name, type);
                close();
              }}
            />
          )}
        />
      </div>
      <div>
        <Combobox
          items={userCategoryOptions}
          selected={selectedUserCategory}
          onSelect={(item) => setSelectedUserCategoryId(item?.id ?? null)}
          placeholder={selectedSpaceCategoryId == null ? "Pick a category first" : "Type to find or create a subcategory..."}
          disabled={selectedSpaceCategoryId == null}
          renderCreate={(query, close) => (
            <CreateUserCategoryRow
              query={query}
              disabled={isPending}
              onCreate={(name) => {
                handleCreateUserCategory(name);
                close();
              }}
            />
          )}
        />
      </div>
      {defaultUserCategory && defaultUserCategory.spaceCategoryId == null && selectedUserCategoryId === defaultUserCategoryId ? (
        <p className="text-xs text-muted-foreground sm:col-span-2">
          {`Currently Unmapped — pick a category to place "${defaultUserCategory.name}" into it.`}
        </p>
      ) : null}
      {createError ? <p className="text-xs text-destructive sm:col-span-2">{createError}</p> : null}
    </div>
  );
}
