export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
