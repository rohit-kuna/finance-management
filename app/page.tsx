import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Layers3, WalletCards } from "lucide-react";
import { getCurrentDbUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { AppLogo } from "@/app/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const workflowSteps = [
  {
    step: "1",
    title: "Set up the workspace",
    description: "Join with an invite or create a new organization and become admin.",
  },
  {
    step: "2",
    title: "Add budgets and payment modes",
    description: "Create categories, budgets, and personal transaction modes that match your workflow.",
  },
  {
    step: "3",
    title: "Record and review transactions",
    description: "Add transactions, review transfers, and keep daily finance activity organized.",
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentDbUser();

  if (user) {
    redirect(ROUTES.TRANSACTIONS);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(to_bottom,rgba(2,6,23,0.02),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(to_bottom,rgba(15,23,42,0.28),transparent_40%)]" />

      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 xl:px-14 2xl:px-20">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <AppLogo />
            <NavigationMenu viewport={false} className="hidden lg:block">
              <NavigationMenuList className="justify-start">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="#features">Features</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="#workflow">How it works</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="#cta">Get started</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModeToggle />
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={ROUTES.SIGN_IN}>Sign In</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href={ROUTES.SIGN_UP}>Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10 xl:px-14 2xl:px-20">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <BadgeCheck className="size-3.5 text-emerald-500" />
              Finance management for families and small teams
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Track budgets, transactions, transfers, and payment modes in one shared workspace.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Finwise keeps your finance data organized with categories, budgets, transaction modes, and
                counterparty-linked transactions built for daily use.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row" id="cta">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={ROUTES.SIGN_UP}>
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href={ROUTES.SIGN_IN}>Sign in</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Budgets", value: "Plan monthly and family spend" },
                { label: "Transactions", value: "Log and review every payment" },
                { label: "Transfers", value: "Track settled and open balances" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-primary/15 bg-background/80 shadow-xl shadow-primary/5">
            <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
              <CardTitle className="text-xl tracking-tight">Finance workspace preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                A quick view of the kind of data you manage inside Rubyana.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Monthly spend", value: "₹48,250", tone: "default" as const },
                  { label: "Open transfers", value: "₹12,000", tone: "secondary" as const },
                  { label: "Family budget", value: "₹85,000", tone: "outline" as const },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                    <Badge variant={item.tone} className="mt-3">
                      Finance summary
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Recent transactions</p>
                    <p className="text-xs text-muted-foreground">Tracked by category and payment mode</p>
                  </div>
                  <Badge variant="secondary">Default mode: Online</Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Groceries", amount: "₹2,450", mode: "Kotak", status: "Family" },
                    { title: "Fuel", amount: "₹1,200", mode: "Cash", status: "Personal" },
                    { title: "School fees", amount: "₹18,000", mode: "Online", status: "Transfer" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid via {item.mode} · {item.status}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{item.amount}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <Layers3 className="size-4 text-primary" />
                    <p className="text-sm font-semibold">Categories</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Food, transport, housing, and custom buckets.
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <WalletCards className="size-4 text-primary" />
                    <p className="text-sm font-semibold">Transaction modes</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mark one default so new transactions prefill automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="features" className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Shared organization view",
              description: "All members can contribute to a single finance workspace.",
            },
            {
              title: "Personal defaults",
              description: "Each user can keep their own default transaction mode.",
            },
            {
              title: "Mobile-friendly entry",
              description: "Quick add flows are optimized for phone-sized screens.",
            },
            {
              title: "Fast reviews",
              description: "Filter and sort records to find what matters fast.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="bg-background/80">
              <CardHeader className="px-5 pb-2 pt-5">
                <CardTitle className="text-base tracking-tight">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 text-sm text-muted-foreground">{feature.description}</CardContent>
            </Card>
          ))}
        </div>

        <div id="workflow" className="mt-10 grid gap-4 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <Card key={step.step} className="bg-background/80">
              <CardHeader className="px-5 pb-2 pt-5">
                <div className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {step.step}
                </div>
                <CardTitle className="mt-3 text-lg tracking-tight">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 text-sm text-muted-foreground">{step.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
