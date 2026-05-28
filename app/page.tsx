import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { AppLogo } from "@/app/components/app-logo";
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

export default async function HomePage() {
  const user = await getCurrentDbUser();

  if (user) {
    redirect(user.role === ROLES.ADMIN ? ROUTES.ADMIN : ROUTES.DASHBOARD);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-6 py-4 lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
          <div className="flex items-center gap-8">
            <AppLogo />
            <NavigationMenu viewport={false}>
              <NavigationMenuList className="justify-start">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="#">Product</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="#">Pricing</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="#">Docs</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button asChild variant="outline">
              <Link href={ROUTES.SIGN_IN}>Sign In</Link>
            </Button>
            <Button asChild>
              <Link href={ROUTES.SIGN_UP}>Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-5xl items-center justify-center px-6 text-center lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
        <Card className="w-full max-w-xl py-8">
          <CardHeader className="px-8">
            <CardTitle className="text-4xl font-bold tracking-tight">
              Welcome
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 text-muted-foreground">
            Fullstack Next.js management system
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
