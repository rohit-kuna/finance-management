"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { createTagInline } from "@/app/actions/auth-roles/tags.actions";
import type { TagRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TagMultiSelect({
  tags,
  name,
  defaultSelectedIds = [],
}: {
  tags: TagRecordDto[];
  name: string;
  defaultSelectedIds?: number[];
}) {
  const [localTags, setLocalTags] = useState<TagRecordDto[]>(tags);
  const [selectedIds, setSelectedIds] = useState<number[]>(defaultSelectedIds);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = useMemo(
    () =>
      selectedIds
        .map((id) => localTags.find((tag) => tag.id === id))
        .filter((tag): tag is TagRecordDto => Boolean(tag)),
    [selectedIds, localTags]
  );

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    return localTags.filter((tag) => {
      if (selectedIds.includes(tag.id)) return false;
      if (!loweredQuery) return true;
      return tag.name.toLowerCase().includes(loweredQuery);
    });
  }, [localTags, selectedIds, loweredQuery]);

  const canCreate =
    trimmedQuery.length >= 2 &&
    !localTags.some((tag) => tag.name.toLowerCase() === loweredQuery);

  function addTag(tagId: number) {
    setSelectedIds((current) => (current.includes(tagId) ? current : [...current, tagId]));
    setQuery("");
  }

  function removeTag(tagId: number) {
    setSelectedIds((current) => current.filter((id) => id !== tagId));
  }

  function handleCreateTag() {
    if (!trimmedQuery || isCreating) return;
    setCreateError(null);
    const name = trimmedQuery;

    startCreating(async () => {
      const result = await createTagInline(name);

      if ("error" in result) {
        setCreateError(result.error);
        return;
      }

      setLocalTags((current) =>
        current.some((tag) => tag.id === result.tag.id) ? current : [result.tag, ...current]
      );
      addTag(result.tag.id);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !query && selectedIds.length) {
      setSelectedIds((current) => current.slice(0, -1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const exactMatch = suggestions.find((tag) => tag.name.toLowerCase() === loweredQuery);
      if (exactMatch) {
        addTag(exactMatch.id);
      } else if (canCreate) {
        handleCreateTag();
      }
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => setIsOpen(true)}
      >
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length ? "" : "Type to find tags..."}
          className="h-7 min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {isOpen && (suggestions.length || canCreate) ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => addTag(tag.id)}
                className={cn(
                  "block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {tag.name}
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateTag}
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
