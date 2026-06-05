import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ROUTES } from "@/app/lib/constants";
import { ROLES, type AppRole } from "@/app/lib/roles";
import { AppLogo } from "@/app/components/app-logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AuthHeaderProps = {
  role: AppRole;
  hasOrganization: boolean;
  organizationName?: string | null;
  displayName: string;
  initials: string;
};

type HeaderNavItem = {
  label: string;
  href: string;
};

const adminNavItems: HeaderNavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD },
  { label: "Activity", href: ROUTES.ACTIVITY },
  { label: "Organization", href: ROUTES.ORGANIZATION },
  { label: "Users", href: ROUTES.USERS },
  { label: "Categories", href: ROUTES.CATEGORIES },
  { label: "Budgets", href: ROUTES.BUDGETS },
  { label: "Expenses", href: ROUTES.EXPENSES },
  { label: "Transfers", href: ROUTES.TRANSFERS },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
  { label: "Modes", href: ROUTES.TRANSACTION_MODES },
];

const userNavItems: HeaderNavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD },
  { label: "Activity", href: ROUTES.ACTIVITY },
  { label: "Budgets", href: ROUTES.BUDGETS },
  { label: "Expenses", href: ROUTES.EXPENSES },
  { label: "Transfers", href: ROUTES.TRANSFERS },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
  { label: "Modes", href: ROUTES.TRANSACTION_MODES },
  { label: "Import / Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
];

const dashboardNavItem: HeaderNavItem = {
  label: "Dashboard",
  href: ROUTES.DASHBOARD,
};

function getNavItems(role: AppRole, hasOrganization: boolean) {
  if (!hasOrganization) return [dashboardNavItem];
  return role === ROLES.ADMIN ? adminNavItems : userNavItems;
}

export function AuthHeader({
  role,
  hasOrganization,
  organizationName,
  displayName,
  initials,
}: AuthHeaderProps) {
  const navItems = getNavItems(role, hasOrganization);
  const logoHref = ROUTES.DASHBOARD;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
        <div className="flex items-center justify-between gap-3 md:justify-start md:gap-8">
          <AppLogo href={logoHref} label={organizationName ?? "Finwise Workspace"} />
          {navItems.length ? (
            <NavigationMenu viewport={false} className="hidden md:block">
              <NavigationMenuList className="justify-start">
                {navItems.map((item) => (
                  <NavigationMenuItem key={item.label}>
                    <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle())}>
                      <Link href={item.href}>{item.label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {navItems.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 md:hidden">
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-40 justify-start gap-2 sm:max-w-56">
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasOrganization ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.DASHBOARD}>Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.ACTIVITY}>Activity</Link>
                  </DropdownMenuItem>
                  {role === ROLES.ADMIN ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={ROUTES.ORGANIZATION}>Organization</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={ROUTES.USERS}>Users</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={ROUTES.CATEGORIES}>Categories</Link>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.BUDGETS}>Budgets</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.EXPENSES}>Expenses</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.TRANSFERS}>Transfers</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.COUNTERPARTIES}>Counterparties</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.TRANSACTION_MODES}>Transaction modes</Link>
                  </DropdownMenuItem>
                  {role === ROLES.ADMIN ? (
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.MANAGE_IMPORT_EXPORT}>Import / Export</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                </>
              ) : (
                <DropdownMenuSeparator />
              )}
              <SignOutButton redirectUrl={ROUTES.HOME}>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
