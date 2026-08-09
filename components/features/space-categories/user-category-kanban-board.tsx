"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

function DraggableCard({
  item,
  disabled,
  onDelete,
}: {
  item: KanbanItem;
  disabled?: boolean;
  onDelete?: (item: KanbanItem) => void;
}) {
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
        "group flex select-none items-center gap-1 rounded-full bg-accent py-1.5 pl-3 text-sm font-medium text-accent-foreground shadow-sm",
        onDelete ? "pr-1.5" : "pr-3",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <span>{item.name}</span>
      {onDelete ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-accent-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label={`Delete ${item.name}`}
          title={`Delete ${item.name}`}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function DroppableColumn({
  id,
  title,
  items,
  disabled,
  onDeleteItem,
  onDeleteColumn,
  children,
}: {
  id: string;
  title: string;
  items: KanbanItem[];
  disabled?: boolean;
  onDeleteItem?: (item: KanbanItem) => void;
  onDeleteColumn?: () => void;
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
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary">{items.length}</Badge>
          {onDeleteColumn ? (
            <button
              type="button"
              onClick={onDeleteColumn}
              className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${title}`}
              title={`Delete ${title}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} disabled={disabled} onDelete={onDeleteItem} />
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
          placeholder="New user category..."
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || name.trim().length < 2}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Create user category"
          title="Create user category"
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
  onDeleteSpaceCategory,
  onDeleteUserCategory,
}: {
  spaceCategories: SpaceCategoryRecordDto[];
  items: KanbanItem[];
  onAssign: (userCategoryId: number, spaceCategoryId: number | null) => Promise<{ error: string | null }>;
  onCreate?: (name: string) => Promise<{ error: string | null }>;
  onDeleteSpaceCategory?: (spaceCategoryId: number) => Promise<{ error: string | null }>;
  onDeleteUserCategory?: (userCategoryId: number) => Promise<{ error: string | null }>;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "space" | "user"; id: number; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    const target = deleteTarget;

    startDeleteTransition(async () => {
      const result =
        target.kind === "space" ? await onDeleteSpaceCategory?.(target.id) : await onDeleteUserCategory?.(target.id);

      if (result?.error) {
        setDeleteError(result.error);
        return;
      }

      if (target.kind === "user") {
        setLocalItems((currentItems) => currentItems.filter((item) => item.id !== target.id));
      }
      setDeleteTarget(null);
    });
  }

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

  const onDeleteItem = onDeleteUserCategory
    ? (item: KanbanItem) => setDeleteTarget({ kind: "user", id: item.id, name: item.name })
    : undefined;

  return (
    <div className="space-y-2">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <DroppableColumn
            id={UNMAPPED_DROPPABLE_ID}
            title="Unmapped"
            items={itemsByColumn.get(null) ?? []}
            onDeleteItem={onDeleteItem}
          >
            {onCreate ? <CreateUserCategoryInput onCreate={onCreate} /> : null}
          </DroppableColumn>
          {spaceCategories.map((spaceCategory) => (
            <DroppableColumn
              key={spaceCategory.id}
              id={columnDroppableId(spaceCategory.id)}
              title={spaceCategory.name}
              items={itemsByColumn.get(spaceCategory.id) ?? []}
              onDeleteItem={onDeleteItem}
              onDeleteColumn={
                onDeleteSpaceCategory
                  ? () => setDeleteTarget({ kind: "space", id: spaceCategory.id, name: spaceCategory.name })
                  : undefined
              }
            />
          ))}
        </div>
      </DndContext>
      {boardError ? <p className="text-sm text-destructive">{boardError}</p> : null}
      {!spaceCategories.length ? (
        <p className="text-sm text-muted-foreground">Create a space category above to start mapping user categories into it.</p>
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
        title={deleteTarget?.kind === "space" ? "Delete space category" : "Delete user category"}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={confirmDelete}
      />
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
    </div>
  );
}
