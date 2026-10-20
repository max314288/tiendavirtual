import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseCatalogQuery, serializeCatalogQuery } from "@/lib/catalog/query";

describe("parseCatalogQuery", () => {
  it("reads filters from the URL", () => {
    const q = parseCatalogQuery({
      q: "  audífonos ",
      marca: "titan,aura-studio",
      precio_min: "100",
      precio_max: "500",
      rating: "4",
      stock: "1",
      oferta: "1",
      orden: "precio_asc",
      pagina: "2",
    });
    expect(q).toEqual({
      q: "audífonos",
      brands: ["titan", "aura-studio"],
      priceMin: 100,
      priceMax: 500,
      ratingMin: 4,
      inStock: true,
      onSale: true,
      sort: "precio_asc",
      page: 2,
    });
  });

  it("accepts repeated marca params from a GET form and dedupes", () => {
    expect(parseCatalogQuery({ marca: ["titan", "urbana", "titan"] }).brands).toEqual(["titan", "urbana"]);
  });

  it("falls back to defaults on junk input", () => {
    const q = parseCatalogQuery({ orden: "hack", pagina: "-3", rating: "9", precio_min: "abc", precio_max: "" }, "relevancia");
    expect(q.sort).toBe("relevancia");
    expect(q.page).toBe(1);
    expect(q.ratingMin).toBeNull();
    expect(q.priceMin).toBeNull();
    expect(q.priceMax).toBeNull();
    expect(hasActiveFilters(q)).toBe(false);
  });
});

describe("serializeCatalogQuery", () => {
  it("round-trips and omits defaults", () => {
    const q = parseCatalogQuery({ marca: "titan", orden: "populares", pagina: "1", stock: "1" });
    expect(serializeCatalogQuery(q)).toBe("?marca=titan&stock=1");
    expect(parseCatalogQuery(Object.fromEntries(new URLSearchParams(serializeCatalogQuery(q))))).toEqual(q);
  });

  it("returns an empty string without filters", () => {
    expect(serializeCatalogQuery({ sort: "populares", page: 1 })).toBe("");
  });
});
