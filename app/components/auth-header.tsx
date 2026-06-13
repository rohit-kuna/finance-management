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
  DropdownMenuLabel,
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

type HeaderNavGroup = {
  label: string;
  items: HeaderNavItem[];
};

type HeaderNavConfig = {
  topItems: HeaderNavItem[];
  settingsGroups: HeaderNavGroup[];
};

const adminTopNavItems: HeaderNavItem[] = [
  { label: "Transactions", href: ROUTES.TRANSACTIONS },
  { label: "Analytics", href: ROUTES.ANALYTICS },
  { label: "Budgets", href: ROUTES.BUDGETS },
  { label: "Transfers", href: ROUTES.TRANSFERS },
];

const adminSettingsGroups: HeaderNavGroup[] = [
  {
    label: "Settings",
    items: [
      { label: "Organization", href: ROUTES.ORGANIZATION },
      { label: "Users", href: ROUTES.USERS },
      { label: "Categories", href: ROUTES.CATEGORIES },
      { label: "Tags", href: ROUTES.TAGS },
      { label: "Modes", href: ROUTES.TRANSACTION_MODES },
      { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Import Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
      { label: "Import Export (Org)", href: ROUTES.MANAGE_IMPORT_EXPORT_ORG },
      { label: "Switch organization", href: ROUTES.SWITCH_ORGANIZATION },
    ],
  },
];

const userTopNavItems: HeaderNavItem[] = [
  { label: "Transactions", href: ROUTES.TRANSACTIONS },
  { label: "Analytics", href: ROUTES.ANALYTICS },
  { label: "Budgets", href: ROUTES.BUDGETS },
  { label: "Transfers", href: ROUTES.TRANSFERS },
];

const userSettingsGroups: HeaderNavGroup[] = [
  {
    label: "Settings",
    items: [
      { label: "Subcategories", href: ROUTES.SUBCATEGORIES },
      { label: "Modes", href: ROUTES.TRANSACTION_MODES },
      { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Import Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
      { label: "Switch organization", href: ROUTES.SWITCH_ORGANIZATION },
    ],
  },
];

function getNavConfig(role: AppRole, hasOrganization: boolean): HeaderNavConfig {
  if (!hasOrganization) {
    return { topItems: [], settingsGroups: [] };
  }

  return role === ROLES.ADMIN
    ? { topItems: adminTopNavItems, settingsGroups: adminSettingsGroups }
    : { topItems: userTopNavItems, settingsGroups: userSettingsGroups };
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

function SettingsMenu({ groups }: { groups: HeaderNavGroup[] }) {
  if (!groups.length) return null;

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>More</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid w-[260px] gap-3 p-2">
          {groups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 ? <div className="mx-1 mb-2 border-t" /> : null}
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ul className="grid gap-1">
                {group.items.map((item) => (
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
            </div>
          ))}
        </div>
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
  const { topItems, settingsGroups } = getNavConfig(role, hasOrganization);
  const hasSettingsItems = settingsGroups.some((group) => group.items.length);
  const logoHref = ROUTES.DASHBOARD;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-3 md:gap-8">
          <AppLogo href={logoHref} label={organizationName ?? "Finwise Workspace"} />
          {topItems.length || hasSettingsItems ? (
            <NavigationMenu viewport={false} className="hidden md:block">
              <NavigationMenuList className="justify-start gap-1">
                {topItems.map((item) => (
                  <NavLinkItem key={item.label} item={item} />
                ))}
                <SettingsMenu groups={settingsGroups} />
              </NavigationMenuList>
            </NavigationMenu>
          ) : null}
        </div>

        {/* Right: icon buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu */}
          {topItems.length || hasSettingsItems ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[calc(100vh-5rem)] w-64 overflow-y-auto"
              >
                {topItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                {hasSettingsItems
                  ? settingsGroups.map((group) => (
                      <div key={group.label}>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                        {group.items.map((item) => (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href}>{item.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ))
                  : null}
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
