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
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
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
  isPersonalSpace: boolean;
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

// Personal space gets the full nav: transaction entry/metadata management
// (Transfers, Tags, Modes, Counterparties, Import Export) only ever happens
// here (see requireActiveOrgIsPersonal). Kept as its own unconditional list
// rather than a shared branch, so it can never accidentally pick up or drop
// items meant for the other space.
function getPersonalSpaceNavConfig(role: AppRole): HeaderNavConfig {
  const topItems: HeaderNavItem[] = [
    { label: "Transactions", href: ROUTES.TRANSACTIONS },
    { label: "Analytics", href: ROUTES.ANALYTICS },
    { label: "Budgets", href: ROUTES.BUDGETS },
    { label: "Categories", href: ROUTES.CATEGORIES },
    { label: "Switch space", href: ROUTES.SWITCH_ORGANIZATION },
  ];

  const settingsItems: HeaderNavItem[] = [];
  if (role === ROLES.ADMIN) {
    settingsItems.push({ label: "Space", href: ROUTES.ORGANIZATION }, { label: "Users", href: ROUTES.USERS });
  }
  settingsItems.push(
    { label: "Tags", href: ROUTES.TAGS },
    { label: "Modes", href: ROUTES.TRANSACTION_MODES },
    { label: "Counterparties", href: ROUTES.COUNTERPARTIES }
  );

  const toolsItems: HeaderNavItem[] = [
    { label: "Transfers", href: ROUTES.TRANSFERS },
    { label: "Import Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
    { label: "Import categories", href: ROUTES.IMPORT_CATEGORIES },
  ];

  return {
    topItems,
    settingsGroups: [
      { label: "Settings", items: settingsItems },
      { label: "Tools", items: toolsItems },
    ],
  };
}

// A shared space is a read-only lens — Transactions gets a read-only results
// list (see TransactionsContent), and Transfers/Tags/Modes/Counterparties/
// Import Export never appear here at all, since those all require
// transaction entry/metadata management. Space/Users stay admin-only.
function getSharedSpaceNavConfig(role: AppRole): HeaderNavConfig {
  const topItems: HeaderNavItem[] = [
    { label: "Transactions", href: ROUTES.TRANSACTIONS },
    { label: "Analytics", href: ROUTES.ANALYTICS },
    { label: "Budgets", href: ROUTES.BUDGETS },
    { label: "Categories", href: ROUTES.CATEGORIES },
    { label: "Switch space", href: ROUTES.SWITCH_ORGANIZATION },
  ];

  const settingsItems: HeaderNavItem[] = [];
  if (role === ROLES.ADMIN) {
    settingsItems.push({ label: "Space", href: ROUTES.ORGANIZATION }, { label: "Users", href: ROUTES.USERS });
  }

  return {
    topItems,
    settingsGroups: settingsItems.length ? [{ label: "Settings", items: settingsItems }] : [],
  };
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:outline-none data-[state=open]:bg-accent/50">
          More
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative top-px ml-1 transition duration-300 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-55">
        {groups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem key={item.label} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AuthHeader({
  role,
  isPersonalSpace,
  hasOrganization,
  organizationName,
  displayName,
  initials,
}: AuthHeaderProps) {
  const { signOut } = useClerk();
  const { topItems, settingsGroups } = !hasOrganization
    ? { topItems: [], settingsGroups: [] }
    : isPersonalSpace
      ? getPersonalSpaceNavConfig(role)
      : getSharedSpaceNavConfig(role);
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
