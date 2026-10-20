# tiendavirtual

Tienda de Compras — **frontend (storefront)** multi-tienda: un solo diseño publicado 4 veces con marca y catálogo distintos.

- Stack: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Motion · lucide-react.
- Backend (NestJS + Prisma + Supabase): se implementa en otro repositorio (`tiendavirtual-backend`). Especificación en el plan.
- Panel administrativo: proyecto aparte, fuera del alcance de este repo.
- Diseño: Stitch, proyecto `13530596929626228117` (design system "Modern Retail Architecture").

## Alcance v1

| Parámetro | Valor |
|---|---|
| País / moneda | Perú · PEN (`es-PE`, `America/Lima`) |
| Impuesto | IGV 18 %, incluido en todos los precios |
| Comprobantes | Electrónicos SUNAT (boleta, factura, notas de crédito/débito) |
| Pasarela de pago | Culqi |
| Cliente de datos (backend) | Prisma |

## Desarrollo

```bash
cp .env.example .env.local   # API_MODE=mock, STORE_SLUG=aura|nova|kipu|andes
npm install
npm run dev                  # http://localhost:3000
```

En modo mock, las cuentas se guardan en `.data/mock-db.json`; la cuenta demo está en `MOCK_DEMO_USER` (`lib/mock-db.ts`).

Verificación: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Documentación

- [Plan de implementación](docs/PLAN_IMPLEMENTACION.md)
- [Modelo BD v2](docs/Modelo%20BD%20v2.md) (schema `commerce`, fuente de verdad del modelo de datos)

## Puntos pendientes

### Negocio y operación
- [X] **Proveedor de pago**: Culqi.
- [X] **País, moneda y locale**: solo Perú / PEN en esta primera versión.
- [X] **Tasa de impuesto**: IGV 18 %, todo viene con impuesto (sin exonerados en v1).
- [ ] **Facturación electrónica**: elegir proveedor OSE/PSE para emitir ante SUNAT.
- [ ] **Regla de redondeo** de impuestos (por línea o por total).

### Modelo de datos
- [X] Tablas de **comprobantes electrónicos** (`invoices`, `invoice_items`, notas de crédito) y campos fiscales del receptor.
- [X] `prices_include_tax` y `tax_rate` documentadas en `store_settings`.
- [X] `culqi` agregado a `payments.provider`.

### Diseño (Stitch)
- [X] Pantallas construidas en Stitch: checkout, confirmación y seguimiento, login/registro, búsqueda, wishlist/devoluciones/reseñas.
- [X] Listar las pantallas nuevas y mapear cada una a su ruta del frontend (ver plan, sección 3).
- [X] Diseño responsive obligatorio (móvil, tablet, escritorio) siguiendo la grilla del design system; no hay diseños móviles en Stitch.

### Proyectos externos
- [ ] **Backend**: crear el repositorio `tiendavirtual-backend` a partir de la sección 2 del plan.
- [ ] **Panel administrativo**: coordinar el contrato del schema `admin` (`admin_user_id`) y la carga de catálogo. Hasta que exista, el catálogo se carga por seed.

### Frontend (pendiente)
- [ ] Guía de devolución/recojo (PDF o código) cuando el backend la genere.
- [ ] Enlaces de seguimiento por courier (`tracking_url`) con los couriers reales.
- [ ] Recuperar contraseña → ver [detalle](#1-recuperar-contraseña).
- [ ] Login social (Google) y confirmación de correo → ver [detalle](#2-login-social-y-confirmación-de-correo).
- [ ] Probar el modo `live` con un proyecto Supabase real (hoy solo verificado en modo mock).
- [ ] Verificar Culqi Checkout v4 contra el sandbox (nombres de opciones, Yape, PagoEfectivo) con una llave `pk_test_`.
- [ ] Descuento de stock en modo mock (hoy solo lo hace el backend).
- [ ] Agregar al carrito desde las tarjetas del catálogo (hoy solo desde el detalle).
- [ ] Autocompletado de búsqueda → ver [detalle](#3-autocompletado-de-búsqueda).
- [ ] Votos "útil" (y fotos) en reseñas → ver [detalle](#4-votos-útil-en-reseñas).
- [ ] Promociones automáticas y "compra X lleva Y" → ver [detalle](#5-promociones-automáticas).
- [ ] Aviso por correo de baja de precio en favoritos (backend, outbox).
- [ ] Acordar con el backend el contrato de API del catálogo (plan, sección 3).

### Pendientes detallados

#### 1. Recuperar contraseña

**Qué:** el cliente que olvidó su contraseña pide un enlace por correo y define una nueva.

**Flujo:**
1. En `/login`, enlace "¿Olvidaste tu contraseña?" → `/recuperar`.
2. `/recuperar`: formulario con el correo. Siempre responde "Si el correo está registrado, te enviamos un enlace" (no revela si la cuenta existe).
3. El correo lleva a `/auth/callback?next=/nueva-contrasena` (Route Handler que intercambia el código de Supabase por la sesión).
4. `/nueva-contrasena`: nueva contraseña + confirmación (mismas reglas que el registro: 8+ caracteres, letras y números) → `supabase.auth.updateUser({ password })` → redirige a `/cuenta` con aviso de éxito.

**Implementación:**
- `lib/auth/types.ts`: agregar `requestPasswordReset(email)` y `updatePassword(password)` a `AuthProvider`.
- `lib/auth/supabase.ts`: `resetPasswordForEmail(email, { redirectTo })` y `updateUser`.
- `lib/auth/mock.ts`: en modo mock, generar un token de un solo uso con vencimiento (30 min) guardado en `.data/mock-db.json` y mostrar el enlace en la consola del servidor (no hay correo).
- `app/auth/callback/route.ts` (compartido con el punto 2).
- Server actions en `lib/auth/actions.ts`; formularios con `useActionState`.

**Seguridad:** respuesta idéntica exista o no la cuenta; token de un solo uso; cerrar las demás sesiones tras el cambio; rate limit (Supabase lo aplica en live).

**Listo cuando:** se puede recuperar la cuenta demo en mock y una cuenta de prueba en Supabase; tests de schema y del token mock (vencido, reutilizado).

#### 2. Login social y confirmación de correo

**Qué:** "Continuar con Google" en `/login` y `/registro` (diseño de Stitch), y la confirmación de correo del registro en live.

**Flujo:**
1. Botón → `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: <origen>/auth/callback?next=… } })`.
2. `/auth/callback` intercambia el código (`exchangeCodeForSession`), fusiona el carrito de invitado (`mergeGuestCart`) y redirige a `next` validado con `safeNextPath`.
3. El backend crea el `customers` de la tienda en el primer `GET /v1/me` usando nombre y correo del proveedor.
4. Registro con confirmación: el enlace del correo también pasa por `/auth/callback`; después de confirmar, aviso "Cuenta activada".

**Requisitos externos:** proyecto de Google Cloud (OAuth client), proveedor Google activado en Supabase, y URLs de redirección de los 4 dominios en Supabase (`store_domains`).

**Modo mock:** botón deshabilitado con texto "Disponible con Supabase" (no se simula OAuth).

**Listo cuando:** login con Google funciona en staging para una tienda, el carrito de invitado se conserva y `next` no permite redirecciones externas.

#### 3. Autocompletado de búsqueda

**Qué:** panel de sugerencias al escribir en el buscador del header (pantalla "Búsqueda Inteligente & Resultados"): términos sugeridos, marcas, hasta 3 productos con precio y búsquedas recientes.

**Comportamiento:**
- Se activa desde 2 caracteres, con debounce de ~200 ms y cancelando la petición anterior.
- Teclado: ↑/↓ para moverse, Enter abre la sugerencia o busca el texto, Esc cierra. Patrón ARIA combobox + listbox.
- Móvil: dentro del overlay de búsqueda a pantalla completa; escritorio: panel desplegable bajo el input (elevación Surface 2).
- Búsquedas recientes en `localStorage` (máx. 5, con opción de borrar), nunca en el servidor.

**Implementación:**
- Backend: `GET /v1/search/suggest?q=` → `{ terms[], brands[], products: ProductSummary[] }`.
- Mock: reutilizar `matchesText` del motor del catálogo.
- Route Handler `app/api/search/suggest/route.ts` (proxy con `STORE_API_KEY`, cacheable unos minutos) o server action.
- Componente cliente `components/layout/search-autocomplete.tsx` que reemplaza `SearchForm` en el header y en `MobileSearch`. Sigue funcionando como formulario GET a `/buscar` sin JavaScript.

**Listo cuando:** sugerencias en < 300 ms en mock, navegable solo con teclado, sin desborde a 375 px; tests del ranking de sugerencias.

#### 4. Votos "útil" en reseñas

**Qué:** botón "¿Te resultó útil? Sí (N)" en cada reseña aprobada, y opcionalmente fotos en reseñas.

**Reglas:**
- Solo clientes con sesión; un voto por cliente y reseña (se puede retirar); no se vota la reseña propia.
- `helpful_count` cacheado en `reviews`; el detalle de votos necesita una tabla nueva en el Modelo BD v2: `review_votes (store_id, review_id, customer_id, created_at)` con `UNIQUE(review_id, customer_id)`.
- Orden de reseñas: "Más útiles" (por `helpful_count`) y "Más recientes".

**Implementación:**
- Backend: `POST /v1/reviews/:id/helpful` (toggle) → `{ helpfulCount, voted }`.
- Mock: tabla `reviewVotes` en `.data/mock-db.json`.
- Botón cliente con actualización optimista; sin sesión → `/login?next=…`.

**Fotos (opcional, fase aparte):** hasta 3 imágenes por reseña vía `media_assets` (tabla puente `review_media`), con moderación junto con el texto.

**Listo cuando:** el conteo se mantiene al recargar, no se puede votar dos veces y el orden "Más útiles" funciona.

#### 5. Promociones automáticas

**Qué:** promociones sin código (`promotions.is_automatic = true`) que se aplican solas, y el tipo "compra X lleva Y" (`buy_x_get_y`).

**Reglas a definir con negocio:**
- Si se combinan con un cupón (`is_combinable`) y en qué orden (`priority`).
- "Compra X lleva Y": qué unidad se regala (la más barata del grupo elegible), tope por pedido.

**Implementación:**
- `lib/promotions/engine.ts`: `evaluateAutomatic(promotions, lines, now)` que elige las aplicables según `priority` e `is_combinable`, y soporte de `buy_x_get_y` (descuento = precio de las unidades gratis, asignado a esas líneas).
- `Cart` pasa a tener `promotions: { code: string | null; label: string; amount }[]` en lugar de un único `promotion`; ajustar el resumen del carrito, checkout y pedido para listar cada descuento.
- Mostrar el badge de promoción automática en tarjetas y detalle ("2x1 en audífonos").
- Backend: se aplican en `GET /v1/cart` y se registran en `promotion_redemptions` al pagar.

**Listo cuando:** tests del motor con combinaciones (automática + cupón, no combinable, 2x1 con cantidades impares) y totales/IGV correctos en carrito, checkout y pedido.

### Técnicos
- [X] Cliente de datos del backend: Prisma.
