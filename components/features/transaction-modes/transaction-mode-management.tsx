"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createTransactionModeAction,
  deleteTransactionModeAction,
  setDefaultTransactionModeAction,
  updateTransactionModeAction,
} from "@/app/actions/auth-roles/transaction-modes.actions";
import type { TransactionModeRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function TransactionModeRow({ transactionMode }: { transactionMode: TransactionModeRecordDto }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateTransactionModeAction,
    financeInitialState
  );
  const [defaultState, defaultAction, defaultPending] = useActionState(
    setDefaultTransactionModeAction,
    financeInitialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTransactionModeAction,
    financeInitialState
  );

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{transactionMode.name}</p>
        </div>
        {transactionMode.isDefault ? <Badge>Default</Badge> : null}
      </div>
      <div className="space-y-3">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="transactionModeId" value={transactionMode.id} />
          <div className="space-y-2">
            <Label htmlFor={`transaction-mode-${transactionMode.id}`}>Name</Label>
            <Input
              id={`transaction-mode-${transactionMode.id}`}
              name="name"
              defaultValue={transactionMode.name}
              required
            />
          </div>
          <ActionError message={updateState.error} />
          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Saving..." : "Save"}
          </Button>
        </form>

        {!transactionMode.isDefault ? (
          <form action={defaultAction} className="space-y-2">
            <input type="hidden" name="transactionModeId" value={transactionMode.id} />
            <ActionError message={defaultState.error} />
            <Button type="submit" variant="outline" disabled={defaultPending}>
              {defaultPending ? "Setting..." : "Make default"}
            </Button>
          </form>
        ) : null}

        <form action={deleteAction}>
          <input type="hidden" name="transactionModeId" value={transactionMode.id} />
          <ActionError message={deleteState.error} />
          <Button type="submit" variant="outline" className="mt-2" disabled={deletePending}>
            <Trash2 className="mr-2 size-4" />
            {deletePending ? "Deleting..." : "Delete"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function TransactionModeManagement({
  transactionModes,
}: {
  transactionModes: TransactionModeRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createTransactionModeAction,
    financeInitialState
  );
  const [query, setQuery] = useState("");

  const filteredTransactionModes = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return transactionModes;
    return transactionModes.filter((mode) => mode.name.toLowerCase().includes(loweredQuery));
  }, [transactionModes, query]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="border-primary/20 bg-primary/5 py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Create transaction mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <form action={createAction} className="space-y-4 rounded-lg border border-primary/20 bg-background/80 p-4">
            <div className="space-y-2">
              <Label htmlFor="transactionModeName">Name</Label>
              <Input id="transactionModeName" name="name" placeholder="Online" required />
            </div>
            <ActionError message={createState.error} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending ? "Creating..." : "Create transaction mode"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Add the payment methods you use most, then pick them when recording expenses. Mark one as the default so
            new expenses prefill it automatically.
          </p>
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Your transaction modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
          {transactionModes.length ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="transaction-mode-search">Search</Label>
                <Input
                  id="transaction-mode-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by transaction mode name..."
                />
              </div>
              {filteredTransactionModes.length ? (
                <div className="grid gap-3">
                  {filteredTransactionModes.map((transactionMode) => (
                    <TransactionModeRow key={transactionMode.id} transactionMode={transactionMode} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  No transaction modes match your search.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No transaction modes yet. Create one to use it on expenses.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
