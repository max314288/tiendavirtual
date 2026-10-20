"use client";

import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { OverlayDialog } from "@/components/layout/overlay-dialog";

/** Mobile/tablet wrapper that shows the filter form in a drawer. */
export function FiltersDrawer({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  return (
    <OverlayDialog
      variant="drawer"
      title="Filtros"
      triggerLabel={activeCount ? `Filtros, ${activeCount} activos` : "Filtros"}
      triggerIcon={
        <>
          <SlidersHorizontal className="size-5" aria-hidden />
          <span className="text-label-lg">Filtros</span>
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-label-sm text-on-secondary">
              {activeCount}
            </span>
          )}
        </>
      }
      triggerClassName="border border-outline-variant/60 px-space-md lg:hidden"
    >
      <div className="p-margin-mobile">{children}</div>
    </OverlayDialog>
  );
}
