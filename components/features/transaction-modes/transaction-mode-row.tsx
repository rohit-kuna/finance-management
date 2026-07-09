"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Check, PencilLine, Star, Trash2, X } from "lucide-react";
import {
  deleteTransactionModeAction,
  setDefaultTransactionModeAction,
  updateTransactionModeAction,
} from "@/app/actions/auth-roles/transaction-modes.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { TransactionModeRecordDto } from "@/app/lib/finance.types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function TransactionModeRow({
  transactionMode,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  transactionMode: TransactionModeRecordDto;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.append("transactionModeId", String(transactionMode.id));
    formData.append("name", nameRef.current?.value ?? "");

    startTransition(async () => {
      const result = await updateTransactionModeAction(financeInitialState, formData);
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
    formData.append("transactionModeId", String(transactionMode.id));

    startTransition(async () => {
      const result = await deleteTransactionModeAction(financeInitialState, formData);
      if (result.error) {
        setDeleteError(result.error);
      }
    });
  }

  function handleSetDefault() {
    if (transactionMode.isDefault || pending) return;
    setDefaultError(null);
    const formData = new FormData();
    formData.append("transactionModeId", String(transactionMode.id));

    startTransition(async () => {
      const result = await setDefaultTransactionModeAction(financeInitialState, formData);
      if (result.error) {
        setDefaultError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell className="align-top">
          <div className="space-y-1">
            <Input ref={nameRef} defaultValue={transactionMode.name} placeholder="Transaction mode name" required />
            <ActionError message={error} />
          </div>
        </TableCell>
        <TableCell className="align-top" />
        <TableCell className="align-top">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pending}
              onClick={handleSave}
              aria-label="Save transaction mode"
              title="Save transaction mode"
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
        <p className="font-medium">{transactionMode.name}</p>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={handleSetDefault}
            aria-label={transactionMode.isDefault ? "Default transaction mode" : "Set as default"}
            title={transactionMode.isDefault ? "Default transaction mode" : "Set as default"}
            className={cn(
              "text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed",
              transactionMode.isDefault && "text-amber-500 hover:text-amber-500"
            )}
          >
            <Star className={cn("size-5", transactionMode.isDefault && "fill-amber-500")} />
          </button>
          <ActionError message={defaultError} />
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onStartEdit}
              aria-label="Edit transaction mode"
              title="Edit transaction mode"
            >
              <PencilLine className="size-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete transaction mode"
              title="Delete transaction mode"
            >
              <Trash2 className="size-4" />
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Delete transaction mode"
              description={`Are you sure you want to delete "${transactionMode.name}"? This cannot be undone.`}
              onConfirm={handleDelete}
            />
          </div>
          <ActionError message={deleteError} />
        </div>
      </TableCell>
    </TableRow>
  );
}
