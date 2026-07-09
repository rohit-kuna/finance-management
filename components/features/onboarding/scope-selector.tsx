import { User, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  choosePersonalScopeAction,
  chooseSharedScopeAction,
} from "@/app/actions/auth-roles/onboarding.actions";

export function ScopeSelector() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">How do you want to manage?</h2>
        <p className="text-sm text-muted-foreground">
          You can always invite others to your space later.
        </p>
      </div>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Personal</CardTitle>
            <CardDescription>
              Track your own income, expenses and budgets.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            <form action={choosePersonalScopeAction}>
              <Button type="submit" className="w-full sm:w-auto">
                Continue with Personal
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Shared</CardTitle>
            <CardDescription>
              Manage finances together with others.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            <form action={chooseSharedScopeAction}>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Continue with Shared
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
