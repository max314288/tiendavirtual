"use client";

// Culqi Checkout v4 (https://checkout.culqi.com/js/v4). Card and wallet data
// are entered in Culqi's own window and never touch our servers; we only get
// a single-use token that the backend charges with the secret key.
// TODO(verify): confirm option names against Culqi's sandbox before going live.

type CulqiGlobal = {
  publicKey: string;
  settings(config: { title: string; currency: string; amount: number; order?: string }): void;
  options(config: Record<string, unknown>): void;
  open(): void;
  close(): void;
  token?: { id: string };
  order?: unknown;
  error?: { user_message?: string; merchant_message?: string };
};

declare global {
  interface Window {
    Culqi?: CulqiGlobal;
    culqi?: () => void;
  }
}

const SCRIPT_SRC = "https://checkout.culqi.com/js/v4";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Culqi) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("No se pudo cargar Culqi"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type CulqiPaymentOptions = {
  publicKey: string;
  title: string;
  amountCents: number;
};

/** Opens Culqi Checkout; resolves with the token id, rejects on error or close. */
export async function payWithCulqi({ publicKey, title, amountCents }: CulqiPaymentOptions): Promise<string> {
  await loadScript();
  const Culqi = window.Culqi;
  if (!Culqi) throw new Error("Culqi no está disponible");

  Culqi.publicKey = publicKey;
  Culqi.settings({ title, currency: "PEN", amount: amountCents });
  Culqi.options({ lang: "auto", installments: false, paymentMethods: { tarjeta: true, yape: true } });

  return new Promise((resolve, reject) => {
    // Culqi v4 reports the result through a global callback.
    window.culqi = () => {
      if (Culqi.token?.id) {
        const id = Culqi.token.id;
        Culqi.close();
        resolve(id);
      } else {
        reject(new Error(Culqi.error?.user_message ?? "El pago no se completó."));
      }
    };
    Culqi.open();
  });
}
