import { describe, expect, it } from "vitest";
import { brandingStyle } from "@/lib/branding";

describe("brandingStyle", () => {
  it("maps allowed tokens to CSS custom properties", () => {
    expect(brandingStyle({ secondary: "#c2410c", "on-primary": "#fff" })).toEqual({
      "--color-secondary": "#c2410c",
      "--color-on-primary": "#fff",
    });
  });

  it("drops unknown tokens and non-hex values", () => {
    expect(
      brandingStyle({
        background: "#000000",
        secondary: "red; background: url(x)",
        primary: "#12345",
      }),
    ).toEqual({});
  });
});
