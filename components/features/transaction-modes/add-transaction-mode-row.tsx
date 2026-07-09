"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { createTransactionModeAction } from "@/app/actions/auth-roles/transaction-modes.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
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

export function AddTransactionModeRow() {
  const [state, formAction, pending] = useActionState(createTransactionModeAction, financeInitialState);

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-xl tracking-tight">Create transaction mode</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add the payment methods you use most, then pick them when recording expenses. Mark one as the default so
          new expenses prefill it automatically.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
        <form action={formAction} className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="new-transaction-mode-name">Name</Label>
            <Input id="new-transaction-mode-name" name="name" placeholder="Online" required />
          </div>
          <div className="space-y-2">
            <Label className="hidden sm:block sm:invisible">Action</Label>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
        <ActionError message={state.error} />
      </CardContent>
    </Card>
  );
}
