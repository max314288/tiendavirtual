import Link from "next/link";
import type { StoreBranding } from "@/lib/store/types";

export function Logo({ branding, storeName }: { branding: StoreBranding; storeName: string }) {
  return (
    <Link
      href="/"
      aria-label={`${storeName}, ir al inicio`}
      className="inline-flex min-h-touch shrink-0 items-center text-headline-md font-bold tracking-tight text-primary"
    >
      {branding.logoUrl ? (
        // Logos live in media_assets (local or FTP); dimensions vary per store.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt={storeName} className="h-8 w-auto" />
      ) : (
        <>
          {branding.logoText}
          <span className="text-secondary">.</span>
        </>
      )}
    </Link>
  );
}
