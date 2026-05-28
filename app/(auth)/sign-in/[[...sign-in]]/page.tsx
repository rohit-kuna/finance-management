import { SignIn } from "@clerk/nextjs";
import { POST_AUTH_REDIRECT, ROUTES } from "@/app/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="py-4">
        <CardContent>
          <SignIn
            path={ROUTES.SIGN_IN}
            routing="path"
            signUpUrl={ROUTES.SIGN_UP}
            fallbackRedirectUrl={POST_AUTH_REDIRECT}
          />
        </CardContent>
      </Card>
    </div>
  );
}
