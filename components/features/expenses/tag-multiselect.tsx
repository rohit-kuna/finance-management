"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { createTagInline } from "@/app/actions/auth-roles/tags.actions";
import type { TagRecordDto } from "@/app/lib/finance.types";
import { cn } from "@/lib/utils";

export function TagMultiSelect({
  tags,
  defaultSelectedTagIds = [],
}: {
  tags: TagRecordDto[];
  defaultSelectedTagIds?: number[];
}) {
  const [localTags, setLocalTags] = useState<TagRecordDto[]>(tags);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(defaultSelectedTagIds);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const tagsById = useMemo(() => {
    const map = new Map<number, TagRecordDto>();
    for (const tag of localTags) {
      map.set(tag.id, tag);
    }
    return map;
  }, [localTags]);

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => tagsById.get(id)).filter((tag): tag is TagRecordDto => Boolean(tag)),
    [selectedTagIds, tagsById]
  );

  const trimmedQuery = query.trim();
  const loweredQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    return localTags.filter((tag) => {
      if (selectedTagIds.includes(tag.id)) return false;
      if (!loweredQuery) return true;
      return tag.name.toLowerCase().includes(loweredQuery);
    });
  }, [localTags, loweredQuery, selectedTagIds]);

  const canCreate =
    trimmedQuery.length >= 2 && !localTags.some((tag) => tag.name.toLowerCase() === loweredQuery);

  function addTag(tagId: number) {
    setSelectedTagIds((current) => (current.includes(tagId) ? current : [...current, tagId]));
    setQuery("");
  }

  function removeTag(tagId: number) {
    setSelectedTagIds((current) => current.filter((id) => id !== tagId));
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

      setLocalTags((current) => (current.some((tag) => tag.id === result.tag.id) ? current : [result.tag, ...current]));
      addTag(result.tag.id);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const exactMatch = suggestions.find((tag) => tag.name.toLowerCase() === loweredQuery);
      if (exactMatch) {
        addTag(exactMatch.id);
        return;
      }

      if (suggestions.length) {
        addTag(suggestions[0].id);
        return;
      }

      if (canCreate) {
        handleCreateTag();
      }
    }

    if (event.key === "Backspace" && !query && selectedTagIds.length) {
      removeTag(selectedTagIds[selectedTagIds.length - 1]);
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setIsOpen(false);
      setQuery("");
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node | null)) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {selectedTagIds.map((tagId) => (
        <input key={tagId} type="hidden" name="tagIds" value={tagId} />
      ))}
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {tag.name}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeTag(tag.id);
              }}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length ? "" : "Type to find or create a tag..."}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {isOpen ? (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => addTag(tag.id)}
                className="block w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
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
          {!suggestions.length && !canCreate ? <li className="px-2 py-1.5 text-muted-foreground">No matches</li> : null}
        </ul>
      ) : null}
      {createError ? <p className="mt-1 text-xs text-destructive">{createError}</p> : null}
    </div>
  );
}
