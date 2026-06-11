"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createCounterpartyAction,
  deleteCounterpartyAction,
  updateCounterpartyAction,
} from "@/app/actions/auth-roles/counterparties.actions";
import type { CounterpartyRecordDto } from "@/app/lib/finance.types";
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

function CounterpartyRow({ counterparty }: { counterparty: CounterpartyRecordDto }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCounterpartyAction,
    financeInitialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCounterpartyAction,
    financeInitialState
  );

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="counterpartyId" value={counterparty.id} />
        <div className="space-y-2">
          <Label htmlFor={`counterparty-${counterparty.id}`}>Counterparty name</Label>
          <Input
            id={`counterparty-${counterparty.id}`}
            name="name"
            defaultValue={counterparty.name}
            required
          />
        </div>
        <ActionError message={updateState.error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="counterpartyId" value={counterparty.id} />
        <ActionError message={deleteState.error} />
        <Button type="submit" variant="outline" className="mt-2" disabled={deletePending}>
          <Trash2 className="mr-2 size-4" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </div>
  );
}

export function CounterpartyManagement({
  counterparties,
}: {
  counterparties: CounterpartyRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createCounterpartyAction,
    financeInitialState
  );
  const [query, setQuery] = useState("");

  const filteredCounterparties = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return counterparties;
    return counterparties.filter((counterparty) => counterparty.name.toLowerCase().includes(loweredQuery));
  }, [counterparties, query]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="border-primary/20 bg-primary/5 py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Create counterparty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <form action={createAction} className="space-y-4 rounded-lg border border-primary/20 bg-background/80 p-4">
            <div className="space-y-2">
              <Label htmlFor="counterpartyName">Counterparty name</Label>
              <Input id="counterpartyName" name="name" placeholder="John Doe" required />
            </div>
            <ActionError message={createState.error} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending ? "Creating..." : "Create counterparty"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            All organization members can create, update, and delete counterparties.
          </p>
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Organization counterparties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
          {counterparties.length ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="counterparty-search">Search</Label>
                <Input
                  id="counterparty-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by counterparty name..."
                />
              </div>
              {filteredCounterparties.length ? (
                <div className="grid gap-3">
                  {filteredCounterparties.map((counterparty) => (
                    <CounterpartyRow key={counterparty.id} counterparty={counterparty} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  No counterparties match your search.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No counterparties yet. Create one to tag expenses and transfers.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
