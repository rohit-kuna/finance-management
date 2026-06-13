"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createSubcategoryInline } from "@/app/actions/auth-roles/subcategories.actions";
import type { CategoryRecordDto, SubcategoryRecordDto } from "@/app/lib/finance.types";
import { cn } from "@/lib/utils";

type Option =
  | { kind: "category"; categoryId: number; label: string; group: "Expense" | "Income" }
  | { kind: "subcategory"; categoryId: number; subcategoryId: number; label: string; group: "Expense" | "Income" };

export function CategorySubcategorySelect({
  categories,
  subcategories,
  defaultCategoryId,
  defaultSubcategoryId = null,
  onCategoryChange,
}: {
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
  defaultCategoryId: number;
  defaultSubcategoryId?: number | null;
  onCategoryChange: (categoryId: number) => void;
}) {
  const [localSubcategories, setLocalSubcategories] = useState<SubcategoryRecordDto[]>(subcategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(defaultSubcategoryId);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipFocusResetRef = useRef(false);

  useEffect(() => {
    setLocalSubcategories(subcategories);
  }, [subcategories]);

  const categoriesById = useMemo(() => {
    const map = new Map<number, CategoryRecordDto>();
    for (const category of categories) {
      map.set(category.id, category);
    }
    return map;
  }, [categories]);

  const selectedCategory = categoriesById.get(selectedCategoryId) ?? null;
  const selectedSubcategory = useMemo(
    () => localSubcategories.find((subcategory) => subcategory.id === selectedSubcategoryId) ?? null,
    [localSubcategories, selectedSubcategoryId]
  );

  const displayValue = selectedCategory
    ? selectedSubcategory
      ? `${selectedCategory.name} > ${selectedSubcategory.name}`
      : selectedCategory.name
    : "";

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  // When the query contains ">", treat the part before it as a category name
  // and the part after it as a subcategory search/create query scoped to that category.
  const arrowIndex = query.indexOf(">");
  const arrowCategoryPart = arrowIndex >= 0 ? query.slice(0, arrowIndex).trim() : null;
  const arrowSubPart = arrowIndex >= 0 ? query.slice(arrowIndex + 1).trim() : null;
  const arrowCategory = arrowCategoryPart
    ? categories.find((category) => category.name.toLowerCase() === arrowCategoryPart.toLowerCase()) ?? null
    : null;
  const isArrowMode = arrowIndex >= 0 && Boolean(arrowCategory);

  const allOptions = useMemo(() => {
    const options: Option[] = [];
    for (const category of categories) {
      const group = category.type === "income" ? "Income" : "Expense";
      options.push({ kind: "category", categoryId: category.id, label: category.name, group });
      for (const subcategory of localSubcategories) {
        if (subcategory.categoryId !== category.id) continue;
        options.push({
          kind: "subcategory",
          categoryId: category.id,
          subcategoryId: subcategory.id,
          label: `${category.name} > ${subcategory.name}`,
          group,
        });
      }
    }
    return options;
  }, [categories, localSubcategories]);

  const normalSuggestions = useMemo(() => {
    if (!loweredQuery) return allOptions.filter((option) => option.kind === "category");

    const matchingCategoryIds = new Set(
      categories.filter((category) => category.name.toLowerCase().includes(loweredQuery)).map((category) => category.id)
    );
    const matchingSubcategoryCategoryIds = new Set(
      localSubcategories
        .filter((subcategory) => subcategory.name.toLowerCase().includes(loweredQuery))
        .map((subcategory) => subcategory.categoryId)
    );

    return allOptions.filter((option) => {
      if (option.kind === "category") {
        return matchingCategoryIds.has(option.categoryId) || matchingSubcategoryCategoryIds.has(option.categoryId);
      }

      if (matchingCategoryIds.has(option.categoryId)) return true;

      const subcategory = localSubcategories.find((candidate) => candidate.id === option.subcategoryId);
      return Boolean(subcategory && subcategory.name.toLowerCase().includes(loweredQuery));
    });
  }, [allOptions, categories, localSubcategories, loweredQuery]);

  const arrowSubQueryLowered = (arrowSubPart ?? "").toLowerCase();
  const arrowSuggestions = useMemo(() => {
    if (!arrowCategory) return [];

    return localSubcategories
      .filter((subcategory) => subcategory.categoryId === arrowCategory.id)
      .filter((subcategory) => !arrowSubQueryLowered || subcategory.name.toLowerCase().includes(arrowSubQueryLowered))
      .map<Option>((subcategory) => ({
        kind: "subcategory",
        categoryId: arrowCategory.id,
        subcategoryId: subcategory.id,
        label: `${arrowCategory.name} > ${subcategory.name}`,
        group: arrowCategory.type === "income" ? "Income" : "Expense",
      }));
  }, [arrowCategory, arrowSubQueryLowered, localSubcategories]);

  const suggestions = isArrowMode ? arrowSuggestions : normalSuggestions;

  const canCreate = isArrowMode
    ? Boolean(arrowCategory) &&
      Boolean(arrowSubPart) &&
      (arrowSubPart?.length ?? 0) >= 1 &&
      !localSubcategories.some(
        (subcategory) => subcategory.categoryId === arrowCategory?.id && subcategory.name.toLowerCase() === arrowSubQueryLowered
      )
    : false;

  const createTargetCategory = isArrowMode ? arrowCategory : selectedCategory;
  const createTargetName = isArrowMode ? arrowSubPart ?? "" : trimmedQuery;

  function selectCategory(categoryId: number) {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null);
    onCategoryChange(categoryId);

    const category = categoriesById.get(categoryId);
    const hasSubcategories = localSubcategories.some((subcategory) => subcategory.categoryId === categoryId);
    if (category && hasSubcategories) {
      setQuery(category.name);
      setIsOpen(true);
    } else {
      setQuery("");
      setIsOpen(false);
    }
  }

  function selectSubcategory(categoryId: number, subcategoryId: number) {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
    onCategoryChange(categoryId);
    setQuery("");
    setIsOpen(false);
  }

  function handleCreateSubcategory() {
    if (!createTargetName || isCreating || !createTargetCategory) return;
    setCreateError(null);
    const name = createTargetName;
    const categoryId = createTargetCategory.id;

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
      selectSubcategory(categoryId, result.subcategory.id);
    });
  }

  function handleFocus() {
    if (skipFocusResetRef.current) {
      skipFocusResetRef.current = false;
      setIsOpen(true);
      return;
    }
    setQuery(displayValue);
    setIsOpen(true);
  }

  function handleAddSubcategoryHint() {
    if (!selectedCategory) return;
    skipFocusResetRef.current = true;
    setQuery(`${selectedCategory.name} > `);
    setIsOpen(true);
    inputRef.current?.focus();
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
        setIsOpen(true);
        return;
      }
      if (navigableCount > 0) {
        setHighlightedIndex((current) => (current + 1) % navigableCount);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (navigableCount > 0) {
        setHighlightedIndex((current) => (current <= 0 ? navigableCount - 1 : current - 1));
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (highlightedIndex >= 0) {
        if (highlightedIndex < navigableOptions.length) {
          selectOption(navigableOptions[highlightedIndex], selectCategory, selectSubcategory);
        } else if (canCreate) {
          handleCreateSubcategory();
        }
        return;
      }

      const exactSubcategory = suggestions.find(
        (option) =>
          option.kind === "subcategory" &&
          (isArrowMode
            ? option.label.split(" > ")[1]?.toLowerCase() === arrowSubQueryLowered
            : option.label.toLowerCase() === loweredQuery)
      );
      if (exactSubcategory && exactSubcategory.kind === "subcategory") {
        selectSubcategory(exactSubcategory.categoryId, exactSubcategory.subcategoryId);
        return;
      }

      if (!isArrowMode) {
        const exactCategory = suggestions.find(
          (option) => option.kind === "category" && option.label.toLowerCase() === loweredQuery
        );
        if (exactCategory) {
          selectCategory(exactCategory.categoryId);
          return;
        }
      }

      if (suggestions.length) {
        selectOption(suggestions[0], selectCategory, selectSubcategory);
        return;
      }

      if (canCreate) {
        handleCreateSubcategory();
      }
    }
  }

  const closeAndMaybeClearSelection = useCallback(() => {
    setIsOpen((wasOpen) => {
      if (wasOpen && !trimmedQuery && selectedCategory) {
        setSelectedCategoryId(0);
        setSelectedSubcategoryId(null);
        onCategoryChange(0);
      }
      return false;
    });
    setQuery("");
  }, [trimmedQuery, selectedCategory, onCategoryChange]);

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

  const expenseSuggestions = suggestions.filter((option) => option.group === "Expense");
  const incomeSuggestions = suggestions.filter((option) => option.group === "Income");

  const navigableOptions = useMemo(
    () => [...expenseSuggestions, ...incomeSuggestions],
    [expenseSuggestions, incomeSuggestions]
  );
  const navigableCount = navigableOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query, isOpen]);

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input type="hidden" name="categoryId" value={selectedCategoryId} />
      {selectedSubcategoryId != null ? (
        <input type="hidden" name="subcategoryId" value={selectedSubcategoryId} />
      ) : null}
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : displayValue}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Type to find a category or subcategory..."
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selectedCategory && arrowIndex < 0 ? "pr-32" : null
        )}
      />
      {selectedCategory && arrowIndex < 0 ? (
        <button
          type="button"
          onClick={handleAddSubcategoryHint}
          className="absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Press &gt; to add subcategory
        </button>
      ) : null}
      {isOpen ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {expenseSuggestions.length ? (
            <>
              <li className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expense</li>
              {expenseSuggestions.map((option) => (
                <OptionRow
                  key={optionKey(option)}
                  option={option}
                  isHighlighted={navigableOptions.indexOf(option) === highlightedIndex}
                  onSelect={() => selectOption(option, selectCategory, selectSubcategory)}
                />
              ))}
            </>
          ) : null}
          {incomeSuggestions.length ? (
            <>
              <li className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Income</li>
              {incomeSuggestions.map((option) => (
                <OptionRow
                  key={optionKey(option)}
                  option={option}
                  isHighlighted={navigableOptions.indexOf(option) === highlightedIndex}
                  onSelect={() => selectOption(option, selectCategory, selectSubcategory)}
                />
              ))}
            </>
          ) : null}
          {canCreate ? (
            <li>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateSubcategory}
                className={cn(
                  "block w-full rounded-sm px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  highlightedIndex === navigableOptions.length && "bg-accent text-accent-foreground"
                )}
              >
                {isCreating ? "Creating..." : `Create "${createTargetName}" under ${createTargetCategory?.name}`}
              </button>
            </li>
          ) : null}
          {!expenseSuggestions.length && !incomeSuggestions.length && !canCreate ? (
            <li className="px-2 py-1.5 text-muted-foreground">No matches</li>
          ) : null}
        </ul>
      ) : null}
      {createError ? <p className="mt-1 text-xs text-destructive">{createError}</p> : null}
    </div>
  );
}

function optionKey(option: Option) {
  return option.kind === "category" ? `c-${option.categoryId}` : `s-${option.subcategoryId}`;
}

function selectOption(
  option: Option,
  selectCategory: (categoryId: number) => void,
  selectSubcategory: (categoryId: number, subcategoryId: number) => void
) {
  if (option.kind === "category") {
    selectCategory(option.categoryId);
  } else {
    selectSubcategory(option.categoryId, option.subcategoryId);
  }
}

function OptionRow({
  option,
  isHighlighted,
  onSelect,
}: {
  option: Option;
  isHighlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
          option.kind === "category" && "font-medium",
          isHighlighted && "bg-accent text-accent-foreground"
        )}
      >
        {option.label}
      </button>
    </li>
  );
}
