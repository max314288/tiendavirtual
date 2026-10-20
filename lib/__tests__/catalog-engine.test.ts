import { describe, expect, it } from "vitest";
import { products } from "@/lib/catalog/mock/data";
import { listMockProducts } from "@/lib/catalog/mock/engine";
import { PAGE_SIZE, parseCatalogQuery } from "@/lib/catalog/query";

const list = (params: Record<string, string>, scope = {}) => listMockProducts(products, parseCatalogQuery(params), scope);

describe("listMockProducts", () => {
  it("scopes to a category subtree", () => {
    const r = list({}, { categoryPath: "tecnologia.audio" });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((p) => products.find((m) => m.id === p.id)!.categoryPaths[0].startsWith("tecnologia.audio"))).toBe(true);
  });

  it("matches search text ignoring accents and case", () => {
    const r = list({ q: "AUDIFONOS aura" });
    expect(r.items.map((p) => p.slug)).toContain("aura-studio-anc-pro");
    expect(r.items.every((p) => p.brand.name === "Aura Studio")).toBe(true);
  });

  it("keeps brand facets stable when a brand filter is applied", () => {
    const all = list({}, { categoryPath: "tecnologia" });
    const filtered = list({ marca: "titan" }, { categoryPath: "tecnologia" });
    expect(filtered.facets.brands).toEqual(all.facets.brands);
    expect(filtered.items.every((p) => p.brand.slug === "titan")).toBe(true);
  });

  it("filters by price, rating, stock and sale", () => {
    const r = list({ precio_min: "200", precio_max: "600", rating: "4.5", stock: "1", oferta: "1" });
    for (const p of r.items) {
      expect(Number(p.price)).toBeGreaterThanOrEqual(200);
      expect(Number(p.price)).toBeLessThanOrEqual(600);
      expect(p.ratingAvg).toBeGreaterThanOrEqual(4.5);
      expect(p.inStock).toBe(true);
      expect(Number(p.compareAtPrice)).toBeGreaterThan(Number(p.price));
    }
  });

  it("sorts by price and paginates", () => {
    const asc = list({ orden: "precio_asc" });
    const prices = asc.items.map((p) => Number(p.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(asc.items).toHaveLength(Math.min(PAGE_SIZE, asc.total));
    const page2 = list({ orden: "precio_asc", pagina: "2" });
    expect(page2.items).toHaveLength(asc.total - PAGE_SIZE);
    expect(page2.items[0].id).not.toBe(asc.items[0].id);
  });
});
