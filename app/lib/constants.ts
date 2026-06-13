export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  JOIN: "/join",
  DASHBOARD: "/dashboard",
  ANALYTICS: "/analytics",
  ORGANIZATION: "/organization",
  SWITCH_ORGANIZATION: "/switch-organization",
  USERS: "/users",
  CATEGORIES: "/categories",
  SUBCATEGORIES: "/subcategories",
  TAGS: "/tags",
  COUNTERPARTIES: "/counterparties",
  TRANSACTION_MODES: "/transaction-modes",
  BUDGETS: "/budgets",
  TRANSACTIONS: "/transactions",
  TRANSFERS: "/transfers",
  MANAGE_IMPORT_EXPORT: "/import-export",
  MANAGE_IMPORT_EXPORT_ORG: "/import-export-org",
  SERVICE_UNAVAILABLE: "/service-unavailable",
} as const;

export const PUBLIC_ROUTE_PATTERNS = [
  ROUTES.HOME,
  `${ROUTES.SIGN_IN}(.*)`,
  `${ROUTES.SIGN_UP}(.*)`,
  `${ROUTES.JOIN}(.*)`,
  ROUTES.SERVICE_UNAVAILABLE,
] as const;

export const POST_AUTH_REDIRECT = ROUTES.DASHBOARD;
