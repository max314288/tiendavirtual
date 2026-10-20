"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

type OverlayDialogProps = {
  /** Accessible label for the button that opens the dialog. */
  triggerLabel: string;
  triggerIcon: ReactNode;
  triggerClassName?: string;
  title: string;
  /** "drawer" slides from the left; "fullscreen" covers the viewport. */
  variant: "drawer" | "fullscreen";
  /** Clicking a link or submitting a form inside closes the dialog. */
  children: ReactNode;
};

const panelByVariant = {
  drawer:
    "mr-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none -translate-x-full open:translate-x-0 starting:open:-translate-x-full",
  fullscreen:
    "h-dvh max-h-none w-screen max-w-none opacity-0 open:opacity-100 starting:open:opacity-0",
} as const;

/**
 * Native <dialog> (focus trap, Escape and inert page for free) with an
 * enter transition. Used by the mobile menu and the mobile search.
 */
export function OverlayDialog({
  triggerLabel,
  triggerIcon,
  triggerClassName = "",
  title,
  variant,
  children,
}: OverlayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center gap-space-xs rounded-lg text-on-surface hover:bg-surface-container-low ${triggerClassName}`}
      >
        {triggerIcon}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target === e.currentTarget || target.closest("a")) close();
        }}
        onSubmit={close}
        className={`m-0 bg-surface-container-lowest p-0 text-on-surface shadow-surface-2 transition-[translate,opacity,display,overlay] transition-discrete duration-200 ease-out backdrop:bg-backdrop backdrop:backdrop-blur-[4px] ${panelByVariant[variant]}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant/40 px-margin-mobile py-space-sm">
            <span className="text-title-md">{title}</span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={close}
              className="inline-flex size-touch items-center justify-center rounded-lg hover:bg-surface-container-low"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </dialog>
    </>
  );
}
