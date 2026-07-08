import { updateOrganizationNameAction } from "@/app/actions/auth-roles/admin.actions";
import type { AdminDashboardData } from "@/app/lib/admin-dashboard.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PersonalSpaceSettingsProps = {
  data: AdminDashboardData;
};

export function PersonalSpaceSettings({ data }: PersonalSpaceSettingsProps) {
  if (!data.organization) return null;

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-2xl tracking-tight">Personal space settings</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
        <p className="mb-4 text-sm text-muted-foreground">
          This is your personal space. Shared-space features like invite links, member
          management, and family budgets stay hidden here.
        </p>
        <form action={updateOrganizationNameAction} className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Space name</Label>
            <Input
              id="organizationName"
              name="name"
              defaultValue={data.organization.name}
              autoComplete="off"
              required
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto">
              Save name
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
