"use client";

import { Search } from "lucide-react";
import { OverlayDialog } from "./overlay-dialog";
import { SearchForm } from "./search-form";

export function MobileSearch() {
  return (
    <OverlayDialog
      variant="fullscreen"
      title="Buscar"
      triggerLabel="Buscar"
      triggerIcon={<Search className="size-6" aria-hidden />}
      triggerClassName="md:hidden"
    >
      <SearchForm autoFocus className="p-margin-mobile" />
    </OverlayDialog>
  );
}
