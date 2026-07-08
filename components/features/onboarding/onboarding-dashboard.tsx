"use client";

import { AlertCircle, KeyRound, ShieldPlus, Star, Users } from "lucide-react";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createOrganizationFromOnboardingAction,
  createPersonalSpaceAction,
  joinOrganizationByInviteCodeAction,
  openOrganizationAction,
  setDefaultOrganizationAction,
} from "@/app/actions/auth-roles/onboarding.actions";
import { onboardingInitialState } from "@/app/actions/auth-roles/onboarding.types";

export type OnboardingOrganization = {
  orgId: number;
  orgName: string;
  role: string;
  isDefault: boolean;
};

function SubmitButton({
  children,
  pending,
}: {
  children: string;
  pending: boolean;
}) {
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {children}
    </Button>
  );
}

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function OnboardingDashboard({
  organizations = [],
}: {
  organizations?: OnboardingOrganization[];
}) {
  const [joinState, joinAction, joinPending] = useActionState(
    joinOrganizationByInviteCodeAction,
    onboardingInitialState
  );
  const [createState, createAction, createPending] = useActionState(
    createOrganizationFromOnboardingAction,
    onboardingInitialState
  );
  const [createSpaceType, setCreateSpaceType] = useState<"personal" | "shared">("shared");

  return (
    <div className="space-y-6">
      {organizations.length > 0 && (
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Your spaces</CardTitle>
            <CardDescription>
              Open one of your existing spaces, or set one as your default landing
              space.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
            {organizations.map((org) => (
              <div
                key={org.orgId}
                className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{org.orgName}</p>
                    <Badge variant="secondary">{org.role}</Badge>
                    {org.isDefault && (
                      <Badge variant="success" className="gap-1">
                        <Star className="size-3" /> Default
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!org.isDefault && (
                    <form action={setDefaultOrganizationAction}>
                      <input type="hidden" name="orgId" value={org.orgId} />
                      <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
                        <Star className="size-3.5" /> Set as default
                      </Button>
                    </form>
                  )}
                  <form action={openOrganizationAction}>
                    <input type="hidden" name="orgId" value={org.orgId} />
                    <Button type="submit" variant="outline" size="sm">
                      Open
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Join a space</CardTitle>
          <CardDescription>
            Enter an invite code to join an existing team and open the shared dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <form action={joinAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                placeholder="Paste invite code here"
                autoComplete="off"
                required
              />
            </div>
            <ActionError message={joinState.error} />
            <SubmitButton pending={joinPending}>
              {joinPending ? "Joining..." : "Join space"}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldPlus className="size-5" />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Create a new space
          </CardTitle>
          <CardDescription>
            Start from scratch and become the admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="inline-flex rounded-lg border bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setCreateSpaceType("personal")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                createSpaceType === "personal"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setCreateSpaceType("shared")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                createSpaceType === "shared"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Shared
            </button>
          </div>

          {createSpaceType === "personal" ? (
            <>
              <p className="text-sm text-muted-foreground">
                A solo space called “My Space” — just for you, no invites needed.
              </p>
              <form action={createPersonalSpaceAction}>
                <Button type="submit" className="w-full sm:w-auto">
                  Create personal space
                </Button>
              </form>
            </>
          ) : (
            <>
              <form action={createAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Space name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Acme Finance"
                    autoComplete="organization"
                    required
                  />
                </div>
                <ActionError message={createState.error} />
                <SubmitButton pending={createPending}>
                  {createPending ? "Creating..." : "Create shared space"}
                </SubmitButton>
              </form>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                After creation, you’ll land in the admin dashboard where you can manage members,
                regenerate invite codes, and share the invite link.
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </section>
    </div>
  );
}
