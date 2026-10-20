import { describe, expect, it } from "vitest";
import { products } from "@/lib/catalog/mock/data";
import { buildCart, checkQuantity, findVariant, mergeItems } from "@/lib/cart/mock";
import { cartTotals, freeShippingProgress, includedTaxCents, lineIssue } from "@/lib/cart/totals";
import type { MockCart } from "@/lib/mock-db";

const variant = (slug: string, i = 0) => products.find((p) => p.slug === slug)!.variants[i];

describe("totals", () => {
  it("extracts IGV from tax-inclusive prices, rounding per line", () => {
    expect(includedTaxCents(11800, 0.18)).toBe(1800);
    const t = cartTotals(
      [
        { quantity: 2, unitPrice: "999.00" },
        { quantity: 1, unitPrice: "99.00" },
      ],
      0.18,
    );
    expect(t).toEqual({ itemCount: 3, subtotal: "2097.00", discountTotal: "0.00", total: "2097.00", taxIncluded: "319.88" });
  });

  it("tracks free shipping progress", () => {
    expect(freeShippingProgress("150.00", "199.00")).toEqual({ reached: false, remaining: "49.00", percent: 75 });
    expect(freeShippingProgress("250.00", "199.00")?.reached).toBe(true);
    expect(freeShippingProgress("10.00", null)).toBeNull();
  });

  it("flags line issues by priority", () => {
    const base = { quantity: 2, unitPrice: "10.00", unitPriceSnapshot: "10.00", available: 5, allowBackorder: false };
    expect(lineIssue(base)).toBeNull();
    expect(lineIssue({ ...base, unitPriceSnapshot: "12.00" })).toBe("price_changed");
    expect(lineIssue({ ...base, available: 1 })).toBe("insufficient_stock");
    expect(lineIssue({ ...base, available: 0 })).toBe("out_of_stock");
    expect(lineIssue({ ...base, available: 0, allowBackorder: true })).toBeNull();
    expect(lineIssue(base, false)).toBe("unavailable");
  });
});

describe("mock cart", () => {
  it("validates quantity against stock and the per-line max", () => {
    const anc = findVariant(products, variant("aura-studio-anc-pro", 1).id); // Plata, 3 units
    expect(checkQuantity(anc, 3)).toEqual({ ok: true, quantity: 3 });
    expect(checkQuantity(anc, 4)).toMatchObject({ ok: false, error: expect.stringMatching(/Solo quedan 3/) });
    expect(checkQuantity(findVariant(products, variant("aura-studio-anc-pro", 2).id), 1)).toMatchObject({ ok: false });
    expect(checkQuantity(findVariant(products, variant("dock-carga-usbc").id), 5)).toEqual({ ok: true, quantity: 5 }); // backorder
    expect(checkQuantity(findVariant(products, variant("dock-carga-usbc").id), 11).ok).toBe(false);
    expect(checkQuantity(null, 1).ok).toBe(false);
  });

  it("builds a cart with totals, price-change notices and unknown variants", () => {
    const anc = variant("aura-studio-anc-pro");
    const cart: MockCart = {
      id: "c1",
      storeSlug: "aura",
      token: "t",
      profileId: null,
      status: "active",
      items: [
        { id: "l1", variantId: anc.id, quantity: 1, unitPriceSnapshot: "899.00", addedAt: "" },
        { id: "l2", variantId: "gone", quantity: 1, unitPriceSnapshot: "50.00", addedAt: "" },
      ],
      updatedAt: "",
    };
    const built = buildCart(cart, products, 0.18, "PEN");
    expect(built.lines[0]).toMatchObject({ issue: "price_changed", unitPrice: "999.00", lineTotal: "999.00" });
    expect(built.lines[1].issue).toBe("unavailable");
    expect(built.subtotal).toBe("999.00"); // unavailable line excluded
    expect(built.itemCount).toBe(1);
  });

  it("merges guest items into the customer cart, capped by stock", () => {
    const plata = variant("aura-studio-anc-pro", 1).id; // 3 units
    const merged = mergeItems(
      [{ id: "a", variantId: plata, quantity: 2, unitPriceSnapshot: "999.00", addedAt: "" }],
      [
        { id: "b", variantId: plata, quantity: 2, unitPriceSnapshot: "999.00", addedAt: "" },
        { id: "c", variantId: variant("cable-usbc-dac").id, quantity: 1, unitPriceSnapshot: "99.00", addedAt: "" },
      ],
      products,
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].quantity).toBe(3);
  });
});
