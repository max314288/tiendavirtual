import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { brandingStyle } from "@/lib/branding";
import { getStore } from "@/lib/store/get-store";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return {
    title: { default: store.name, template: `%s | ${store.name}` },
    icons: store.branding.faviconUrl ? { icon: store.branding.faviconUrl } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await getStore();

  return (
    <html
      lang={store.locale}
      className={`${plusJakarta.variable} h-full`}
      style={brandingStyle(store.branding.colorOverrides)}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
