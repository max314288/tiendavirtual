import type { Metadata } from "next";
import { Package, Wallet } from "lucide-react";
import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { Container } from "@/components/layout/container";
import { getCustomer } from "@/lib/account/api";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = {
  title: { default: "Mi cuenta", template: "%s | Mi cuenta" },
  robots: { index: false },
};

export default function AccountLayout({ children }: LayoutProps<"/cuenta">) {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountFrame>{children}</AccountFrame>
    </Suspense>
  );
}

async function AccountFrame({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/cuenta");
  const [customer, store] = await Promise.all([getCustomer(user), getStore()]);
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email;
  const initials = (customer.firstName[0] ?? customer.email[0]).toUpperCase() + (customer.lastName[0] ?? "").toUpperCase();
  const since = new Intl.DateTimeFormat(store.locale, { month: "long", year: "numeric", timeZone: store.timezone }).format(
    new Date(customer.createdAt),
  );

  return (
    <>
      <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <Container className="flex flex-col gap-space-lg py-space-lg lg:flex-row lg:items-center lg:justify-between lg:py-space-xl">
          <div className="flex min-w-0 items-center gap-space-md">
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-headline-sm text-on-primary md:size-20"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-headline-md text-on-surface">{name}</h1>
              <p className="truncate text-body-md text-on-surface-variant">
                {customer.email} · Cliente desde {since}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-space-sm sm:flex">
            <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md py-2.5">
              <Package className="size-5 text-secondary" aria-hidden />
              <div className="flex flex-col-reverse">
                <dt className="text-label-sm text-on-surface-variant">Pedidos</dt>
                <dd className="text-title-md text-on-surface">{customer.totalOrders}</dd>
              </div>
            </div>
            <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md py-2.5">
              <Wallet className="size-5 text-secondary" aria-hidden />
              <div className="flex flex-col-reverse">
                <dt className="text-label-sm text-on-surface-variant">Total comprado</dt>
                <dd className="text-title-md text-on-surface">{formatMoney(customer.totalSpent, store.currencyCode, store.locale)}</dd>
              </div>
            </div>
          </dl>
        </Container>
      </section>

      <Container className="grid grid-cols-1 items-start gap-space-lg py-space-lg lg:grid-cols-12 lg:gap-gutter lg:py-space-xl">
        <aside className="lg:sticky lg:top-40 lg:col-span-3">
          <AccountNav />
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </Container>
    </>
  );
}

function AccountSkeleton() {
  const block = "animate-pulse rounded-lg bg-surface-container-low";
  return (
    <div aria-busy="true">
      <span className="sr-only">Cargando tu cuenta…</span>
      <Container className="flex items-center gap-space-md py-space-xl">
        <div className={`${block} size-20 rounded-full`} />
        <div className="space-y-space-sm">
          <div className={`${block} h-6 w-48`} />
          <div className={`${block} h-4 w-64`} />
        </div>
      </Container>
      <Container className="grid gap-gutter lg:grid-cols-12">
        <div className={`${block} h-48 lg:col-span-3`} />
        <div className={`${block} h-96 lg:col-span-9`} />
      </Container>
    </div>
  );
}
