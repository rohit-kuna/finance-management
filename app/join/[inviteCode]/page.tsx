import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { acceptOrganizationInvite } from "@/app/actions/auth-roles/admin.actions";
import { getCurrentDbUser } from "@/app/lib/auth";
import { getOrganizationByInviteCode } from "@/app/actions/tables/organizations.table.actions";
import { ROUTES } from "@/app/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type JoinPageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { inviteCode } = await params;
  const organization = await getOrganizationByInviteCode(inviteCode);

  if (!organization) {
    notFound();
  }

  const currentUser = await getCurrentDbUser();

  if (currentUser) {
    await acceptOrganizationInvite(inviteCode);
    redirect(ROUTES.EXPENSES);
  }

  const redirectUrl = `${ROUTES.JOIN}/${inviteCode}`;
  const signInUrl = `${ROUTES.SIGN_IN}?redirect_url=${encodeURIComponent(redirectUrl)}`;
  const signUpUrl = `${ROUTES.SIGN_UP}?redirect_url=${encodeURIComponent(redirectUrl)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-xl py-4">
        <CardHeader className="px-4 sm:px-8">
          <CardTitle className="text-3xl tracking-tight">
            Join {organization.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-8">
          <p className="text-sm text-muted-foreground">
            Sign in with Google or your email to accept the invite and join the organization.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href={signInUrl}>Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={signUpUrl}>Create account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
