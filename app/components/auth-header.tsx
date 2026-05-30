"use client";

import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/app/lib/constants";
import { ROLES, type AppRole } from "@/app/lib/roles";
import { AppLogo } from "@/app/components/app-logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
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
};

type HeaderNavItem = {
  label: string;
  href: string;
  match?: "exact" | "prefix";
};

const adminNavItems: HeaderNavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, match: "exact" },
  { label: "Activity", href: ROUTES.ACTIVITY, match: "prefix" },
  { label: "Organization", href: ROUTES.ORGANIZATION, match: "prefix" },
  { label: "Users", href: ROUTES.USERS, match: "prefix" },
  { label: "Categories", href: ROUTES.CATEGORIES, match: "prefix" },
  { label: "Budgets", href: ROUTES.BUDGETS, match: "prefix" },
  { label: "Expenses", href: ROUTES.EXPENSES, match: "prefix" },
  { label: "Transfers", href: ROUTES.TRANSFERS, match: "prefix" },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES, match: "prefix" },
  { label: "Transaction modes", href: ROUTES.TRANSACTION_MODES, match: "prefix" },
];

const userNavItems: HeaderNavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, match: "exact" },
  { label: "Activity", href: ROUTES.ACTIVITY, match: "prefix" },
  { label: "Budgets", href: ROUTES.BUDGETS, match: "prefix" },
  { label: "Expenses", href: ROUTES.EXPENSES, match: "prefix" },
  { label: "Transfers", href: ROUTES.TRANSFERS, match: "prefix" },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES, match: "prefix" },
  { label: "Transaction modes", href: ROUTES.TRANSACTION_MODES, match: "prefix" },
];

const dashboardNavItem: HeaderNavItem = {
  label: "Dashboard",
  href: ROUTES.DASHBOARD,
  match: "exact",
};

export function AuthHeader({ role, hasOrganization, organizationName }: AuthHeaderProps) {
  const { openUserProfile } = useClerk();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  const navItems =
    role === ROLES.ADMIN
      ? hasOrganization
        ? adminNavItems
        : [dashboardNavItem]
      : hasOrganization
        ? userNavItems
        : [dashboardNavItem];

  const logoHref = ROUTES.DASHBOARD;

  const displayName = useMemo(() => {
    if (!isLoaded) return "Loading";
    if (!user) return "User";
    return (
      user.fullName ??
      user.firstName ??
      user.username ??
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ??
      "User"
    );
  }, [isLoaded, user]);

  const initials = useMemo(() => {
    const cleaned = displayName.trim();
    if (!cleaned) return "U";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [displayName]);

  function isNavItemActive(item: HeaderNavItem) {
    const { href, match = "exact" } = item;
    if (href === "#") return false;

    if (match === "prefix") {
      return pathname === href || pathname.startsWith(`${href}/`);
    }

    return pathname === href;
  }

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
                    <NavigationMenuLink
                      asChild
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isNavItemActive(item) && "bg-accent/50 text-accent-foreground"
                      )}
                    >
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
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.DASHBOARD}>Dashboard</Link>
                </DropdownMenuItem>
                {hasOrganization ? (
                  <>
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
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-40 justify-start gap-2 sm:max-w-56">
                {isLoaded ? (
                  <Avatar size="sm">
                    <AvatarImage src={user?.imageUrl} alt={displayName} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Spinner className="size-4" />
                )}
                <span className="truncate text-sm">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={ROUTES.DASHBOARD}>Dashboard</Link>
              </DropdownMenuItem>
              {hasOrganization ? (
                <>
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
                  <DropdownMenuSeparator />
                </>
              ) : (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem onSelect={() => openUserProfile()}>
                Profile settings
              </DropdownMenuItem>
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
