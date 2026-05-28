import { getCurrentDbUser } from "@/app/lib/auth";
import { AuthHeader } from "@/app/components/auth-header";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();

  if (!user) redirect(ROUTES.SIGN_IN);
  if (user.role !== ROLES.ADMIN) redirect(ROUTES.HOME);

  return (
    <>
      <AuthHeader role={ROLES.ADMIN} />
      {children}
    </>
  );
}
