"use client";

import { Switch } from "@/components/ui/switch";
import { ALL_MEMBERS, type ExpenseScope } from "@/app/lib/expense-scope";
import { cn } from "@/lib/utils";

type ScopeMember = {
  id: string;
  name: string;
};

export function ScopeToggle({
  scope,
  onScopeChange,
  members,
  selectedMemberId,
  onMemberChange,
  currentUserId,
}: {
  scope: ExpenseScope;
  onScopeChange: (scope: ExpenseScope) => void;
  members: ScopeMember[];
  selectedMemberId: string;
  onMemberChange: (memberId: string) => void;
  currentUserId: string;
}) {
  const isShared = scope === "shared";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/90 px-3 py-2 shadow-sm">
        <span className={cn("text-xs font-medium uppercase tracking-wide", !isShared && "text-foreground")}>
          Personal
        </span>
        <Switch
          checked={isShared}
          onCheckedChange={(checked) => onScopeChange(checked ? "shared" : "personal")}
          aria-label="Toggle between personal and shared view"
        />
        <span className={cn("text-xs font-medium uppercase tracking-wide", isShared && "text-foreground")}>
          Shared
        </span>
      </div>

      <select
        value={selectedMemberId}
        onChange={(event) => onMemberChange(event.target.value)}
        disabled={!isShared}
        aria-label="Filter by member"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value={ALL_MEMBERS}>All members</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.id === currentUserId ? `${member.name} (You)` : member.name}
          </option>
        ))}
      </select>
    </div>
  );
}
