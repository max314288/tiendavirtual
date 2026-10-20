import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/checkout/types";
import {
  creditNoteSeries,
  deliveredAt,
  refundAmount,
  returnableQuantities,
  returnEligibility,
  returnProgress,
  validateReturnItems,
} from "@/lib/orders/post-sale";

const line = (id: string, unitPrice: string, quantity: number, fulfilled = quantity, returned = 0) => ({
  id,
  productSlug: id,
  productName: id,
  variantTitle: "Única",
  sku: id,
  image: null,
  unitPrice,
  quantity,
  lineTotal: (Number(unitPrice) * quantity).toFixed(2),
  quantityFulfilled: fulfilled,
  quantityReturned: returned,
});

function order(patch: Partial<Order> = {}): Order {
  return {
    number: "ORD-000001",
    status: "completed",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    placedAt: "2026-10-01T15:00:00Z",
    email: "a@b.pe",
    customerName: "A B",
    currencyCode: "PEN",
    lines: [line("a", "100.00", 2), line("b", "50.00", 1)],
    subtotal: "250.00",
    discountTotal: "0.00",
    shippingTotal: "12.00",
    taxTotal: "39.97",
    grandTotal: "262.00",
    shippingAddress: { recipientName: "A", phone: "987654321", line1: "x", line2: null, city: "x", province: "Lima", postalCode: null, countryCode: "PE" },
    shippingMethod: { name: "Envío estándar", estimatedDays: "2 a 3 días" },
    payment: { provider: "manual", method: "x", brand: null, last4: null, reference: null },
    invoice: null,
    promotion: null,
    refundedTotal: "0.00",
    shipments: [
      { id: "s1", carrier: "Olva", trackingNumber: "1", trackingUrl: null, status: "delivered", shippedAt: "2026-10-02T15:00:00Z", deliveredAt: "2026-10-04T15:00:00Z", items: [] },
    ],
    returns: [],
    refunds: [],
    history: [],
    ...patch,
  };
}

describe("post-sale", () => {
  it("knows when an order was delivered", () => {
    expect(deliveredAt(order())).toBe("2026-10-04T15:00:00Z");
    expect(deliveredAt(order({ shipments: [] }))).toBeNull();
    expect(deliveredAt(order({ shipments: [{ ...order().shipments[0], status: "in_transit", deliveredAt: null }] }))).toBeNull();
  });

  it("allows returns within 30 days of delivery", () => {
    expect(returnEligibility(order(), new Date("2026-10-20T00:00:00Z"))).toMatchObject({ eligible: true, until: "2026-11-03T15:00:00.000Z" });
    expect(returnEligibility(order(), new Date("2026-11-04T00:00:00Z"))).toMatchObject({ eligible: false });
    expect(returnEligibility(order({ shipments: [] }), new Date("2026-10-05"))).toMatchObject({ eligible: false });
    expect(returnEligibility(order({ status: "cancelled" }), new Date("2026-10-05"))).toMatchObject({ eligible: false });
  });

  it("subtracts returned and pending units from what can be returned", () => {
    const o = order({
      lines: [line("a", "100.00", 2, 2, 1), line("b", "50.00", 1)],
      returns: [
        { id: "r", number: "DEV-1", orderNumber: "ORD-000001", status: "requested", reason: "x", comment: null, createdAt: "", refundAmount: "50.00", items: [{ orderLineId: "b", productName: "b", quantity: 1, condition: "new" }] },
      ],
    });
    expect(returnableQuantities(o)).toEqual({ a: 1, b: 0 });
    expect(validateReturnItems(o, [{ orderLineId: "a", quantity: 1 }])).toBeNull();
    expect(validateReturnItems(o, [{ orderLineId: "a", quantity: 2 }])).toMatch(/supera/);
    expect(validateReturnItems(o, [{ orderLineId: "zz", quantity: 1 }])).toMatch(/no pertenece/);
    expect(validateReturnItems(o, [{ orderLineId: "a", quantity: 0 }])).toMatch(/al menos/);
  });

  it("refunds the price paid without shipping and picks the credit note series", () => {
    expect(refundAmount(order(), [{ orderLineId: "a", quantity: 2 }, { orderLineId: "b", quantity: 1 }])).toBe("250.00");
    expect(creditNoteSeries("receipt")).toBe("BC01");
    expect(creditNoteSeries("invoice")).toBe("FC01");
  });

  it("maps return status to steps", () => {
    expect(returnProgress("requested")).toBe(0);
    expect(returnProgress("refunded")).toBe(3);
    expect(returnProgress("rejected")).toBeNull();
  });
});
