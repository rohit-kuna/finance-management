"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { updateExpenseAction } from "@/app/actions/auth-roles/expense.actions";
import { TransactionCategorySelect } from "@/components/features/expenses/category-subcategory-select";
import { TagMultiSelect } from "@/components/features/expenses/tag-multiselect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { toExpenseDateInputValue } from "@/app/lib/expense-date";
import type { ExpenseRecordDto } from "@/app/lib/expense.types";
import type {
  CounterpartyRecordDto,
  SpaceCategoryRecordDto,
  UserCategoryRecordDto,
  TagRecordDto,
  TransactionModeRecordDto,
} from "@/app/lib/finance.types";

export function InlineEditRow({
  expense,
  spaceCategories,
  userCategories,
  counterparties,
  transactionModes,
  tags,
  onCancel,
}: {
  expense: ExpenseRecordDto;
  spaceCategories: SpaceCategoryRecordDto[];
  userCategories: UserCategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  tags: TagRecordDto[];
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<"expense" | "income">(expense.type);
  const [userCategoryId, setUserCategoryId] = useState<number | null>(expense.userCategoryId);
  const [amount, setAmount] = useState(expense.amount);
  const [note, setNote] = useState(expense.note ?? "");
  const [necessity, setNecessity] = useState(String(expense.necessityScore));
  const [date, setDate] = useState(toExpenseDateInputValue(new Date(expense.occurredAt)));
  const [modeId, setModeId] = useState(String(expense.transactionModeId ?? transactionModes[0]?.id ?? ""));
  const [counterPartyId, setCounterPartyId] = useState(String(expense.counterPartyId ?? ""));
  const [tagIds, setTagIds] = useState<number[]>(expense.tagIds);

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.append("expenseId", String(expense.id));
    formData.append("amount", amount);
    formData.append("type", type);
    if (userCategoryId != null) formData.append("userCategoryId", String(userCategoryId));
    formData.append("occurredAt", date);
    formData.append("transactionModeId", modeId);
    if (counterPartyId) formData.append("counterPartyId", counterPartyId);
    formData.append("note", note);
    formData.append("necessityScore", necessity);
    for (const tagId of tagIds) {
      formData.append("tagIds", String(tagId));
    }

    startTransition(async () => {
      const result = await updateExpenseAction({ error: null }, formData);
      if (result.error) setError(result.error);
    });
  }

  const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20" onClick={(e) => e.stopPropagation()}>
      {/* Date */}
      <TableCell className="min-w-32.5 py-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-full" />
      </TableCell>

      {/* Amount */}
      <TableCell className="min-w-22.5 py-2">
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-24"
        />
      </TableCell>

      {/* Type (implicit, from the selected category) */}
      <TableCell className="py-2">
        <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize">{type}</span>
      </TableCell>

      {/* Category (SpaceCategory > UserCategory) */}
      <TableCell className="min-w-72 py-2">
        <TransactionCategorySelect
          spaceCategories={spaceCategories}
          userCategories={userCategories}
          defaultUserCategoryId={userCategoryId}
          onChange={({ userCategoryId: nextId, type: nextType }) => {
            setUserCategoryId(nextId);
            if (nextType) setType(nextType);
          }}
        />
      </TableCell>

      {/* Note */}
      <TableCell className="min-w-35 py-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note…" className="h-8 w-full" />
      </TableCell>

      {/* Tags */}
      <TableCell className="min-w-40 py-2">
        <TagMultiSelect tags={tags} defaultSelectedTagIds={tagIds} onTagsChange={setTagIds} />
      </TableCell>

      {/* Mode */}
      <TableCell className="min-w-27.5 py-2">
        <select value={modeId} onChange={(e) => setModeId(e.target.value)} className={selectClass}>
          {transactionModes.map((mode) => (
            <option key={mode.id} value={String(mode.id)}>
              {mode.name}
            </option>
          ))}
        </select>
      </TableCell>

      {/* Necessity */}
      <TableCell className="min-w-15 py-2">
        <select value={necessity} onChange={(e) => setNecessity(e.target.value)} className={selectClass}>
          <option value="-1">Optional</option>
          <option value="0">Default</option>
          <option value="1">Important</option>
        </select>
      </TableCell>

      {/* Counterparty */}
      <TableCell className="min-w-30 py-2">
        <select value={counterPartyId} onChange={(e) => setCounterPartyId(e.target.value)} className={selectClass}>
          <option value="">None</option>
          {counterparties.map((cp) => (
            <option key={cp.id} value={String(cp.id)}>
              {cp.name}
            </option>
          ))}
        </select>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-2">
        <div className="flex flex-col gap-1">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-1">
            <Button type="button" size="icon-sm" onClick={handleSave} disabled={pending} title="Save" aria-label="Save">
              <Check className="size-4" />
            </Button>
            <Button type="button" size="icon-sm" variant="outline" onClick={onCancel} title="Cancel" aria-label="Cancel">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
