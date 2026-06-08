import { redirect } from "next/navigation";
import { acceptOrganizationInvite } from "@/app/actions/auth-roles/admin.actions";
import { ROUTES } from "@/app/lib/constants";

type RouteContext = {
  params: Promise<{ inviteCode: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { inviteCode } = await params;

  await acceptOrganizationInvite(inviteCode);
  redirect(ROUTES.DASHBOARD);
}
