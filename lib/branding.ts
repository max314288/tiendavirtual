import type { CSSProperties } from "react";

/** Theme tokens a store may override via `store_branding.color_overrides`. */
export const OVERRIDABLE_COLOR_TOKENS = [
  "primary",
  "on-primary",
  "primary-container",
  "secondary",
  "on-secondary",
  "secondary-container",
  "on-secondary-container",
  "tertiary-container",
  "on-tertiary-container",
  "surface-tint",
] as const;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const allowed = new Set<string>(OVERRIDABLE_COLOR_TOKENS);

/**
 * Turns color overrides into CSS custom properties for the root element.
 * Unknown tokens and non-hex values are dropped: the data comes from the
 * database and ends up inside a style attribute.
 */
export function brandingStyle(colorOverrides: Record<string, string>): CSSProperties {
  const style: Record<string, string> = {};
  for (const [token, value] of Object.entries(colorOverrides)) {
    if (allowed.has(token) && HEX_COLOR.test(value)) {
      style[`--color-${token}`] = value;
    }
  }
  return style as CSSProperties;
}
