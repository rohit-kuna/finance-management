import { getAllUsersForAdmin } from "@/app/actions/auth-roles/admin.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function AdminUsersPage() {
  const users = await getAllUsersForAdmin();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl flex-col justify-center p-6">
      <Card className="py-8">
        <CardHeader className="px-8">
          <CardTitle className="text-3xl tracking-tight">Users</CardTitle>
        </CardHeader>
        <CardContent className="px-8">
          <DataTable columns={columns} data={users} />
        </CardContent>
      </Card>
    </main>
  );
}
