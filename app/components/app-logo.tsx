import Link from "next/link";
import Image from "next/image";

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
      <div className="flex size-9 items-center justify-center rounded-xl bg-white dark:bg-black">
        <Image src="/finwise.svg" alt="Finwise logo" width={20} height={20} className="invert dark:invert-0" />
      </div>
      <span className="max-w-40 truncate text-lg tracking-tight">{label}</span>
    </Link>
  );
}
