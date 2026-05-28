import { getCurrentDbUser } from "@/app/lib/auth";
import { AuthHeader } from "@/app/components/auth-header";
import { ROUTES } from "@/app/lib/constants";
import { redirect } from "next/navigation";
import { ROLES } from "@/app/lib/roles";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect(ROUTES.SIGN_IN);

  return (
    <>
      <AuthHeader role={user.role ?? ROLES.USER} />
      {children}
    </>
  );
}
