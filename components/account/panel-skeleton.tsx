/** Fallback for account pages; each page has its own boundary so tab switches stay instant. */
export function AccountPanelSkeleton() {
  const block = "animate-pulse rounded-lg bg-surface-container-low";
  return (
    <div className="space-y-space-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className={`${block} h-6 w-40`} />
      <div className="grid gap-space-md sm:grid-cols-2">
        <div className={`${block} h-11`} />
        <div className={`${block} h-11`} />
        <div className={`${block} h-11`} />
        <div className={`${block} h-11`} />
      </div>
    </div>
  );
}
