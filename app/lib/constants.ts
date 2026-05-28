export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  DASHBOARD: "/dashboard",
  DASHBOARD_ACTIVITY: "/dashboard/activity",
  DASHBOARD_BILLING: "/dashboard/billing",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_SETTINGS: "/admin/settings",
  SERVICE_UNAVAILABLE: "/service-unavailable",
} as const;

export const PUBLIC_ROUTE_PATTERNS = [
  ROUTES.HOME,
  `${ROUTES.SIGN_IN}(.*)`,
  `${ROUTES.SIGN_UP}(.*)`,
  ROUTES.SERVICE_UNAVAILABLE,
] as const;

export const POST_AUTH_REDIRECT = ROUTES.HOME;
