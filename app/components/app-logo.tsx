import Link from "next/link";
import { Box } from "lucide-react";

type AppLogoProps = {
  href?: string;
  label?: string;
};

export function AppLogo({ href = "/", label = "Finwise" }: AppLogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 shrink-0 items-center gap-5 font-semibold leading-none"
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Box className="h-4 w-4" />
      </div>
      <span className="max-w-40 truncate text-lg tracking-tight">{label}</span>
    </Link>
  );
}
