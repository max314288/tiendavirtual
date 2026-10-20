import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/money";

const normalize = (s: string) => s.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("formats PEN for es-PE with two decimals", () => {
    expect(normalize(formatMoney("1299.9", "PEN", "es-PE"))).toBe("S/ 1,299.90");
    expect(normalize(formatMoney(0, "PEN", "es-PE"))).toBe("S/ 0.00");
  });
});
