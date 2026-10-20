import { CartUIProvider } from "@/components/cart/cart-ui";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { getStore } from "@/lib/store/get-store";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();

  return (
    <CartUIProvider>
      <WishlistProvider>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-space-md focus:py-space-sm focus:text-on-primary"
        >
          Saltar al contenido
        </a>
        <Header store={store} />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer store={store} />
      </WishlistProvider>
    </CartUIProvider>
  );
}
