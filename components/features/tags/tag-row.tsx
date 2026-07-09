"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Check, PencilLine, Trash2, X } from "lucide-react";
import { deleteTagAction, updateTagAction } from "@/app/actions/auth-roles/tags.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { TagRecordDto } from "@/app/lib/finance.types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function TagRow({
  tag,
  isEditing,
  onStartEdit,
  onCancelEdit,
  canManageTags,
}: {
  tag: TagRecordDto;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  canManageTags: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.append("tagId", String(tag.id));
    formData.append("name", nameRef.current?.value ?? "");

    startTransition(async () => {
      const result = await updateTagAction(financeInitialState, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onCancelEdit();
    });
  }

  function handleDelete() {
    setDeleteError(null);
    const formData = new FormData();
    formData.append("tagId", String(tag.id));

    startTransition(async () => {
      const result = await deleteTagAction(financeInitialState, formData);
      if (result.error) {
        setDeleteError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell className="align-top">
          <div className="space-y-1">
            <Input ref={nameRef} defaultValue={tag.name} placeholder="Tag name" required />
            <ActionError message={error} />
          </div>
        </TableCell>
        <TableCell className="align-top">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pending}
              onClick={handleSave}
              aria-label="Save tag"
              title="Save tag"
            >
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pending}
              onClick={onCancelEdit}
              aria-label="Cancel edit"
              title="Cancel edit"
            >
              <X className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <p className="font-medium">{tag.name}</p>
      </TableCell>
      <TableCell className="align-top">
        {canManageTags ? (
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={onStartEdit}
                aria-label="Edit tag"
                title="Edit tag"
              >
                <PencilLine className="size-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
                aria-label="Delete tag"
                title="Delete tag"
              >
                <Trash2 className="size-4" />
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete tag"
                description={`Are you sure you want to delete "${tag.name}"? This cannot be undone.`}
                onConfirm={handleDelete}
              />
            </div>
            <ActionError message={deleteError} />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Read only</span>
        )}
      </TableCell>
    </TableRow>
  );
}
