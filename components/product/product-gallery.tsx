"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Media } from "@/lib/catalog/types";

type ProductGalleryProps = {
  images: Media[];
  badges?: string[];
};

/**
 * Scroll-snap carousel: swipe on touch screens, thumbnails on tablet and up.
 * Resets to the first image when the image set changes (variant switch).
 */
export function ProductGallery({ images, badges = [] }: ProductGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const imagesKey = images.map((i) => i.url).join("|");

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
  }, [imagesKey]);

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (images.length === 0) {
    return <div className="aspect-square rounded-xl bg-surface-container-low" />;
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:aspect-[4/3]"
          aria-roledescription="carrusel"
          aria-label="Imágenes del producto"
        >
          {images.map((image, i) => (
            <div
              key={image.url}
              className="relative h-full w-full shrink-0 snap-center"
              aria-roledescription="imagen"
              aria-label={`${i + 1} de ${images.length}`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                preload={i === 0}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover mix-blend-multiply"
              />
            </div>
          ))}
        </div>
        {badges.length > 0 && (
          <div className="pointer-events-none absolute top-space-md left-space-md flex flex-col items-start gap-space-xs">
            {badges.map((b) => (
              <span key={b} className="rounded-full bg-error-container px-3 py-1 text-label-md text-on-error-container">
                {b}
              </span>
            ))}
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-space-sm flex justify-center gap-1.5 md:hidden" aria-hidden>
            {images.map((image, i) => (
              <span
                key={image.url}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-primary" : "w-1.5 bg-primary/30"}`}
              />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="hidden grid-cols-5 gap-space-sm md:grid">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver imagen ${i + 1}: ${image.alt}`}
              aria-current={i === active}
              className={`relative aspect-square overflow-hidden rounded-lg bg-surface-container-low ring-2 transition-shadow ${
                i === active ? "ring-secondary" : "ring-transparent hover:ring-outline-variant"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="10vw" className="object-cover mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
