import type { Metadata } from "next";
import { MessageSquareText, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";
import { ReviewItem } from "@/components/reviews/product-reviews";
import { requireUser } from "@/lib/auth";
import { listMyReviews, listReviewable } from "@/lib/reviews/api";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Reseñas" };

const card = "rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg";

async function ReviewsContent() {
  const user = await requireUser("/cuenta/resenas");
  const [mine, pending, store] = await Promise.all([listMyReviews(user), listReviewable(user), getStore()]);

  return (
    <div className="space-y-space-lg">
      <section aria-labelledby="por-calificar" className={card}>
        <h2 id="por-calificar" className="mb-space-md text-headline-sm text-on-surface">
          Por calificar
        </h2>
        {pending.length > 0 ? (
          <ul className="grid gap-space-sm sm:grid-cols-2">
            {pending.map((p) => (
              <li key={p.productId} className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="56px" className="object-cover mix-blend-multiply" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-label-lg text-on-surface">{p.productName}</span>
                  <span className="block text-label-sm text-on-surface-variant">Pedido {p.orderNumber}</span>
                </span>
                <Link
                  href={`/producto/${p.productSlug}#resenas`}
                  className="inline-flex min-h-touch shrink-0 items-center gap-1 rounded-lg px-space-sm text-label-lg text-secondary hover:bg-surface-container"
                >
                  <Star className="size-4" aria-hidden />
                  Calificar
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-md text-on-surface-variant">No tienes productos recibidos pendientes de calificar.</p>
        )}
      </section>

      <section aria-labelledby="mis-resenas" className={card}>
        <h2 id="mis-resenas" className="mb-space-sm text-headline-sm text-on-surface">
          Mis reseñas
        </h2>
        {mine.length > 0 ? (
          mine.map((r) => (
            <div key={r.id}>
              <Link href={`/producto/${r.productSlug}#resenas`} className="mt-space-sm block text-label-md text-secondary hover:underline">
                {r.productName}
              </Link>
              <ReviewItem review={r} locale={store.locale} timezone={store.timezone} />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center py-space-lg text-center">
            <MessageSquareText className="mb-space-sm size-10 text-on-surface-variant" aria-hidden />
            <p className="text-body-md text-on-surface-variant">Aún no escribiste reseñas.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountReviewsPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <ReviewsContent />
    </Suspense>
  );
}
