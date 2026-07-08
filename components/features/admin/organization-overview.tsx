import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLES } from "@/app/lib/roles";
import type { AdminDashboardData } from "@/app/lib/admin-dashboard.types";

type OrganizationOverviewProps = {
  data: AdminDashboardData;
};

export function OrganizationOverview({ data }: OrganizationOverviewProps) {
  const memberCount = data.members.length;
  const adminCount = data.members.filter((member) => member.role === ROLES.ADMIN).length;

  return (
    <section className="grid gap-6">
      <Card className="py-2">
        <CardHeader className="space-y-3 px-4 pt-6 sm:px-8 sm:pt-8">
          <Badge variant="secondary" className="w-fit">
            Space
          </Badge>
          <CardTitle className="text-3xl tracking-tight">
            Manage your space
          </CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create a space, share invite codes, and keep roles aligned with the team
            structure.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          {data.organization ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Space
                </p>
                <p className="mt-2 text-lg font-semibold">{data.organization.name}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
                <p className="mt-2 text-lg font-semibold">{memberCount}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Admins</p>
                <p className="mt-2 text-lg font-semibold">{adminCount}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6">
              <p className="font-medium">No space yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the first space to start sharing invite codes and managing access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
