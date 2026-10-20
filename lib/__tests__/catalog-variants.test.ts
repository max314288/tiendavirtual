import { describe, expect, it } from "vitest";
import { products } from "@/lib/catalog/mock/data";
import { toDetail } from "@/lib/catalog/mock/engine";
import { discountPercent, savings } from "@/lib/catalog/pricing";
import { defaultVariant, findVariant, isValuePurchasable, selectionFor, stockStatus, variantForChoice } from "@/lib/catalog/variants";
import { pageWindow } from "@/components/catalog/pagination";

const product = (slug: string) => toDetail(products.find((p) => p.slug === slug)!);

describe("variants", () => {
  it("picks the requested variant, else the default purchasable one", () => {
    const anc = product("aura-studio-anc-pro");
    expect(defaultVariant(anc, anc.variants[2].id).id).toBe(anc.variants[2].id);
    expect(defaultVariant(anc).id).toBe(anc.variants[0].id);
    const shoes = product("zapatillas-urbanas-blancas"); // size 38 (first) is sold out
    expect(defaultVariant(shoes).title).toBe("39");
  });

  it("maps a selection back to its variant", () => {
    const anc = product("aura-studio-anc-pro");
    const v = anc.variants[1];
    expect(findVariant(anc, selectionFor(anc, v))?.id).toBe(v.id);
  });

  it("flags sold-out option values", () => {
    const anc = product("aura-studio-anc-pro");
    const color = anc.options[0];
    const blue = color.values.find((v) => v.value === "Azul cobalto")!;
    expect(isValuePurchasable(anc, selectionFor(anc, anc.variants[0]), color.id, blue.id)).toBe(false);
    expect(variantForChoice(anc, {}, color.id, blue.id).title).toBe("Azul cobalto");
  });

  it("reports stock status", () => {
    const anc = product("aura-studio-anc-pro");
    expect(stockStatus(anc.variants[0])).toBe("in_stock"); // 8 > threshold
    expect(stockStatus(anc.variants[1])).toBe("low_stock"); // 3
    expect(stockStatus(anc.variants[2])).toBe("out_of_stock");
    expect(stockStatus(product("dock-carga-usbc").variants[0])).toBe("backorder");
  });
});

describe("pricing", () => {
  it("computes discount and savings", () => {
    expect(discountPercent("999.00", "1199.00")).toBe(17);
    expect(discountPercent("100.00", "100.00")).toBeNull();
    expect(discountPercent("100.00", null)).toBeNull();
    expect(savings("999.00", "1199.00")).toBe("200.00");
    expect(savings("0.10", "0.30")).toBe("0.20");
  });
});

describe("pageWindow", () => {
  it("shows neighbours and gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 12)).toEqual([1, "gap", 4, 5, 6, "gap", 12]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });
});
