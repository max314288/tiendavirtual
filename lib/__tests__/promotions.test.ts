import { describe, expect, it } from "vitest";
import { products } from "@/lib/catalog/mock/data";
import { buildCart } from "@/lib/cart/mock";
import { orderTotals } from "@/lib/checkout/mock";
import { allocate, evaluatePromotion, type PromoLine } from "@/lib/promotions/engine";
import { mockPromotions } from "@/lib/promotions/mock-data";
import type { MockCart } from "@/lib/mock-db";

const promo = (code: string) => mockPromotions.find((p) => p.code === code)!;
const NOW = new Date("2026-10-19T15:00:00Z");
const audio: PromoLine = { id: "a", lineCents: 99900, categoryPaths: ["tecnologia.audio.audifonos"] };
const home: PromoLine = { id: "h", lineCents: 14900, categoryPaths: ["hogar.cocina"] };

describe("evaluatePromotion", () => {
  it("applies a capped percentage to the whole order", () => {
    const r = evaluatePromotion(promo("BIENVENIDA10"), [audio, home], NOW);
    expect(r).toMatchObject({ ok: true, discountCents: 5000 }); // 10% = 104.80, capped at 50
  });

  it("limits uses per customer", () => {
    expect(evaluatePromotion(promo("BIENVENIDA10"), [audio], NOW, 1)).toMatchObject({ ok: false, reason: expect.stringMatching(/Ya usaste/) });
  });

  it("targets categories and enforces the minimum subtotal", () => {
    const r = evaluatePromotion(promo("AUDIO15"), [audio, home], NOW);
    expect(r).toMatchObject({ ok: true, discountCents: 14985 });
    if (r.ok) expect(r.allocations).toEqual({ a: 14985 });
    expect(evaluatePromotion(promo("AUDIO15"), [home], NOW)).toMatchObject({ ok: false });
    expect(evaluatePromotion(promo("AUDIO15"), [{ ...audio, lineCents: 20000 }], NOW)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/desde S\/\s300\.00/),
    });
  });

  it("handles free shipping and expired codes", () => {
    expect(evaluatePromotion(promo("ENVIOGRATIS"), [home], NOW)).toMatchObject({ ok: true, freeShipping: true, discountCents: 0 });
    expect(evaluatePromotion(promo("VERANO25"), [home], NOW)).toMatchObject({ ok: false, reason: expect.stringMatching(/venció/) });
  });
});

describe("allocate", () => {
  it("splits proportionally and sums exactly", () => {
    const a = allocate(1000, [
      { id: "x", lineCents: 3000, categoryPaths: [] },
      { id: "y", lineCents: 3000, categoryPaths: [] },
      { id: "z", lineCents: 3000, categoryPaths: [] },
    ]);
    expect(Object.values(a).reduce((s, v) => s + v, 0)).toBe(1000);
  });
});

describe("coupons in the cart and order", () => {
  const anc = products.find((p) => p.slug === "aura-studio-anc-pro")!.variants[0];
  const cart: MockCart = {
    id: "c",
    storeSlug: "aura",
    token: "t",
    profileId: null,
    status: "active",
    items: [{ id: "l1", variantId: anc.id, quantity: 1, unitPriceSnapshot: anc.price, addedAt: "" }],
    updatedAt: "",
    promotionCode: "AUDIO15",
  };

  it("discounts the cart and extracts IGV from the discounted amount", () => {
    const built = buildCart(cart, products, 0.18, "PEN", { promotions: mockPromotions, now: NOW, timesUsed: {} });
    expect(built.promotion).toMatchObject({ code: "AUDIO15" });
    expect(built.discountTotal).toBe("149.85");
    expect(built.total).toBe("849.15");
    expect(built.lines[0].discountAmount).toBe("149.85");
    expect(built.taxIncluded).toBe("129.53"); // 849.15 − 849.15/1.18

    const totals = orderTotals(built.lines, "12.00", 0.18);
    expect(totals).toMatchObject({ subtotal: "999.00", discountTotal: "149.85", grandTotal: "861.15" });
  });

  it("explains why a saved coupon doesn't apply", () => {
    const built = buildCart({ ...cart, promotionCode: "VERANO25" }, products, 0.18, "PEN", { promotions: mockPromotions, now: NOW, timesUsed: {} });
    expect(built.promotion).toBeNull();
    expect(built.promotionError).toMatch(/venció/);
    expect(built.discountTotal).toBe("0.00");
  });
});
