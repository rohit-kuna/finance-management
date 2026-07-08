import Link from "next/link";
import { updateOrganizationNameAction } from "@/app/actions/auth-roles/admin.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyInviteLinkButton } from "@/components/features/admin/copy-invite-link-button";
import {
  createOrganizationAction,
  regenerateOrganizationInviteAction,
} from "@/app/actions/auth-roles/admin.actions";
import type { AdminDashboardData } from "@/app/lib/admin-dashboard.types";

type OrganizationSettingsProps = {
  data: AdminDashboardData;
};

export function OrganizationSettings({ data }: OrganizationSettingsProps) {
  const inviteLink = data.inviteLink;
  const isPersonalSpace = Boolean(data.organization?.isPersonal);

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">
            {isPersonalSpace ? "Personal space setup" : "Shared space setup"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          {data.organization ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isPersonalSpace
                  ? "This space is private to you. Shared-space controls stay hidden here."
                  : "Your space is ready. Use the invite link below to add new members."}
              </p>
              <form action={updateOrganizationNameAction} className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Space name</Label>
                  <Input
                    id="organizationName"
                    name="name"
                    defaultValue={data.organization.name}
                    autoComplete="organization"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="w-full sm:w-auto">
                    Save name
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This updates the space title shown in the header and dashboard.
                </p>
              </form>
            </div>
          ) : (
            <form action={createOrganizationAction} className="space-y-4">
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
              <Button type="submit">Create space</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Invite link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          {inviteLink ? (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 font-mono text-sm break-all">
                {inviteLink}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <CopyInviteLinkButton inviteLink={inviteLink} />
                <form action={regenerateOrganizationInviteAction}>
                  <Button type="submit" variant="outline" className="w-full sm:w-auto">
                    Regenerate link
                  </Button>
                </form>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this link with teammates. When they sign in with Google or email through
                Clerk, they will be attached to this space.
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Create a space first to generate a shareable invite link.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
