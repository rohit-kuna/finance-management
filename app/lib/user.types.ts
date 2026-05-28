import type { AppRole } from "@/app/lib/roles";

export type AdminUserTableRow = {
  id: number;
  clerkUserId: string;
  email: string;
  role: AppRole;
  createdAt: Date;
  updatedAt: Date;
};
