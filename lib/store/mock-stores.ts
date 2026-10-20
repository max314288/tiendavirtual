import type { NavItem, Store } from "./types";

// Demo tenants used while the backend does not exist (API_MODE=mock).
// They mirror the 4 seed stores planned for the backend. Navigation points to
// the mock catalog (lib/catalog/mock/data.ts).

const navigation: NavItem[] = [
  { label: "Tecnología", href: "/categoria/tecnologia" },
  { label: "Moda", href: "/categoria/moda" },
  { label: "Hogar", href: "/categoria/hogar" },
  { label: "Accesorios", href: "/categoria/accesorios" },
  { label: "Novedades", href: "/buscar?orden=novedades" },
  { label: "Ofertas", href: "/buscar?oferta=1" },
];

const base = {
  archetype: "department_store",
  currencyCode: "PEN",
  locale: "es-PE",
  timezone: "America/Lima",
  taxRate: 0.18,
};

export const mockStores: Store[] = [
  {
    ...base,
    navigation: [...navigation],
    id: "0192f0a0-0000-7000-8000-000000000001",
    slug: "aura",
    freeShippingThreshold: "199.00",
    name: "Aura Store",
    announcement: "Envío gratis en Lima Metropolitana por compras desde S/ 199",
    branding: { logoText: "AURA", logoUrl: null, faviconUrl: null, colorOverrides: {} },
  },
  {
    ...base,
    navigation: [...navigation],
    id: "0192f0a0-0000-7000-8000-000000000002",
    slug: "nova",
    freeShippingThreshold: "149.00",
    name: "Nova Market",
    announcement: "Recojo gratis en tienda en 2 horas",
    branding: {
      logoText: "NOVA",
      logoUrl: null,
      faviconUrl: null,
      colorOverrides: { secondary: "#c2410c", "secondary-container": "#ea580c" },
    },
  },
  {
    ...base,
    navigation: [...navigation],
    id: "0192f0a0-0000-7000-8000-000000000003",
    slug: "kipu",
    freeShippingThreshold: null,
    name: "Kipu Hogar",
    announcement: null,
    branding: {
      logoText: "KIPU",
      logoUrl: null,
      faviconUrl: null,
      colorOverrides: { secondary: "#047857", "secondary-container": "#059669" },
    },
  },
  {
    ...base,
    navigation: [...navigation],
    id: "0192f0a0-0000-7000-8000-000000000004",
    slug: "andes",
    freeShippingThreshold: "299.00",
    name: "Andes Tech",
    announcement: "Hasta 12 cuotas sin intereses con tarjetas participantes",
    branding: {
      logoText: "ANDES",
      logoUrl: null,
      faviconUrl: null,
      colorOverrides: { secondary: "#7c3aed", "secondary-container": "#8b5cf6" },
    },
  },
];

export function getMockStore(slug: string): Store {
  const store = mockStores.find((s) => s.slug === slug);
  if (!store) {
    const known = mockStores.map((s) => s.slug).join(", ");
    throw new Error(`Unknown STORE_SLUG "${slug}". Mock stores: ${known}`);
  }
  return store;
}
