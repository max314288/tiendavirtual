import type { ComponentProps } from "react";

/** Page-width wrapper: 16px / 32px / 48px side margins, max 1360px. */
export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`mx-auto w-full max-w-page px-margin-mobile md:px-margin-tablet lg:px-margin ${className}`}
      {...props}
    />
  );
}
