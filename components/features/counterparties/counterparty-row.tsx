"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Check, PencilLine, Trash2, X } from "lucide-react";
import { deleteCounterpartyAction, updateCounterpartyAction } from "@/app/actions/auth-roles/counterparties.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { CounterpartyRecordDto } from "@/app/lib/finance.types";
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

export function CounterpartyRow({
  counterparty,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  counterparty: CounterpartyRecordDto;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.append("counterpartyId", String(counterparty.id));
    formData.append("name", nameRef.current?.value ?? "");

    startTransition(async () => {
      const result = await updateCounterpartyAction(financeInitialState, formData);
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
    formData.append("counterpartyId", String(counterparty.id));

    startTransition(async () => {
      const result = await deleteCounterpartyAction(financeInitialState, formData);
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
            <Input ref={nameRef} defaultValue={counterparty.name} placeholder="Counterparty name" required />
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
              aria-label="Save counterparty"
              title="Save counterparty"
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
        <p className="font-medium">{counterparty.name}</p>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onStartEdit}
              aria-label="Edit counterparty"
              title="Edit counterparty"
            >
              <PencilLine className="size-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete counterparty"
              title="Delete counterparty"
            >
              <Trash2 className="size-4" />
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Delete counterparty"
              description={`Are you sure you want to delete "${counterparty.name}"? This cannot be undone.`}
              onConfirm={handleDelete}
            />
          </div>
          <ActionError message={deleteError} />
        </div>
      </TableCell>
    </TableRow>
  );
}
