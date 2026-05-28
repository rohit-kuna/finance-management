import { SignUp } from "@clerk/nextjs";
import { POST_AUTH_REDIRECT, ROUTES } from "@/app/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="py-4">
        <CardContent>
          <SignUp
            path={ROUTES.SIGN_UP}
            routing="path"
            signInUrl={ROUTES.SIGN_IN}
            fallbackRedirectUrl={POST_AUTH_REDIRECT}
          />
        </CardContent>
      </Card>
    </div>
  );
}
