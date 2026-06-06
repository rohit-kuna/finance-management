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
  DropdownMenuLabel,
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
  { label: "Transfers", href: ROUTES.TRANSFERS },
];

const adminSettingsItems: HeaderNavItem[] = [
  { label: "Organization", href: ROUTES.ORGANIZATION },
  { label: "Users", href: ROUTES.USERS },
  { label: "Categories", href: ROUTES.CATEGORIES },
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
  { label: "Modes", href: ROUTES.TRANSACTION_MODES },
  { label: "Import Export", href: ROUTES.MANAGE_IMPORT_EXPORT },
];

const userTopNavItems: HeaderNavItem[] = [
  { label: "Activity", href: ROUTES.ACTIVITY },
  { label: "Budgets", href: ROUTES.BUDGETS },
  { label: "Transfers", href: ROUTES.TRANSFERS },
];

const userSettingsItems: HeaderNavItem[] = [
  { label: "Counterparties", href: ROUTES.COUNTERPARTIES },
  { label: "Modes", href: ROUTES.TRANSACTION_MODES },
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
  const { topItems, settingsItems } = getNavConfig(role, hasOrganization);
  const logoHref = hasOrganization ? ROUTES.TRANSACTIONS : ROUTES.DASHBOARD;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:max-w-none lg:px-10 xl:px-14 2xl:px-20">
        <div className="flex items-center justify-between gap-3 md:justify-start md:gap-8">
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

      <div className="flex flex-wrap items-center justify-end gap-2">
          {topItems.length || settingsItems.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 md:hidden">
                  Menu
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
                  {topItems.map((item) => (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  {settingsItems.length ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel inset>Settings</DropdownMenuLabel>
                      {settingsItems.map((item) => (
                        <DropdownMenuItem key={item.label} asChild>
                          <Link href={item.href}>{item.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </>
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
