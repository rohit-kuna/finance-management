"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Check, PencilLine, Trash2, X } from "lucide-react";
import { deleteCategoryAction, updateCategoryAction } from "@/app/actions/auth-roles/organization-finance.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { CategoryRecordDto, SubcategoryRecordDto } from "@/app/lib/finance.types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { SubcategoryChipCell } from "@/components/features/categories/subcategory-chip-cell";

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function CategoryTypeSelect({
  id,
  defaultValue,
  selectRef,
}: {
  id: string;
  defaultValue: CategoryRecordDto["type"];
  selectRef: React.RefObject<HTMLSelectElement | null>;
}) {
  return (
    <select
      id={id}
      ref={selectRef}
      defaultValue={defaultValue}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="expense">Expense</option>
      <option value="income">Income</option>
    </select>
  );
}

export function CategoryRow({
  category,
  isEditing,
  onStartEdit,
  onCancelEdit,
  allSubcategories,
  categoriesById,
  currentUserId,
  isAdmin,
}: {
  category: CategoryRecordDto;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  allSubcategories: SubcategoryRecordDto[];
  categoriesById: Map<number, CategoryRecordDto>;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.append("categoryId", String(category.id));
    formData.append("name", nameRef.current?.value ?? "");
    formData.append("type", typeRef.current?.value ?? category.type);

    startTransition(async () => {
      const result = await updateCategoryAction(financeInitialState, formData);
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
    formData.append("categoryId", String(category.id));

    startTransition(async () => {
      const result = await deleteCategoryAction(financeInitialState, formData);
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
            <Input ref={nameRef} defaultValue={category.name} placeholder="Category name" required />
            <ActionError message={error} />
          </div>
        </TableCell>
        <TableCell className="align-top">
          <CategoryTypeSelect id={`type-${category.id}`} defaultValue={category.type} selectRef={typeRef} />
        </TableCell>
        <TableCell className="align-top">
          <SubcategoryChipCell
            category={category}
            allSubcategories={allSubcategories}
            categoriesById={categoriesById}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            disabled
          />
        </TableCell>
        <TableCell className="align-top">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pending}
              onClick={handleSave}
              aria-label="Save category"
              title="Save category"
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
        <div className="space-y-1">
          <p className="font-medium">{category.name}</p>
          <p className="text-xs text-muted-foreground">Category ID #{category.id}</p>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={category.type === "income" ? "secondary" : "outline"}>{category.type}</Badge>
      </TableCell>
      <TableCell className="align-top">
        <SubcategoryChipCell
          category={category}
          allSubcategories={allSubcategories}
          categoriesById={categoriesById}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </TableCell>
      <TableCell className="align-top">
        {isAdmin ? (
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={onStartEdit}
                aria-label="Edit category"
                title="Edit category"
              >
                <PencilLine className="size-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
                aria-label="Delete category"
                title="Delete category"
              >
                <Trash2 className="size-4" />
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete category"
                description={`Are you sure you want to delete "${category.name}"? This cannot be undone.`}
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
