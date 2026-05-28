"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUserTableRow } from "@/app/lib/user.types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const columns: ColumnDef<AdminUserTableRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "clerkUserId",
    header: "Clerk User ID",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => dateFormatter.format(new Date(row.original.createdAt)),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => dateFormatter.format(new Date(row.original.updatedAt)),
  },
];
