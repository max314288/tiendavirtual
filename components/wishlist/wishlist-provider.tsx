"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toggleWishlistAction, wishlistStateAction } from "@/lib/wishlist/actions";

type Wishlist = {
  ready: boolean;
  signedIn: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string, variantId?: string | null) => Promise<void>;
};

const WishlistContext = createContext<Wishlist | null>(null);

/** Saved product ids for the hearts. Loaded on the client so static pages stay static. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ ready: boolean; signedIn: boolean; ids: Set<string> }>({
    ready: false,
    signedIn: false,
    ids: new Set(),
  });

  useEffect(() => {
    let cancelled = false;
    wishlistStateAction().then((s) => {
      if (!cancelled) setState({ ready: true, signedIn: s.signedIn, ids: new Set(s.productIds) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const has = useCallback((id: string) => state.ids.has(id), [state.ids]);

  const toggle = useCallback(async (productId: string, variantId: string | null = null) => {
    // Optimistic update; reverted if the server disagrees.
    setState((s) => {
      const ids = new Set(s.ids);
      if (ids.has(productId)) ids.delete(productId);
      else ids.add(productId);
      return { ...s, ids };
    });
    const res = await toggleWishlistAction(productId, variantId);
    if ("needsLogin" in res) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setState((s) => {
      const ids = new Set(s.ids);
      if (res.saved) ids.add(productId);
      else ids.delete(productId);
      return { ...s, ids };
    });
  }, [router]);

  const value = useMemo(() => ({ ready: state.ready, signedIn: state.signedIn, has, toggle }), [state.ready, state.signedIn, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function HeartButton({
  productId,
  productName,
  variantId = null,
  className = "",
}: {
  productId: string;
  productName: string;
  variantId?: string | null;
  className?: string;
}) {
  const ctx = useContext(WishlistContext);
  if (!ctx) return null;
  const saved = ctx.has(productId);
  return (
    <button
      type="button"
      onClick={() => void ctx.toggle(productId, variantId)}
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${productName} de favoritos` : `Guardar ${productName} en favoritos`}
      className={`relative z-10 flex size-touch items-center justify-center rounded-full bg-surface-container-lowest/85 text-on-surface-variant shadow-surface-1 backdrop-blur transition-colors hover:text-error ${className}`}
    >
      <Heart className={`size-5 ${saved ? "fill-error text-error" : ""}`} aria-hidden />
    </button>
  );
}
