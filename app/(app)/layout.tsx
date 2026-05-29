import { getCurrentDbUser } from "@/app/lib/auth";
import { AuthHeader } from "@/app/components/auth-header";
import { ROUTES } from "@/app/lib/constants";
import { redirect } from "next/navigation";
import { ROLES } from "@/app/lib/roles";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect(ROUTES.SIGN_IN);
  const organization = user.orgId ? await getOrganizationById(user.orgId) : null;

  return (
    <>
      <AuthHeader
        role={user.role ?? ROLES.USER}
        hasOrganization={Boolean(user.orgId)}
        organizationName={organization?.name ?? null}
      />
      {children}
    </>
  );
}
