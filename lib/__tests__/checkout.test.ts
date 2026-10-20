import { describe, expect, it } from "vitest";
import { formatInvoiceNumber, formatOrderNumber, mockShippingRates, nextSequence, orderTotals } from "@/lib/checkout/mock";
import { orderProgress } from "@/lib/checkout/order-status";
import { checkoutSchema, receiptIdentityError } from "@/lib/checkout/schemas";

const base = {
  email: "lucia@example.com",
  firstName: "Lucía",
  lastName: "Quispe",
  phone: "987654321",
  recipientName: "Lucía Quispe",
  line1: "Av. Larco 1234",
  line2: "",
  city: "Miraflores",
  province: "Lima",
  postalCode: "",
  shippingRateId: "lima-std",
  invoiceKind: "receipt",
  receiptDocType: "",
  receiptDocNumber: "",
  ruc: "",
  companyName: "",
  fiscalAddress: "",
  customerNote: "",
};

describe("shipping rates", () => {
  it("offers Lima and province rates and applies free shipping to eligible ones", () => {
    expect(mockShippingRates("Lima", "100.00", "199.00").map((r) => [r.id, r.finalPrice])).toEqual([
      ["lima-std", "12.00"],
      ["lima-exp", "25.00"],
    ]);
    expect(mockShippingRates("Callao", "250.00", "199.00").map((r) => r.finalPrice)).toEqual(["0.00", "25.00"]);
    expect(mockShippingRates("Cusco", "250.00", null).map((r) => [r.id, r.finalPrice])).toEqual([["prov-std", "20.00"]]);
    expect(mockShippingRates(null, "1.00", null)).toEqual([]);
  });
});

describe("order totals", () => {
  it("adds shipping and extracts IGV from products and shipping", () => {
    expect(orderTotals([{ unitPrice: "118.00", quantity: 2 }], "11.80", 0.18)).toEqual({
      subtotal: "236.00",
      discountTotal: "0.00",
      shippingTotal: "11.80",
      taxTotal: "37.80",
      grandTotal: "247.80",
    });
  });
});

describe("numbering", () => {
  it("is gapless per key and formatted like SUNAT series", () => {
    const seq: Record<string, number> = {};
    expect(nextSequence(seq, "aura:receipt:B001")).toBe(1);
    expect(nextSequence(seq, "aura:receipt:B001")).toBe(2);
    expect(nextSequence(seq, "aura:invoice:F001")).toBe(1);
    expect(formatOrderNumber("ORD", 42)).toBe("ORD-000042");
    expect(formatInvoiceNumber("B001", 2)).toBe("B001-00000002");
  });
});

describe("checkoutSchema", () => {
  it("accepts a guest boleta with a new address", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });

  it("requires the new address fields only when no saved address is chosen", () => {
    const missing = checkoutSchema.safeParse({ ...base, line1: "", city: "" });
    expect(missing.success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, line1: "", city: "", addressId: "addr-1" }).success).toBe(true);
  });

  it("validates factura data", () => {
    const r = checkoutSchema.safeParse({ ...base, invoiceKind: "invoice", ruc: "123" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["ruc", "companyName", "fiscalAddress"]));
    expect(
      checkoutSchema.safeParse({ ...base, invoiceKind: "invoice", ruc: "20123456789", companyName: "Comercial SAC", fiscalAddress: "Av. Uno 1" })
        .success,
    ).toBe(true);
  });

  it("requires DNI/CE for boletas from S/ 700", () => {
    const form = checkoutSchema.parse(base);
    expect(receiptIdentityError(form, 699.99)).toBeNull();
    expect(receiptIdentityError(form, 700)).toMatch(/DNI/);
    const withDni = checkoutSchema.parse({ ...base, receiptDocType: "DNI", receiptDocNumber: "12345678" });
    expect(receiptIdentityError(withDni, 1500)).toBeNull();
  });
});

describe("orderProgress", () => {
  it("maps order states to timeline steps", () => {
    expect(orderProgress({ status: "confirmed", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" })).toBe(0);
    expect(orderProgress({ status: "processing", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" })).toBe(1);
    expect(orderProgress({ status: "processing", paymentStatus: "paid", fulfillmentStatus: "partial" })).toBe(2);
    expect(orderProgress({ status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled" })).toBe(3);
    expect(orderProgress({ status: "pending", paymentStatus: "unpaid", fulfillmentStatus: "unfulfilled" })).toBe(-1);
    expect(orderProgress({ status: "cancelled", paymentStatus: "refunded", fulfillmentStatus: "unfulfilled" })).toBeNull();
  });
});
