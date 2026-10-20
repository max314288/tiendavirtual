import { FlaskConical } from "lucide-react";
import type { Order } from "@/lib/checkout/types";
import { mockOrderStepAction } from "@/lib/orders/actions";
import type { MockOrderStep } from "@/lib/orders/api";

/**
 * Mock mode only. Stands in for the admin panel and the carrier so the
 * post-sale flow can be tried end to end. Never rendered with API_MODE=live.
 */
export function MockOrderTools({ order, token }: { order: Order; token: string | null }) {
  const hasRequested = order.returns.some((r) => r.status === "requested");
  const hasApproved = order.returns.some((r) => r.status === "approved");
  const steps: { step: MockOrderStep; label: string; show: boolean }[] = [
    { step: "process", label: "Preparar pedido", show: order.status === "confirmed" },
    { step: "ship", label: "Despachar", show: order.shipments.length === 0 },
    { step: "deliver", label: "Marcar entregado", show: order.shipments.some((s) => s.status !== "delivered") },
    { step: "approve_return", label: "Aprobar devolución", show: hasRequested },
    { step: "reject_return", label: "Rechazar devolución", show: hasRequested },
    { step: "receive_return", label: "Recibir y reembolsar", show: hasApproved },
  ];
  const visible = steps.filter((s) => s.show);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="demo-tools" className="rounded-xl border border-dashed border-secondary/50 bg-secondary-fixed/20 p-space-md">
      <h2 id="demo-tools" className="flex items-center gap-space-xs text-label-lg text-on-surface">
        <FlaskConical className="size-4 text-secondary" aria-hidden />
        Herramientas de demo
      </h2>
      <p className="mb-space-sm text-label-sm text-on-surface-variant">Solo en modo mock: simulan el panel administrativo y el courier.</p>
      <div className="flex flex-wrap gap-space-xs">
        {visible.map(({ step, label }) => (
          <form key={step} action={mockOrderStepAction}>
            <input type="hidden" name="step" value={step} />
            <input type="hidden" name="orderNumber" value={order.number} />
            {token && <input type="hidden" name="t" value={token} />}
            <button type="submit" className="min-h-touch rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm text-label-md text-on-surface hover:bg-surface-container-low">
              {label}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
