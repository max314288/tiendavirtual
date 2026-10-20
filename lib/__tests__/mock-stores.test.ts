import { describe, expect, it } from "vitest";
import { getMockStore, mockStores } from "@/lib/store/mock-stores";

describe("mock stores", () => {
  it("has 4 Peruvian demo stores with unique slugs", () => {
    expect(mockStores).toHaveLength(4);
    expect(new Set(mockStores.map((s) => s.slug)).size).toBe(4);
    for (const store of mockStores) {
      expect(store.currencyCode).toBe("PEN");
      expect(store.locale).toBe("es-PE");
    }
  });

  it("rejects an unknown slug", () => {
    expect(() => getMockStore("nope")).toThrow(/Unknown STORE_SLUG/);
  });
});
