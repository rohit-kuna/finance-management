"use client";

import { useActionState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createTagAction,
  deleteTagAction,
  updateTagAction,
} from "@/app/actions/auth-roles/tags.actions";
import type { TagRecordDto } from "@/app/lib/finance.types";
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

function TagRow({ tag }: { tag: TagRecordDto }) {
  const [updateState, updateAction, updatePending] = useActionState(updateTagAction, financeInitialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTagAction, financeInitialState);

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="tagId" value={tag.id} />
        <div className="space-y-2">
          <Label htmlFor={`tag-${tag.id}`}>Tag name</Label>
          <Input id={`tag-${tag.id}`} name="name" defaultValue={tag.name} required />
        </div>
        <ActionError message={updateState.error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="tagId" value={tag.id} />
        <ActionError message={deleteState.error} />
        <Button type="submit" variant="outline" className="mt-2" disabled={deletePending}>
          <Trash2 className="mr-2 size-4" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </div>
  );
}

export function TagManagement({ tags }: { tags: TagRecordDto[] }) {
  const [createState, createAction, createPending] = useActionState(createTagAction, financeInitialState);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="border-primary/20 bg-primary/5 py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Create tag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <form action={createAction} className="space-y-4 rounded-lg border border-primary/20 bg-background/80 p-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag name</Label>
              <Input id="tagName" name="name" placeholder="Travel" required />
            </div>
            <ActionError message={createState.error} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending ? "Creating..." : "Create tag"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            All organization members can create, update, and delete tags, then attach them to
            transactions.
          </p>
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Organization tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
          {tags.length ? (
            <div className="grid gap-3">
              {tags.map((tag) => (
                <TagRow key={tag.id} tag={tag} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No tags yet. Create one to label and organize transactions.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
