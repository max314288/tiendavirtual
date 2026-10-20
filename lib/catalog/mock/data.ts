import type { Brand, Category, Media, ProductAttribute, ProductDetail, ProductOption, Variant } from "../types";

// Demo catalog for API_MODE=mock. Images come from the Stitch screens
// (public/mock/catalog). Shared by the 4 demo stores.

function img(name: string, alt: string, width = 512, height = 279): Media {
  return { url: `/mock/catalog/${name}.jpg`, alt, width, height };
}

const brandList = [
  ["aura-studio", "Aura Studio"],
  ["sonic-audio", "Sonic Audio"],
  ["titan", "Titan"],
  ["artis-acoustic", "Artis Acoustic"],
  ["nordic-sound", "Nordic Sound"],
  ["urbana", "Urbana"],
  ["kallpa-home", "Kallpa Home"],
  ["andino-gear", "Andino Gear"],
  ["keyflow", "Keyflow"],
] as const;

export const brands: Brand[] = brandList.map(([slug, name]) => ({ id: `b-${slug}`, slug, name }));

const brand = (slug: (typeof brandList)[number][0]) => brands.find((b) => b.slug === slug)!;

type CategorySeed = [path: string, name: string, description: string | null, image?: Media];

const categorySeeds: CategorySeed[] = [
  ["tecnologia", "Tecnología", "Audio, wearables y accesorios para tu día a día.", img("cat-audio", "Audífonos y tecnología")],
  ["tecnologia.audio", "Audio", "Audífonos, parlantes y barras de sonido."],
  ["tecnologia.audio.audifonos", "Audífonos", "Over-ear, in-ear y deportivos."],
  ["tecnologia.audio.parlantes", "Parlantes y barras", "Sonido portátil y para tu sala."],
  ["tecnologia.wearables", "Wearables", "Relojes inteligentes y bandas."],
  ["tecnologia.accesorios", "Accesorios tech", "Teclados, mouse, cargadores y cables."],
  ["moda", "Moda", "Prendas técnicas y esenciales.", img("cat-moda", "Casaca y prendas minimalistas")],
  ["moda.casacas", "Casacas", null],
  ["moda.zapatillas", "Zapatillas", null],
  ["hogar", "Hogar", "Iluminación, cocina y decoración.", img("cat-hogar", "Lámpara y cafetera de diseño")],
  ["hogar.iluminacion", "Iluminación", null],
  ["hogar.cocina", "Cocina y café", null],
  ["accesorios", "Accesorios", "Mochilas y portabilidad.", img("cat-accesorios", "Mochila y billetera")],
];

export const categoryBase: Omit<Category, "productCount">[] = categorySeeds.map(([path, name, description, image], i) => {
  const segments = path.split(".");
  const parentPath = segments.slice(0, -1).join(".");
  return {
    id: `c-${path.replaceAll(".", "-")}`,
    slug: segments.at(-1)!,
    name,
    path,
    parentId: parentPath ? `c-${parentPath.replaceAll(".", "-")}` : null,
    depth: segments.length - 1,
    sortOrder: i,
    description,
    image: image ?? null,
  };
});

/** Mock-only fields that the backend computes (popularity, primary category). */
export type MockProduct = ProductDetail & {
  categoryPaths: string[];
  salesRank: number;
};

type OptionSeed = { name: string; values: [value: string, swatchHex?: string][] };

type ProductSeed = {
  slug: string;
  name: string;
  brand: Brand;
  shortDescription: string;
  description: string;
  categoryPath: string;
  gallery: Media[];
  price: string;
  compareAtPrice?: string;
  rating?: [avg: number, count: number];
  highlights: string[];
  attributes?: [label: string, value: string, detail?: string][];
  options?: OptionSeed[];
  /** Per-variant overrides keyed by option values joined with "/". */
  variantOverrides?: Record<string, Partial<Pick<Variant, "price" | "compareAtPrice" | "available">> & { image?: Media }>;
  stock?: number;
  allowBackorder?: boolean;
  publishedAt: string;
  salesRank: number;
};

function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((combo) => list.map((item) => [...combo, item])), [[]]);
}

function buildProduct(seed: ProductSeed): MockProduct {
  const pid = `p-${seed.slug}`;
  const options: ProductOption[] = (seed.options ?? []).map((o, oi) => ({
    id: `${pid}-o${oi}`,
    name: o.name,
    values: o.values.map(([value, swatchHex], vi) => ({ id: `${pid}-o${oi}v${vi}`, value, swatchHex: swatchHex ?? null })),
  }));

  const combos = options.length ? cartesian(options.map((o) => o.values)) : [[]];
  const skuBase = seed.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 18);
  const variants: Variant[] = combos.map((combo, i) => {
    const key = combo.map((v) => v.value).join("/");
    const o = seed.variantOverrides?.[key] ?? {};
    return {
      id: `${pid}-v${i}`,
      sku: combo.length ? `${skuBase}-${combo.map((v) => v.value.slice(0, 3).toUpperCase()).join("-")}` : skuBase,
      title: combo.map((v) => v.value).join(" / ") || "Única",
      price: o.price ?? seed.price,
      compareAtPrice: o.compareAtPrice !== undefined ? o.compareAtPrice : (seed.compareAtPrice ?? null),
      optionValueIds: combo.map((v) => v.id),
      image: o.image ?? null,
      available: o.available ?? seed.stock ?? 12,
      allowBackorder: seed.allowBackorder ?? false,
      isDefault: i === 0,
    };
  });

  const cheapest = variants.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min), variants[0]);
  const segments = seed.categoryPath.split(".");
  const breadcrumb = segments.map((_, i) => {
    const path = segments.slice(0, i + 1).join(".");
    const c = categoryBase.find((cat) => cat.path === path)!;
    return { id: c.id, name: c.name, path };
  });
  const attributes: ProductAttribute[] = (seed.attributes ?? []).map(([label, value, detail]) => ({
    label,
    value,
    detail: detail ?? null,
  }));

  return {
    id: pid,
    slug: seed.slug,
    name: seed.name,
    shortDescription: seed.shortDescription,
    description: seed.description,
    brand: seed.brand,
    featuredImage: seed.gallery[0] ?? null,
    gallery: seed.gallery,
    price: cheapest.price,
    compareAtPrice: cheapest.compareAtPrice,
    ratingAvg: seed.rating?.[0] ?? null,
    ratingCount: seed.rating?.[1] ?? 0,
    inStock: variants.some((v) => v.available > 0 || v.allowBackorder),
    highlights: seed.highlights,
    publishedAt: seed.publishedAt,
    options,
    variants,
    attributes,
    breadcrumb,
    seoTitle: null,
    seoDescription: null,
    categoryPaths: [seed.categoryPath],
    salesRank: seed.salesRank,
  };
}

const seeds: ProductSeed[] = [
  {
    slug: "aura-studio-anc-pro",
    name: "Audífonos Aura Studio ANC Pro",
    brand: brand("aura-studio"),
    shortDescription: "Over-ear inalámbricos con cancelación de ruido adaptativa y 40 h de batería.",
    description:
      "Cancelación de ruido híbrida con 4 micrófonos que se ajusta a tu entorno, transductores de 40 mm certificados Hi-Res y conexión multipunto para pasar del celular a la laptop sin volver a emparejar.",
    categoryPath: "tecnologia.audio.audifonos",
    gallery: [
      img("anc-pro-main", "Audífonos Aura Studio ANC Pro, vista principal"),
      img("anc-pro-front", "Audífonos Aura Studio ANC Pro, vista frontal"),
      img("anc-pro-side", "Audífonos Aura Studio ANC Pro, perfil lateral"),
      img("anc-pro-case", "Estuche de viaje de los audífonos"),
    ],
    price: "999.00",
    compareAtPrice: "1199.00",
    rating: [4.9, 428],
    highlights: ["ANC adaptativo", "40 h batería"],
    attributes: [
      ["Drivers", "40 mm biocelulosa", "Imán de neodimio para baja distorsión."],
      ["Respuesta de frecuencia", "10 Hz – 40 kHz", "Certificación Hi-Res Audio."],
      ["Conectividad", "Bluetooth 5.3 multipunto", "Códecs LDAC, AAC y SBC."],
      ["Batería", "40 horas", "10 minutos de carga dan hasta 5 horas de uso."],
      ["Peso", "245 g", "Almohadillas de cuero vegano."],
      ["Puertos", "USB-C / jack 3.5 mm"],
    ],
    options: [
      {
        name: "Color",
        values: [
          ["Negro mate", "#111317"],
          ["Plata", "#CBD5E1"],
          ["Azul cobalto", "#1E3A8A"],
        ],
      },
    ],
    variantOverrides: {
      Plata: { image: img("anc-pro-silver", "Audífonos Aura Studio ANC Pro en plata"), available: 3 },
      "Azul cobalto": { image: img("anc-pro-blue", "Audífonos Aura Studio ANC Pro en azul cobalto"), available: 0 },
    },
    stock: 8,
    publishedAt: "2026-09-20T15:00:00Z",
    salesRank: 1,
  },
  {
    slug: "pulse-true-wireless",
    name: "Audífonos Pulse True Wireless",
    brand: brand("sonic-audio"),
    shortDescription: "In-ear con estuche de carga compacto y resistencia IPX5.",
    description: "Audífonos in-ear ligeros con Bluetooth 5.3, modo transparencia y estuche que da tres cargas completas.",
    categoryPath: "tecnologia.audio.audifonos",
    gallery: [img("earbuds-pulse", "Audífonos Pulse True Wireless con estuche")],
    price: "429.00",
    rating: [4.8, 115],
    highlights: ["Bluetooth 5.3", "IPX5"],
    attributes: [
      ["Batería", "8 h + 24 h con estuche"],
      ["Resistencia", "IPX5", "Protección contra sudor y lluvia."],
    ],
    publishedAt: "2026-10-05T15:00:00Z",
    salesRank: 4,
  },
  {
    slug: "rover-360",
    name: "Parlante exterior Rover 360",
    brand: brand("titan"),
    shortDescription: "Parlante portátil resistente al agua con sonido 360°.",
    description: "Graves profundos en 360°, cuerpo IP67 a prueba de polvo y agua y 20 horas de reproducción.",
    categoryPath: "tecnologia.audio.parlantes",
    gallery: [img("speaker-rover", "Parlante Rover 360 en grafito")],
    price: "649.00",
    rating: [4.7, 89],
    highlights: ["IP67", "20 h batería"],
    options: [{ name: "Color", values: [["Grafito", "#3F3F46"], ["Oliva", "#4D5B3A"]] }],
    publishedAt: "2026-07-12T15:00:00Z",
    salesRank: 6,
  },
  {
    slug: "artis-hifi-abiertos",
    name: "Audífonos Hi-Fi abiertos Artis",
    brand: brand("artis-acoustic"),
    shortDescription: "Copas de nogal y drivers de 300 Ω para escucha de estudio.",
    description: "Diseño abierto con copas de madera de nogal para una escena sonora amplia y natural. Ideales con amplificador dedicado.",
    categoryPath: "tecnologia.audio.audifonos",
    gallery: [img("headphones-artis", "Audífonos Artis con copas de nogal")],
    price: "1399.00",
    rating: [5, 42],
    highlights: ["Madera de nogal", "300 Ω"],
    stock: 4,
    publishedAt: "2026-06-01T15:00:00Z",
    salesRank: 11,
  },
  {
    slug: "sport-fit-anc",
    name: "Audífonos deportivos Sport Fit ANC",
    brand: brand("sonic-audio"),
    shortDescription: "Ganchos ergonómicos, cancelación de ruido y resistencia al sudor.",
    description: "Pensados para entrenar: ganchos flexibles que no se mueven, ANC y modo ambiente para correr en la calle.",
    categoryPath: "tecnologia.audio.audifonos",
    gallery: [img("earbuds-sport", "Audífonos deportivos Sport Fit"), img("earbuds-sport-blue", "Audífonos Sport Fit en azul")],
    price: "349.00",
    compareAtPrice: "459.00",
    rating: [4.6, 310],
    highlights: ["ANC", "IPX7"],
    options: [{ name: "Color", values: [["Negro", "#111827"], ["Azul océano", "#1E3A5F"]] }],
    variantOverrides: { "Azul océano": { image: img("earbuds-sport-blue", "Audífonos Sport Fit en azul") } },
    publishedAt: "2026-08-15T15:00:00Z",
    salesRank: 3,
  },
  {
    slug: "barra-sonido-slim",
    name: "Barra de sonido Slim con subwoofer",
    brand: brand("nordic-sound"),
    shortDescription: "Barra delgada con subwoofer integrado y Dolby Atmos.",
    description: "Sonido envolvente para tu TV en una barra de 5 cm de alto. Conexión HDMI eARC y Bluetooth.",
    categoryPath: "tecnologia.audio.parlantes",
    gallery: [img("soundbar", "Barra de sonido Slim bajo un televisor")],
    price: "1299.00",
    compareAtPrice: "1499.00",
    rating: [4.5, 67],
    highlights: ["Dolby Atmos", "HDMI eARC"],
    publishedAt: "2026-05-10T15:00:00Z",
    salesRank: 9,
  },
  {
    slug: "parlante-compacto-mini",
    name: "Parlante portátil Mini",
    brand: brand("nordic-sound"),
    shortDescription: "Cilíndrico, de aluminio y con correa de transporte.",
    description: "Parlante compacto con rejilla de aluminio, 12 horas de batería y emparejamiento estéreo.",
    categoryPath: "tecnologia.audio.parlantes",
    gallery: [img("speaker-compact", "Parlante portátil Mini de aluminio")],
    price: "259.00",
    rating: [4.4, 154],
    highlights: ["12 h batería", "Estéreo TWS"],
    publishedAt: "2026-04-02T15:00:00Z",
    salesRank: 7,
  },
  {
    slug: "audifonos-olive-field",
    name: "Audífonos Field Olive",
    brand: brand("titan"),
    shortDescription: "Diadema de acero reforzado y controles físicos.",
    description: "Construidos para durar: diadema de acero, almohadillas reemplazables y controles físicos fáciles de usar con guantes.",
    categoryPath: "tecnologia.audio.audifonos",
    gallery: [img("headphones-olive", "Audífonos Field en verde oliva")],
    price: "549.00",
    rating: [4.3, 38],
    highlights: ["Acero reforzado", "30 h batería"],
    stock: 0,
    publishedAt: "2026-03-18T15:00:00Z",
    salesRank: 15,
  },
  {
    slug: "in-ear-gold-edition",
    name: "Audífonos In-Ear Gold Edition",
    brand: brand("aura-studio"),
    shortDescription: "Acabado negro mate con detalles dorados y carga inalámbrica.",
    description: "Edición especial con estuche de carga inalámbrica Qi y ajuste personalizado de ecualización en la app.",
    categoryPath: "tecnologia.audio.audifonos",
    gallery: [img("earbuds-gold", "Audífonos In-Ear Gold Edition")],
    price: "599.00",
    compareAtPrice: "699.00",
    rating: [4.7, 96],
    highlights: ["Carga Qi", "Edición limitada"],
    stock: 5,
    publishedAt: "2026-10-10T15:00:00Z",
    salesRank: 8,
  },
  {
    slug: "titan-ultra-reloj",
    name: "Reloj inteligente Titan Ultra",
    brand: brand("titan"),
    shortDescription: "Caja de titanio, pantalla OLED de zafiro y GPS de doble banda.",
    description: "Monitoreo de salud continuo, GPS preciso para tus rutas y hasta 7 días de batería.",
    categoryPath: "tecnologia.wearables",
    gallery: [img("watch-titan", "Reloj Titan Ultra con correa gris")],
    price: "1199.00",
    rating: [4.8, 94],
    highlights: ["Titanio", "GPS doble banda"],
    options: [{ name: "Tamaño", values: [["41 mm"], ["45 mm"]] }],
    variantOverrides: { "45 mm": { price: "1349.00" } },
    publishedAt: "2026-09-01T15:00:00Z",
    salesRank: 2,
  },
  {
    slug: "teclado-mecanico-keyflow",
    name: "Teclado mecánico inalámbrico Keyflow",
    brand: brand("keyflow"),
    shortDescription: "Perfil bajo, switches táctiles y detalles en nogal.",
    description: "Conecta hasta 3 dispositivos, switches hot-swap y batería de 3 meses.",
    categoryPath: "tecnologia.accesorios",
    gallery: [img("keyboard-mech", "Teclado mecánico Keyflow")],
    price: "489.00",
    rating: [4.6, 77],
    highlights: ["Hot-swap", "3 dispositivos"],
    options: [{ name: "Switch", values: [["Táctil"], ["Lineal"]] }],
    publishedAt: "2026-07-20T15:00:00Z",
    salesRank: 10,
  },
  {
    slug: "mouse-vertical-ergo",
    name: "Mouse vertical Ergo",
    brand: brand("keyflow"),
    shortDescription: "Postura natural de la muñeca y sensor de alta precisión.",
    description: "Reduce la tensión en la muñeca con un agarre vertical de 57°. Recargable por USB-C.",
    categoryPath: "tecnologia.accesorios",
    gallery: [img("mouse-vertical", "Mouse vertical Ergo azul medianoche")],
    price: "189.00",
    compareAtPrice: "229.00",
    rating: [4.5, 203],
    highlights: ["Ergonómico", "USB-C"],
    publishedAt: "2026-02-11T15:00:00Z",
    salesRank: 5,
  },
  {
    slug: "dock-carga-usbc",
    name: "Dock de carga magnética USB-C",
    brand: brand("aura-studio"),
    shortDescription: "Carga rápida de 65 W con cable trenzado.",
    description: "Dock de aluminio con carga rápida de 65 W para laptop y celular a la vez.",
    categoryPath: "tecnologia.accesorios",
    gallery: [img("dock-usbc", "Dock de carga USB-C de aluminio")],
    price: "159.00",
    rating: [4.2, 58],
    highlights: ["65 W", "Aluminio"],
    allowBackorder: true,
    stock: 0,
    publishedAt: "2026-01-25T15:00:00Z",
    salesRank: 14,
  },
  {
    slug: "soporte-audifonos-aluminio",
    name: "Soporte de aluminio para audífonos",
    brand: brand("aura-studio"),
    shortDescription: "Base con peso y cargador inalámbrico integrado.",
    description: "Ordena tu escritorio y carga tu celular mientras guardas tus audífonos.",
    categoryPath: "tecnologia.accesorios",
    gallery: [img("stand-aluminum", "Soporte de aluminio para audífonos")],
    price: "219.00",
    rating: [4.6, 31],
    highlights: ["Carga inalámbrica"],
    publishedAt: "2026-08-30T15:00:00Z",
    salesRank: 13,
  },
  {
    slug: "cable-usbc-dac",
    name: "Cable USB-C con DAC Hi-Res",
    brand: brand("artis-acoustic"),
    shortDescription: "Cable trenzado de 1.2 m con DAC de 24 bits.",
    description: "Convierte tu USB-C en una salida de audio Hi-Res de 24 bits / 96 kHz.",
    categoryPath: "tecnologia.accesorios",
    gallery: [img("cable-usbc-dac", "Cable USB-C con DAC trenzado")],
    price: "99.00",
    rating: [4.4, 22],
    highlights: ["24 bits", "1.2 m"],
    publishedAt: "2026-09-28T15:00:00Z",
    salesRank: 16,
  },
  {
    slug: "casaca-shell-impermeable",
    name: "Casaca shell impermeable Urbana",
    brand: brand("urbana"),
    shortDescription: "Cierres sellados, capucha ergonómica y tela respirable.",
    description: "Casaca técnica liviana para lluvia y viento, con costuras selladas y bolsillos internos.",
    categoryPath: "moda.casacas",
    gallery: [img("jacket-shell", "Casaca shell impermeable negra")],
    price: "459.00",
    compareAtPrice: "559.00",
    rating: [4.7, 64],
    highlights: ["Impermeable", "Respirable"],
    options: [{ name: "Talla", values: [["S"], ["M"], ["L"], ["XL"]] }],
    variantOverrides: { XL: { available: 0 } },
    publishedAt: "2026-09-12T15:00:00Z",
    salesRank: 12,
  },
  {
    slug: "zapatillas-urbanas-blancas",
    name: "Zapatillas urbanas de cuero blanco",
    brand: brand("urbana"),
    shortDescription: "Cuero blanco tiza y suela de caucho natural.",
    description: "Zapatillas minimalistas de cuero con plantilla acolchada para uso diario.",
    categoryPath: "moda.zapatillas",
    gallery: [img("sneakers-white", "Zapatillas urbanas blancas"), img("sneakers-chalk", "Zapatillas de cuero blanco tiza")],
    price: "389.00",
    rating: [4.8, 141],
    highlights: ["Cuero", "Caucho natural"],
    options: [{ name: "Talla", values: [["38"], ["39"], ["40"], ["41"], ["42"], ["43"]] }],
    variantOverrides: { "38": { available: 0 }, "43": { available: 1 } },
    publishedAt: "2026-10-01T15:00:00Z",
    salesRank: 17,
  },
  {
    slug: "lampara-escritorio-arco",
    name: "Lámpara de escritorio Arco",
    brand: brand("kallpa-home"),
    shortDescription: "Brazo en voladizo y luz LED cálida regulable.",
    description: "Lámpara escultórica con brazo de aluminio negro mate y regulación táctil de intensidad.",
    categoryPath: "hogar.iluminacion",
    gallery: [img("lamp-desk", "Lámpara de escritorio Arco")],
    price: "329.00",
    rating: [4.6, 52],
    highlights: ["LED regulable", "Aluminio"],
    publishedAt: "2026-06-22T15:00:00Z",
    salesRank: 18,
  },
  {
    slug: "cafetera-pour-over",
    name: "Cafetera pour-over de borosilicato",
    brand: brand("kallpa-home"),
    shortDescription: "Vidrio de doble pared y collar de madera.",
    description: "Prepara café de filtro con control total. Vidrio resistente al calor y filtro de acero reutilizable.",
    categoryPath: "hogar.cocina",
    gallery: [img("coffee-pourover", "Cafetera pour-over de vidrio")],
    price: "149.00",
    compareAtPrice: "179.00",
    rating: [4.9, 88],
    highlights: ["Borosilicato", "Filtro reutilizable"],
    publishedAt: "2026-05-28T15:00:00Z",
    salesRank: 19,
  },
  {
    slug: "mochila-commuter",
    name: "Mochila commuter impermeable",
    brand: brand("andino-gear"),
    shortDescription: "Nylon balístico, compartimento para laptop de 16\".",
    description: "Mochila estructurada con espalda acolchada, bolsillo antirrobo y tela repelente al agua.",
    categoryPath: "accesorios",
    gallery: [img("backpack-commuter", "Mochila commuter gris carbón"), img("backpack-black", "Mochila commuter negra")],
    price: "299.00",
    rating: [4.7, 176],
    highlights: ["Laptop 16\"", "Repelente al agua"],
    options: [{ name: "Color", values: [["Carbón", "#374151"], ["Negro", "#0B0B0F"]] }],
    variantOverrides: { Negro: { image: img("backpack-black", "Mochila commuter negra") } },
    publishedAt: "2026-08-08T15:00:00Z",
    salesRank: 20,
  },
];

export const products: MockProduct[] = seeds.map(buildProduct);

export const categories: Category[] = categoryBase.map((c) => ({
  ...c,
  productCount: products.filter((p) => p.categoryPaths.some((path) => path === c.path || path.startsWith(`${c.path}.`))).length,
}));
