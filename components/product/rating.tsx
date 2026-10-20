import { Star } from "lucide-react";

type RatingProps = {
  average: number | null;
  count: number;
  /** Text after the count, e.g. "reseñas". Omitted on cards. */
  countLabel?: string;
  className?: string;
};

export function Rating({ average, count, countLabel, className = "" }: RatingProps) {
  if (average === null || count === 0) return null;
  const value = average.toFixed(1);
  return (
    <span
      className={`inline-flex items-center gap-1 text-label-md text-on-surface ${className}`}
      aria-label={`Calificación ${value} de 5, ${count} reseñas`}
    >
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span aria-hidden>{value}</span>
      <span className="font-normal text-on-surface-variant" aria-hidden>
        ({count}
        {countLabel ? ` ${countLabel}` : ""})
      </span>
    </span>
  );
}
