"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { ROUTES } from "@/app/lib/constants";
import { ROLES, type AppRole } from "@/app/lib/roles";
import { AppLogo } from "@/app/components/app-logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

type HeaderNavConfig = {
  topItems: HeaderNavItem[];
  settingsItems: HeaderNavItem[];
};

const adminTopNavItems: HeaderNavItem[] = [
  { label: "Activity", href: ROUTES.ACTIVITY },
  { label: "Budgets", href: ROUTES.BUDGETS },
];

const adminSettingsItems: HeaderNavItem[] = [
  { label: "Organization", href: ROUTES.ORGANIZATION },
  { label: "Switch organization", href: ROUTES.SWITCH_ORGANIZATION },
  { label: "Users", href: ROUTES.USERS },
  { label: "Categories", href: ROUTES.CATEGORIES },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
  { label: "Tags", href: ROUTES.TAGS },
  { label: "Modes", href: ROUTES.TRANSACTION_MODES },
  { label: "Transfers", href: ROUTES.TRANSFERS },
  { label: "Import Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
];

const userTopNavItems: HeaderNavItem[] = [
  { label: "Activity", href: ROUTES.ACTIVITY },
  { label: "Budgets", href: ROUTES.BUDGETS },
];

const userSettingsItems: HeaderNavItem[] = [
  { label: "Switch organization", href: ROUTES.SWITCH_ORGANIZATION },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
  { label: "Tags", href: ROUTES.TAGS },
  { label: "Modes", href: ROUTES.TRANSACTION_MODES },
  { label: "Transfers", href: ROUTES.TRANSFERS },
  { label: "Import Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
];

function getNavConfig(role: AppRole, hasOrganization: boolean): HeaderNavConfig {
  if (!hasOrganization) {
    return { topItems: [], settingsItems: [] };
  }

  return role === ROLES.ADMIN
    ? { topItems: adminTopNavItems, settingsItems: adminSettingsItems }
    : { topItems: userTopNavItems, settingsItems: userSettingsItems };
}

function NavLinkItem({ item }: { item: HeaderNavItem }) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle())}>
        <Link href={item.href}>{item.label}</Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

function SettingsMenu({ items }: { items: HeaderNavItem[] }) {
  if (!items.length) return null;

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[260px] gap-1 p-2">
          {items.map((item) => (
            <li key={item.label}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

export function AuthHeader({
  role,
  hasOrganization,
  organizationName,
  displayName,
  initials,
}: AuthHeaderProps) {
  const { signOut } = useClerk();
  const { topItems, settingsItems } = getNavConfig(role, hasOrganization);
  const logoHref = hasOrganization ? ROUTES.TRANSACTIONS : ROUTES.DASHBOARD;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-3 md:gap-8">
          <AppLogo href={logoHref} label={organizationName ?? "Finwise Workspace"} />
          {topItems.length || settingsItems.length ? (
            <NavigationMenu viewport={false} className="hidden md:block">
              <NavigationMenuList className="justify-start gap-1">
                {topItems.map((item) => (
                  <NavLinkItem key={item.label} item={item} />
                ))}
                <SettingsMenu items={settingsItems} />
              </NavigationMenuList>
            </NavigationMenu>
          ) : null}
        </div>

        {/* Right: icon buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu */}
          {topItems.length || settingsItems.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {topItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                {settingsItems.length ? (
                  <>
                    {topItems.length ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Settings</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {settingsItems.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href}>{item.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* User dropdown — avatar-only on mobile, avatar+name on desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="gap-2 md:w-auto md:px-3">
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden truncate text-sm md:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => signOut({ redirectUrl: ROUTES.HOME })}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
