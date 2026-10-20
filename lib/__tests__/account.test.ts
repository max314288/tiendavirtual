import { describe, expect, it } from "vitest";
import { addressSchema, pePhone, profileSchema, registerSchema } from "@/lib/account/schemas";
import { passwordStrength } from "@/lib/auth/password-strength";
import { safeNextPath } from "@/lib/auth/redirect";

const baseAddress = {
  alias: "Casa",
  recipientName: "Lucía Quispe",
  phone: "987 654 321",
  line1: "Av. Larco 1234",
  line2: "",
  city: "Miraflores",
  province: "Lima",
  postalCode: "",
  taxDocumentType: "",
  taxDocumentNumber: "",
  companyName: "",
};

describe("pePhone", () => {
  it("normalizes Peruvian mobiles", () => {
    expect(pePhone.parse("987 654 321")).toBe("987654321");
    expect(pePhone.parse("+51 987-654-321")).toBe("987654321");
  });
  it("rejects landlines and short numbers", () => {
    expect(pePhone.safeParse("014445555").success).toBe(false);
    expect(pePhone.safeParse("98765").success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    firstName: "Lucía",
    lastName: "Quispe",
    phone: "",
    email: "  Lucia@Example.COM ",
    password: "segura2026",
    passwordConfirm: "segura2026",
    acceptsTerms: "on",
  };

  it("accepts a valid sign-up and normalizes email and phone", () => {
    const r = registerSchema.parse(valid);
    expect(r.email).toBe("lucia@example.com");
    expect(r.phone).toBeNull();
    expect(r.acceptsMarketing).toBe(false);
    expect(r.acceptsTerms).toBe(true);
  });

  it("requires matching passwords, letters+digits and accepted terms", () => {
    const r = registerSchema.safeParse({ ...valid, password: "soloLetras", passwordConfirm: "otra", acceptsTerms: undefined });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["password", "acceptsTerms"]));
  });
});

describe("profileSchema", () => {
  it("treats an empty phone as null", () => {
    expect(profileSchema.parse({ firstName: "A", lastName: "B", phone: " " }).phone).toBeNull();
  });
});

describe("addressSchema", () => {
  it("accepts an address without tax document and drops stray tax fields", () => {
    const r = addressSchema.parse({ ...baseAddress, taxDocumentNumber: "123", companyName: "X" });
    expect(r).toMatchObject({ countryCode: "PE", taxDocumentType: null, taxDocumentNumber: null, companyName: null, line2: null });
  });

  it("validates DNI and RUC formats", () => {
    expect(addressSchema.safeParse({ ...baseAddress, taxDocumentType: "DNI", taxDocumentNumber: "12345678" }).success).toBe(true);
    expect(addressSchema.safeParse({ ...baseAddress, taxDocumentType: "DNI", taxDocumentNumber: "1234" }).success).toBe(false);
    const ruc = { ...baseAddress, taxDocumentType: "RUC", taxDocumentNumber: "20123456789" };
    expect(addressSchema.safeParse(ruc).success).toBe(false); // needs razón social
    expect(addressSchema.safeParse({ ...ruc, companyName: "Comercial SAC" }).success).toBe(true);
    expect(addressSchema.safeParse({ ...ruc, taxDocumentNumber: "30123456789", companyName: "X" }).success).toBe(false);
  });

  it("rejects unknown departments", () => {
    expect(addressSchema.safeParse({ ...baseAddress, province: "Madrid" }).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/cuenta/direcciones?x=1")).toBe("/cuenta/direcciones?x=1");
  });
  it("blocks open redirects", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null]) {
      expect(safeNextPath(bad)).toBe("/cuenta");
    }
  });
});

describe("passwordStrength", () => {
  it("scores length and variety", () => {
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("abcdefg1")).toBe(2);
    expect(passwordStrength("abcdefg1!")).toBe(3);
  });
});
