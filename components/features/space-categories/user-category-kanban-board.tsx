"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SpaceCategoryRecordDto } from "@/app/lib/finance.types";

export type KanbanItem = { id: number; name: string; spaceCategoryId: number | null };

const UNMAPPED_DROPPABLE_ID = "col-unmapped";
const CARD_ID_PREFIX = "card-";
const COLUMN_ID_PREFIX = "col-";

function draggableId(userCategoryId: number) {
  return `${CARD_ID_PREFIX}${userCategoryId}`;
}

function columnDroppableId(spaceCategoryId: number | null) {
  return spaceCategoryId === null ? UNMAPPED_DROPPABLE_ID : `${COLUMN_ID_PREFIX}${spaceCategoryId}`;
}

function parseColumnId(id: string): number | null {
  if (id === UNMAPPED_DROPPABLE_ID) return null;
  const raw = id.slice(COLUMN_ID_PREFIX.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function DraggableCard({ item, disabled }: { item: KanbanItem; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId(item.id),
    data: item,
    disabled,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      className={cn(
        "select-none rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground shadow-sm",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      {item.name}
    </div>
  );
}

function DroppableColumn({
  id,
  title,
  items,
  disabled,
  children,
}: {
  id: string;
  title: string;
  items: KanbanItem[];
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/20 p-3",
        isOver && !disabled && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold" title={title}>
          {title}
        </h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} disabled={disabled} />
        ))}
        {!items.length ? <p className="text-xs text-muted-foreground">Drop here</p> : null}
      </div>
      {children}
    </div>
  );
}

function CreateUserCategoryInput({ onCreate }: { onCreate: (name: string) => Promise<{ error: string | null }> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await onCreate(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
    });
  }

  return (
    <div className="space-y-1 border-t pt-2">
      <div className="flex gap-1">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleCreate();
            }
          }}
          placeholder="New subcategory..."
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || name.trim().length < 2}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Create subcategory"
          title="Create subcategory"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * One column per SpaceCategory plus a leading Unmapped column. Cards are
 * UserCategories, draggable between columns. `onAssign(userCategoryId, spaceCategoryId)`
 * is the only mutation entry point — the caller (personal vs shared space)
 * decides whether that's a direct FK update or a mapping-table upsert/delete.
 */
export function UserCategoryKanbanBoard({
  spaceCategories,
  items,
  onAssign,
  onCreate,
}: {
  spaceCategories: SpaceCategoryRecordDto[];
  items: KanbanItem[];
  onAssign: (userCategoryId: number, spaceCategoryId: number | null) => Promise<{ error: string | null }>;
  onCreate?: (name: string) => Promise<{ error: string | null }>;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const itemsByColumn = useMemo(() => {
    const map = new Map<number | null, KanbanItem[]>();
    map.set(null, []);
    for (const spaceCategory of spaceCategories) map.set(spaceCategory.id, []);
    for (const item of localItems) {
      const bucket = map.get(item.spaceCategoryId) ?? map.get(null)!;
      bucket.push(item);
    }
    return map;
  }, [localItems, spaceCategories]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const userCategoryId = Number(String(active.id).slice(CARD_ID_PREFIX.length));
    const targetSpaceCategoryId = parseColumnId(String(over.id));
    const current = localItems.find((item) => item.id === userCategoryId);
    if (!current || current.spaceCategoryId === targetSpaceCategoryId) return;

    const previousSpaceCategoryId = current.spaceCategoryId;
    setBoardError(null);
    setLocalItems((currentItems) =>
      currentItems.map((item) => (item.id === userCategoryId ? { ...item, spaceCategoryId: targetSpaceCategoryId } : item))
    );

    onAssign(userCategoryId, targetSpaceCategoryId).then((result) => {
      if (result.error) {
        setBoardError(result.error);
        setLocalItems((currentItems) =>
          currentItems.map((item) =>
            item.id === userCategoryId ? { ...item, spaceCategoryId: previousSpaceCategoryId } : item
          )
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <DroppableColumn id={UNMAPPED_DROPPABLE_ID} title="Unmapped" items={itemsByColumn.get(null) ?? []}>
            {onCreate ? <CreateUserCategoryInput onCreate={onCreate} /> : null}
          </DroppableColumn>
          {spaceCategories.map((spaceCategory) => (
            <DroppableColumn
              key={spaceCategory.id}
              id={columnDroppableId(spaceCategory.id)}
              title={spaceCategory.name}
              items={itemsByColumn.get(spaceCategory.id) ?? []}
            />
          ))}
        </div>
      </DndContext>
      {boardError ? <p className="text-sm text-destructive">{boardError}</p> : null}
      {!spaceCategories.length ? (
        <p className="text-sm text-muted-foreground">Create a category above to start mapping subcategories into it.</p>
      ) : null}
    </div>
  );
}
