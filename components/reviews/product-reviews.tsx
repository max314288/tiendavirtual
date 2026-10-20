import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import type { ProductDetail } from "@/lib/catalog/types";
import { getServerEnv } from "@/lib/env";
import { approveMockReviewAction } from "@/lib/reviews/actions";
import { getProductReviews } from "@/lib/reviews/api";
import type { Review } from "@/lib/reviews/types";
import { ReviewForm } from "./review-form";

export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-outline-variant"}`} />
      ))}
    </span>
  );
}

export function ReviewItem({ review, locale, timezone }: { review: Review; locale: string; timezone: string }) {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: timezone }).format(new Date(review.createdAt));
  const pending = review.status === "pending";
  return (
    <article className="border-b border-outline-variant/30 py-space-md last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
        <span className="sr-only">{review.rating} de 5 estrellas</span>
        <Stars value={review.rating} />
        <h3 className="text-label-lg text-on-surface">{review.title}</h3>
        {pending && <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm text-on-secondary-fixed-variant">En revisión</span>}
      </div>
      <p className="mt-1 text-body-md text-on-surface">{review.body}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-space-sm text-label-sm text-on-surface-variant">
        <span>
          {review.authorName}
          {review.isMine ? " (tú)" : ""} · {date}
        </span>
        {review.verifiedPurchase && (
          <span className="inline-flex items-center gap-1 text-on-tertiary-container">
            <BadgeCheck className="size-3.5" aria-hidden />
            Compra verificada
          </span>
        )}
        {review.helpfulCount > 0 && <span>{review.helpfulCount} personas lo encontraron útil</span>}
      </p>
      {pending && review.isMine && getServerEnv().API_MODE === "mock" && (
        <form action={approveMockReviewAction} className="mt-space-xs">
          <input type="hidden" name="reviewId" value={review.id} />
          <button type="submit" className="min-h-touch text-label-sm text-secondary underline">
            Aprobar (demo, solo modo mock)
          </button>
        </form>
      )}
    </article>
  );
}

/** Reads the session: render inside <Suspense>. */
export async function ProductReviews({ product, locale, timezone }: { product: ProductDetail; locale: string; timezone: string }) {
  const data = await getProductReviews(product.id);
  const nextPath = `/producto/${product.slug}`;

  return (
    <section aria-labelledby="resenas" className="py-space-xl">
      <Container className="grid gap-space-xl lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <h2 id="resenas" className="mb-space-sm text-headline-md text-on-surface">
            Reseñas
          </h2>
          {product.ratingAvg !== null && product.ratingCount > 0 ? (
            <div className="flex items-center gap-space-sm">
              <span className="text-display-lg-mobile text-on-surface">{product.ratingAvg.toFixed(1)}</span>
              <div>
                <Stars value={product.ratingAvg} size="size-5" />
                <p className="text-body-md text-on-surface-variant">{product.ratingCount} reseñas</p>
              </div>
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
          )}

          <div className="mt-space-lg rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md">
            {data.canReview ? (
              <>
                <h3 className="mb-space-sm text-title-md text-on-surface">Escribe tu reseña</h3>
                <ReviewForm productId={product.id} />
              </>
            ) : data.mine ? (
              <p className="text-body-md text-on-surface-variant">
                {data.mine.status === "approved" ? "Gracias por tu reseña." : "Tu reseña está en revisión. La publicaremos pronto."}
              </p>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-secondary hover:underline">
                  Inicia sesión
                </Link>{" "}
                para escribir una reseña.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {data.reviews.length > 0 ? (
            data.reviews.map((r) => <ReviewItem key={r.id} review={r} locale={locale} timezone={timezone} />)
          ) : (
            <p className="text-body-md text-on-surface-variant">Todavía no hay reseñas publicadas para este producto.</p>
          )}
        </div>
      </Container>
    </section>
  );
}
