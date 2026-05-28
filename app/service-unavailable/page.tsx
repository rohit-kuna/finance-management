import Link from "next/link";
import { ROUTES } from "@/app/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ServiceUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md py-8">
        <CardHeader className="px-8">
          <CardTitle className="text-2xl tracking-tight">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="px-8 text-sm text-muted-foreground">
          We could not complete your request right now. Please try again later.
        </CardContent>
        <CardFooter className="px-8">
          <Button asChild>
            <Link href={ROUTES.HOME}>Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.SIGN_IN}>Try sign in again</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
