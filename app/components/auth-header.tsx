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
};

type HeaderNavItem = {
  label: string;
  href: string;
  match?: "exact" | "prefix";
};

const dashboardNavItems: HeaderNavItem[] = [
  { label: "Activity", href: ROUTES.DASHBOARD_ACTIVITY, match: "prefix" },
  { label: "Billing", href: ROUTES.DASHBOARD_BILLING, match: "prefix" },
];

const adminSectionNavItems: HeaderNavItem[] = [
  { label: "Users", href: ROUTES.ADMIN_USERS, match: "prefix" },
  { label: "Settings", href: ROUTES.ADMIN_SETTINGS, match: "prefix" },
];

export function AuthHeader({ role }: AuthHeaderProps) {
  const { openUserProfile } = useClerk();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  const isInAdminSection =
    pathname === ROUTES.ADMIN || pathname.startsWith(`${ROUTES.ADMIN}/`);

  const navItems =
    role === ROLES.ADMIN
      ? isInAdminSection
        ? adminSectionNavItems
        : dashboardNavItems
      : dashboardNavItems;

  const logoHref = isInAdminSection ? ROUTES.ADMIN : ROUTES.DASHBOARD;

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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-6 py-4 lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
        <div className="flex items-center gap-8">
          <AppLogo href={logoHref} />
          <NavigationMenu viewport={false}>
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
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="max-w-56 justify-start gap-2">
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
              {role === ROLES.ADMIN ? (
                <>
                  {isInAdminSection ? (
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.DASHBOARD}>Dashboard</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.ADMIN}>Admin Home</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              ) : null}
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
