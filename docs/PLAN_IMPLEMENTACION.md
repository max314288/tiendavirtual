# Plan de Implementación — Tienda Virtual (multi-store, 1 archetype, 1 base de datos)

> Fuente de verdad del modelo de datos: [`Modelo BD v2.md`](./Modelo%20BD%20v2.md) (schema `commerce`).
> El personal de la tienda y la auditoría viven en el schema `admin`, que pertenece al **proyecto Panel administrativo** (otro proyecto, fuera del alcance de este plan).
>
> **Alcance de este repo**: solo el **frontend** (storefront). El backend se especifica en la sección 2 para implementarse en otro repositorio/proyecto (`tiendavirtual-backend`).
>
> Puntos pendientes: ver [README](../README.md#puntos-pendientes).
> Diseño visual: proyecto Stitch `13530596929626228117` ("Multi-Niche E-commerce Templates", design system "Modern Retail Architecture", el que usan las 9 pantallas; el proyecto también contiene "Retail Omniverse", que **no** se usa).

## 0. Decisiones tomadas

- **1 solo archetype/diseño**: Department Store / "Aura Store" de Stitch. Se publica **4 veces** con marca y datos distintos. `stores.archetype` existe en el modelo, pero por ahora todas las tiendas usan el mismo valor.
- **1 sola base de datos Postgres (Supabase)** compartida: multi-tenant por `store_id`, con integridad compuesta `(store_id, id)` y RLS como segunda defensa.
- **Repos separados**: este repo (`tiendavirtual`) es el **frontend**; el backend va en `tiendavirtual-backend` (otro proyecto). El panel administrativo es un tercer proyecto, fuera de alcance.
- **Precios con impuestos incluidos** y **facturación electrónica obligatoria** (ver sección 4, "Impuestos y facturación electrónica").
- **Alcance v1: Perú.** Moneda PEN, locale `es-PE`, zona `America/Lima`, IGV 18 % incluido en precios, comprobantes SUNAT.
- **Proveedor de pago**: **Culqi**.
- **Cliente de datos del backend**: **Prisma**.
- **Backend**: Node.js + NestJS + TypeScript.
- **Frontend**: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Motion · lucide-react.
- **Acceso a datos**: solo desde el backend. El frontend habla con Supabase únicamente para Auth (sesión del cliente).
- **Imágenes**: filesystem local en desarrollo, FTP en producción, detrás de una abstracción (`media_assets.storage_provider`).
- **Deploy**: Vercel (4 proyectos frontend) + Supabase + host con procesos persistentes para NestJS (Railway / Render / Fly.io).

---

## 1. Arquitectura general

```
                    ┌──────────────────────────────────────────────┐
                    │  Supabase                                    │
                    │  Postgres: schema commerce + schema admin    │
                    │  Auth: auth.users (clientes y staff)         │
                    └───────────────▲──────────────────────────────┘
                                    │ conexión pooled, solo backend
                    ┌───────────────┴──────────────────────────────┐
                    │  Backend NestJS (1 deploy)                   │
                    │  API REST storefront  /v1/...                │
                    │  (API admin: proyecto Panel administrativo)  │
                    │  Workers: outbox, reservas, carritos, webhooks│
                    │  Storage adapter: Local | FTP                │
                    └───┬─────────┬─────────┬─────────┬────────────┘
                        │         │         │         │
                 ┌──────▼──┐ ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐
                 │Tienda 1 │ │Tienda 2│ │Tienda 3│ │Tienda 4│   (Vercel, Next.js)
                 └─────────┘ └────────┘ └────────┘ └────────┘
```

### Resolución de tienda

- Cada deploy de frontend tiene en su entorno **server-side** una API key propia (`STORE_API_KEY`). Las llamadas al backend se hacen desde Server Components / Route Handlers, así la key nunca llega al navegador.
- El backend recibe `x-store-key`, calcula su hash y busca en `store_api_keys` (`key_hash`, no revocada, no vencida, con el `scope` requerido). De ahí obtiene `store_id` y actualiza `last_used_at`.
- **CORS**: whitelist dinámica desde `store_domains` (dominios verificados). Reemplaza el `allowed_origin` del plan anterior; una tienda puede tener varios dominios.
- Agregar una tienda = insertar `stores` + `store_domains` + `store_api_keys` + `store_branding` + `store_sequences`, y desplegar un frontend más. Sin cambios de código.
- Para llamadas desde el navegador (carrito, wishlist), el frontend las proxea por un Route Handler propio que agrega la key. El backend no expone ninguna ruta de escritura sin key.

---

## 2. Backend — NestJS (especificación para otro repositorio)

> Esta sección **no se implementa en este repo**. Es la especificación para el proyecto `tiendavirtual-backend`. El frontend depende de ella solo a través del contrato OpenAPI.
> Los endpoints de administración (staff, roles, auditoría, CRUD de catálogo) pertenecen al proyecto Panel administrativo y no se detallan aquí.

**ORM y migraciones.** El modelo usa piezas que un ORM no modela bien: `ltree`, `citext`, índices únicos parciales con `deleted_at`, FKs compuestas `(store_id, parent_id)`, columna calculada (`inventory_levels.available`), particionado mensual, RLS y triggers.

- **Migraciones en SQL** como fuente de verdad (`supabase/migrations/*.sql` con Supabase CLI).
- **Cliente tipado: Prisma** (decidido), generado con `prisma db pull` sobre la base migrada. Los tipos no soportados (`ltree`) se marcan `Unsupported(...)` y se consultan con `$queryRaw`.
- IDs UUIDv7 con `@default(uuid(7))`. Borrado lógico (`deleted_at: null` en lecturas) y bloqueo optimista (`where: { id, version }` + `increment`) con una Prisma Client Extension, equivalente a las directivas Hibernate del Modelo BD v2.

**Validación**: `class-validator` + `class-transformer`. **Docs**: `@nestjs/swagger` (OpenAPI) desde el día uno.

```
tiendavirtual-backend/
├── supabase/
│   ├── migrations/              # SQL versionado: schemas, tablas, índices, RLS, triggers
│   └── seed.sql                 # 4 tiendas demo + catálogo de prueba
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── context/             # StoreContext / RequestContext (AsyncLocalStorage)
│   │   ├── decorators/          # @CurrentStore(), @CurrentCustomer(), @Idempotent()
│   │   ├── guards/              # StoreKeyGuard, CustomerJwtGuard
│   │   ├── interceptors/        # logging, request_id, idempotencia, version (optimistic lock)
│   │   ├── filters/
│   │   └── money/               # helpers numeric(12,2) — nunca float
│   ├── config/                  # validación de env (supabase, ftp, proveedores de pago)
│   ├── database/
│   │   ├── prisma.service.ts
│   │   └── tenant-tx.ts         # transacción con set_config('app.store_id', ...)
│   ├── modules/
│   │   ├── stores/              # stores, domains, api_keys, branding, settings, sequences
│   │   ├── customers/           # profiles, customers, customer_addresses
│   │   ├── catalog/
│   │   │   ├── brands/
│   │   │   ├── categories/      # árbol con ltree
│   │   │   ├── products/        # products, options, option_values, product_categories
│   │   │   ├── variants/        # variants, variant_option_values, price_history
│   │   │   └── search/          # trigram / full-text sobre products.name
│   │   ├── media/               # media_assets + product/variant/category_media
│   │   ├── inventory/           # locations, levels, movements, reservations, adjustments
│   │   ├── cart/                # carts, cart_items, merge anónimo → cliente
│   │   ├── promotions/          # promotions, codes, targets, redemptions + motor de cálculo
│   │   ├── checkout/            # orquesta carrito → pedido → pago (idempotente)
│   │   ├── orders/              # orders, addresses, items, adjustments, status_history, notes
│   │   ├── payments/            # payments, transactions, refunds, webhook_events; provider Culqi
│   │   ├── shipping/            # zones, rates, shipments
│   │   ├── returns/             # returns, return_items
│   │   ├── reviews/
│   │   ├── wishlists/
│   │   ├── invoicing/           # comprobantes SUNAT: invoices, invoice_items (OSE/PSE por definir)
│   │   └── events/              # domain_events (outbox) + publicador
│   ├── jobs/                    # @nestjs/schedule: expiración de reservas, carritos abandonados, outbox
│   └── storage/
│       ├── storage.interface.ts
│       ├── local-storage.provider.ts
│       ├── ftp-storage.provider.ts
│       └── storage.module.ts    # STORAGE_DRIVER=local|ftp
├── test/
└── .env.example
```

### Reglas transversales del backend

- **Scoping de tienda (riesgo #1).** `StoreKeyGuard` resuelve `store_id` y lo guarda en el `RequestContext`. Toda query de negocio corre dentro de `tenantTx()`, que abre una transacción y ejecuta `set_config('app.store_id', <id>, true)`. Las políticas RLS leen `current_setting('app.store_id')`. El backend se conecta con un rol **sin** `BYPASSRLS` (no `service_role`), así un olvido en el código falla en vez de filtrar datos. `set_config` local a la transacción es compatible con el pooler en modo transaction.
- **Integridad compuesta.** Las FKs hijas van por `(store_id, parent_id)`. Un bug de scoping no puede crear un pedido de la tienda A con una variante de la tienda B.
- **Borrado lógico.** Nada con valor histórico se borra físicamente. Los repositorios filtran `deleted_at IS NULL` por defecto.
- **Bloqueo optimista.** Los updates del panel envían `version`; si no coincide → `409 Conflict`.
- **Dinero.** `numeric(12,2)` en DB, string decimal en JSON, cálculo con una librería decimal (p. ej. `decimal.js`). Siempre acompañado de `currency_code`.
- **Idempotencia.** Checkout, creación de pago y reembolso exigen header `Idempotency-Key` → `idempotency_keys`.
- **Numeración.** `order_number`, `return_number`, etc. salen de `store_sequences` con `SELECT ... FOR UPDATE` dentro de la misma transacción.
- **Historial.** Cada cambio de estado de pedido inserta en `order_status_history`; cada cambio de precio, en `variant_price_history`; cada cambio de stock, en `inventory_movements`. Nunca se edita stock directamente.
- **Outbox.** Eventos (`order.paid`, `stock.low`, `cart.abandoned`) se escriben en `domain_events` en la misma transacción. Un job los publica (emails, webhooks).
- **Webhooks de pago.** Se guardan crudos en `webhook_events` (único por `provider, external_event_id`), se validan por firma y se procesan una sola vez.
- **`/health`** desde el día uno: con 4 frontends dependiendo de un backend, una caída tira las 4 tiendas.

### Mapeo Modelo BD v2 → NestJS/Prisma

El Modelo BD v2 describe sus reglas con referencias a Java/Hibernate/CDC. Equivalencias en este backend:

| Modelo BD v2 | NestJS + Prisma |
|---|---|
| `uuidv7` | `@default(uuid(7))` |
| `@Version` (bloqueo optimista) | Client Extension: `update` con `where: { id, version }` + `version: { increment: 1 }`; 0 filas → `409` |
| `@SQLRestriction("deleted_at IS NULL")` | Client Extension que agrega `deleted_at: null` a las lecturas y convierte `delete` en soft delete |
| `ltree`, GiST, GIN, trigram | Migraciones SQL; `Unsupported("ltree")` + `$queryRaw` |
| `citext`, `numeric(12,2)`, `numeric(5,4)` | `@db.Citext`, `Decimal` |
| FKs compuestas `(store_id, parent_id)` | Relaciones compuestas de Prisma (`fields: [storeId, parentId]`) |
| RLS por `store_id` | `tenantTx()` con `set_config('app.store_id', …, true)` |
| Outbox + CDC (Debezium) / Kafka | Worker con `@nestjs/schedule` que barre `domain_events` (`FOR UPDATE SKIP LOCKED`) |

Cuatro puntos que requieren decisión explícita:

1. **CDC de cambios de precio.** El modelo indica que las inserciones en `variant_price_history` se capturan vía CDC para avisar a carritos y wishlists. Sin CDC en v1, el servicio que cambia el precio inserta en `variant_price_history` **y** emite `price.changed` en `domain_events` en la misma transacción. Un job lo consume y notifica (precio cambiado en carrito, baja de precio en wishlist). La comparación se hace contra `cart_items.unit_price_snapshot` y `wishlist_items.price_at_add`: no hace falta guardar nada nuevo.
2. **PK de `inventory_movements` particionada.** Postgres exige que toda PK/UNIQUE de una tabla particionada incluya la columna de partición. Con `RANGE` mensual sobre `created_at`, la PK física es `(id, created_at)`. Ninguna tabla referencia por FK a `inventory_movements`, así que no afecta relaciones. En Prisma se ve como `@@id([id, createdAt])`. Las particiones mensuales se crean por adelantado (`pg_partman` o un job mensual).
3. **Índices únicos parciales (`WHERE deleted_at IS NULL`).** Se crean en SQL y la base los hace cumplir. Verificar en Fase 0 cómo los refleja `prisma db pull`. Regla: no usar `findUnique` sobre esas claves (`slug`, `sku`, `code`, `handle`, `email`); usar `findFirst` con `deleted_at: null`. Las violaciones se capturan como error `P2002` → `409`.
4. **`SELECT … FOR UPDATE` en `store_sequences`.** Prisma no tiene API de bloqueo de filas. La numeración (`order`, `receipt` B001, `invoice` F001, notas, `return`) va con `$queryRaw` dentro de la transacción del pedido o comprobante: `UPDATE store_sequences SET last_value = last_value + 1 WHERE … RETURNING last_value`, que bloquea la fila y evita huecos.

### Jobs en segundo plano

| Job | Frecuencia | Qué hace |
|---|---|---|
| Expirar reservas | 1 min | `inventory_reservations` activas con `expires_at` vencido → `expired`, libera `reserved`. |
| Carritos abandonados | 15 min | `carts` sin actividad → `abandoned`, emite `cart.abandoned`. |
| Publicar outbox | continuo / 10 s | `domain_events` `pending` → publicados con reintentos. |
| Reprocesar webhooks | 5 min | `webhook_events` `failed` con intentos restantes. |
| Stock bajo | por evento | `available ≤ reorder_point` → `stock.low`. |

Con `@nestjs/schedule` alcanza al inicio (1 sola instancia). Si se escala horizontalmente, pasar a BullMQ + Redis o `pg_cron`, para no correr los jobs dos veces.

---

## 3. Frontend — Next.js 16 (este repo)

```
tiendavirtual/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx                    # home                     ← Stitch "Plantilla Tienda E-Commerce & Carrito"
│   │   ├── categoria/[...path]/page.tsx # catálogo + filtros      ← Stitch "Catálogo & Filtros" (path = ltree)
│   │   ├── marca/[slug]/page.tsx       # catálogo por marca
│   │   ├── buscar/page.tsx             # búsqueda
│   │   ├── producto/[slug]/page.tsx    # detalle + selector de variantes ← Stitch "Detalle de Producto"
│   │   ├── carrito/page.tsx            # + drawer de carrito global
│   │   ├── checkout/                   # dirección → envío → pago → confirmación
│   │   ├── pedido/[number]/page.tsx    # confirmación / seguimiento (también para invitados)
│   │   └── cuenta/                     # ← Stitch "Panel de Usuario & Mi Cuenta"
│   │       ├── page.tsx
│   │       ├── pedidos/page.tsx
│   │       ├── pedidos/[number]/page.tsx  # detalle, envíos, solicitar devolución
│   │       ├── direcciones/page.tsx
│   │       ├── favoritos/page.tsx      # wishlists
│   │       └── resenas/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── registro/page.tsx
│   ├── api/                            # BFF: proxy hacia NestJS agregando STORE_API_KEY
│   ├── layout.tsx                      # carga store_branding → variables CSS
│   └── globals.css                     # @theme Tailwind v4 con tokens "Modern Retail Architecture"
├── components/
│   ├── ui/                             # Button, Input, Badge, Chip, Rating (design system)
│   ├── product/                        # ProductCard, Gallery, PriceStack, VariantPicker, StockBadge
│   ├── catalog/                        # FilterDrawer, FilterChips, Sort, Pagination
│   ├── cart/
│   ├── checkout/
│   ├── account/
│   ├── layout/                         # Header, Footer, SearchBar, CategoryNav
│   └── motion/
├── lib/
│   ├── api/                            # cliente tipado (server-only) hacia NestJS
│   ├── auth/                           # Supabase Auth (sesión del cliente)
│   ├── money.ts                        # formato con Intl + currency_code de la tienda
│   └── utils/
├── store/                              # Zustand: estado UI del carrito (la verdad está en el backend)
├── types/api.d.ts                      # generado con openapi-typescript desde el Swagger del backend
└── .env.example                        # STORE_API_KEY (server), NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL/ANON_KEY
```

### Notas

- **Tipos**: el backend expone OpenAPI; el frontend corre `openapi-typescript` en cada build. Type-safety sin monorepo.
- **Producto vs variante**: la URL es del producto (`slug`). El selector arma la variante desde `product_options` / `product_option_values`, y carrito y pedido siempre apuntan a `variant_id`. Precio, stock e imagen cambian por variante.
- **"Agotado"** no es un estado: se deriva de `inventory_levels.available` + `allow_backorder`.
- **Precio tachado y badge de descuento**: `compare_at_price` de la variante. Las promociones automáticas se muestran como badge aparte.
- **Carrito anónimo**: `session_token` en cookie httpOnly. Al loguearse, el backend fusiona (`merged_into_cart_id`). Si `unit_price_snapshot` difiere del precio actual, la UI avisa "el precio cambió".
- **Branding por tienda**: `layout.tsx` lee `store_branding.color_overrides` y lo inyecta como variables CSS sobre los tokens base. Logo y favicon salen de `media_assets`.
- **Moneda, locale y zona horaria** salen de `stores` (no hardcodear).
- **Motion**: transiciones de página, hover de `ProductCard`, drawer de carrito y filtros, siguiendo las elevaciones del design system (Surface 1 hover y dropdowns, Surface 2 drawers y modales).

### Contrato de API que consume el frontend (catálogo, Fase 1)

Implementado en `lib/catalog/api.ts` y `lib/store/get-store.ts`. Con `API_MODE=mock` se sirve desde `lib/catalog/mock/`; con `API_MODE=live` llama al backend con `x-store-key`. Tipos en `lib/catalog/types.ts` (dinero como string decimal).

| Endpoint | Respuesta | Uso |
|---|---|---|
| `GET /v1/store` | `Store` (tienda + branding + navegación) | Layout, metadata, colores por tienda |
| `GET /v1/categories` | `Category[]` (árbol plano con `path` ltree y `productCount`) | Home, página de categoría, breadcrumbs |
| `GET /v1/brands/:slug` | `Brand` / 404 | Página de marca |
| `GET /v1/products?category&brand&q&brands&price_min&price_max&rating_min&in_stock&on_sale&sort&page&page_size` | `ProductListResult` (items, total, facetas de marca y rango de precio) | Categoría, marca, búsqueda, home |
| `GET /v1/products/:slug` | `ProductDetail` (opciones, variantes con stock, galería, atributos, breadcrumb) / 404 | Detalle de producto |
| `GET /v1/products/:slug/related?limit` | `ProductSummary[]` | "También te puede interesar" |

Las facetas de marca y el rango de precio se calculan sobre el conjunto filtrado solo por categoría/marca y texto, para que no colapsen al aplicar un filtro de marca o precio.

### Contrato de API de clientes (Fase 2)

Auth con Supabase en el navegador/servidor del frontend (`lib/auth/supabase.ts`); el backend recibe el JWT en `Authorization: Bearer` junto con `x-store-key` y crea el `customers` de la tienda en el primer acceso (con `first_name`, `last_name`, `phone`, `accepts_marketing` del `user_metadata`). En modo mock, `lib/auth/mock.ts` usa una cookie de sesión y `.data/mock-db.json`.

| Endpoint | Respuesta | Uso |
|---|---|---|
| `GET /v1/me` | `Customer` (upsert del cliente de esta tienda) | Mi cuenta, header |
| `PATCH /v1/me` | `Customer` | Mis datos; tras el registro |
| `GET /v1/me/addresses` | `Address[]` | Direcciones |
| `POST /v1/me/addresses` | `Address` (la primera queda como predeterminada de envío y facturación) | Nueva dirección |
| `PATCH /v1/me/addresses/:id` | `Address` / 404 | Editar, marcar predeterminada (desmarca las demás) |
| `DELETE /v1/me/addresses/:id` | 204 (borrado lógico; otra dirección hereda los predeterminados) | Eliminar |

### Contrato de API del carrito (Fase 3)

Implementado en `lib/cart/api.ts`. Invitados: cookie httpOnly `tv_cart` con el `session_token`, enviada al backend como `x-cart-token`; clientes: su JWT. Todas las respuestas son `{ cart: Cart, cartToken: string | null }`; el backend devuelve `cartToken` al crear un carrito de invitado. Precios con IGV incluido; el backend calcula `taxIncluded` por línea y marca `issue` en cada línea (`price_changed`, `insufficient_stock`, `out_of_stock`, `unavailable`). Errores de negocio: 4xx con `{ message }` para mostrarlo tal cual.

| Endpoint | Uso |
|---|---|
| `GET /v1/cart` | Header, drawer, página `/carrito` (404 = sin carrito) |
| `POST /v1/cart/items` `{ variantId, quantity }` | Agregar (suma a la línea existente; valida stock y máximo 10) |
| `PATCH /v1/cart/items/:id` `{ quantity }` | Cambiar cantidad (actualiza `unit_price_snapshot`) |
| `DELETE /v1/cart/items/:id` | Quitar línea |
| `POST /v1/cart/merge` | Al iniciar sesión: fusiona el carrito de invitado (`merged_into_cart_id`) |

Las reservas de inventario (`inventory_reservations`) y su expiración son responsabilidad del backend (job "Expirar reservas"); el frontend solo muestra el stock disponible que devuelve el carrito.

### Contrato de API de checkout y pedidos (Fase 4)

Implementado en `lib/checkout/api.ts`. Flujo en el navegador: (1) `prepareCheckoutAction` valida en el servidor y devuelve el total confirmado; (2) se abre Culqi Checkout con ese monto y devuelve un token de un solo uso (los datos de tarjeta/Yape nunca pasan por la tienda); (3) `placeOrderAction` envía el token con `Idempotency-Key`. En modo mock, Culqi se reemplaza por un diálogo de pago simulado (aprobar/rechazar).

| Endpoint | Respuesta | Uso |
|---|---|---|
| `GET /v1/checkout/shipping-rates?province=` | `ShippingRate[]` (con `finalPrice` tras envío gratis) | Paso de envío |
| `POST /v1/checkout` (header `Idempotency-Key`) | `CheckoutResult` (`orderNumber` + `accessToken`, o `payment_declined` / `cart_changed` / `invalid`) | Cobra el token Culqi, crea el pedido, reserva stock, encola la boleta/factura (outbox) |
| `GET /v1/orders/:number?t=` | `Order` (dueño autenticado o `t` válido) / 404 | Confirmación y seguimiento |
| `GET /v1/me/orders` | `OrderSummary[]` | Mi cuenta → pedidos |

Reglas: el backend rechaza el pedido si `expectedTotal` no coincide con su cálculo (no se cobra un monto distinto al mostrado). Boleta desde S/ 700 exige DNI/CE (`RECEIPT_ID_REQUIRED_FROM`). Series: boleta `B001`, factura `F001`, pedido `ORD`, todas desde `store_sequences`.

### Contrato de API de post-venta (Fase 5)

Implementado en `lib/orders/api.ts`; reglas puras en `lib/orders/post-sale.ts` (ventana de 30 días desde la entrega, unidades devolvibles, monto de reembolso sin envío, series de nota de crédito `BC01`/`FC01`). `Order` ahora incluye `shipments`, `returns`, `refunds`, `history` y `refundedTotal`.

| Endpoint | Respuesta | Uso |
|---|---|---|
| `POST /v1/orders/lookup` `{ number, email }` | `{ accessToken }` / 404 (mismo error si no coincide número o correo; con rate limit) | Rastrear mi pedido (`/pedido`) |
| `POST /v1/orders/:number/returns?t=` `{ items[{orderLineId, quantity, condition}], reason, comment }` | `{ returnNumber }` / 4xx `{ message }` | Solicitar devolución |
| `GET /v1/me/returns` | `ReturnRequest[]` con `orderAccessToken` | Mi cuenta → Devoluciones |

Despachos, entrega, aprobación de devoluciones y reembolsos los opera el panel administrativo (otro proyecto) y los couriers. En modo mock, la página del pedido muestra "Herramientas de demo" para simularlos.

### Contrato de API de engagement (Fase 6)

Promociones (`lib/promotions/engine.ts`, puro): porcentaje con tope, monto fijo y envío gratis; por pedido o por categoría (subárbol ltree); mínimo de compra, vigencia y límite por cliente. El descuento se prorratea por línea (`CartLine.discountAmount`) y el IGV se extrae del monto ya descontado. Cupones demo: `BIENVENIDA10`, `AUDIO15`, `ENVIOGRATIS` (`VERANO25` vencido).

| Endpoint | Uso |
|---|---|
| `POST /v1/cart/promotion` `{ code }` / `DELETE /v1/cart/promotion` | Aplicar o quitar cupón (respuesta `{ cart, cartToken }`; error `{ message }`) |
| `GET /v1/products/:id/reviews` | `ProductReviews` (aprobadas + la propia en cualquier estado, `canReview`) |
| `POST /v1/products/:id/reviews` `{ rating, title, body }` | Crea reseña `pending`; el backend marca compra verificada si el cliente recibió el producto |
| `GET /v1/me/reviews`, `GET /v1/me/reviewable` | Mi cuenta → Reseñas |
| `GET /v1/me/wishlist/ids`, `POST /v1/me/wishlist/toggle`, `GET /v1/me/wishlist`, `DELETE /v1/me/wishlist/items/:id` | Corazones y Mi cuenta → Favoritos (con `price_at_add` para avisar bajadas de precio) |

La moderación de reseñas y la recalculación de `rating_avg`/`rating_count` son del backend y del panel administrativo; en modo mock hay un botón "Aprobar (demo)" en la reseña propia.

### Pantallas en Stitch (proyecto `13530596929626228117`)

Todas las pantallas son de escritorio (2560 px). No hay diseños móviles: la versión móvil y tablet se construye con las reglas responsive de abajo.

| Pantalla Stitch | ID | Ruta | Fase |
|---|---|---|---|
| Plantilla Tienda E-Commerce & Carrito | `6951f39a25804e72ae977f7e06fbec13` | `/` + drawer y `/carrito` | 1 / 3 |
| Catálogo & Filtros | `f545c4fc0d6b4597a9aaa67fc4b44f30` | `/categoria/[...path]`, `/marca/[slug]` | 1 |
| Detalle de Producto | `a136096cf7bd4ba4a3774c590051ab12` | `/producto/[slug]` | 1 |
| Búsqueda Inteligente & Resultados | `c721f51f48594dd9a2129b4e024b4891` | `/buscar` | 1 |
| Iniciar Sesión & Registro | `87eb538b1851479a91e21a5f9fc82a55` | `/login`, `/registro` | 2 |
| Panel de Usuario & Mi Cuenta | `cdb53a3ce20445a48b2674821db6ca9f` | `/cuenta`, `/cuenta/pedidos`, `/cuenta/direcciones` | 2 / 5 |
| Checkout Completo & Facturación | `c1dff87e5d9f4a0ebbc5d30aa9338d75` | `/checkout` | 4 |
| Confirmación y Seguimiento de Pedido | `b6f72a1d65cd4f38adacf32e645db469` | `/pedido/[number]` | 4 / 5 |
| Panel de Usuario: Wishlist, Devoluciones & Reseñas | `bdbfc43a2299455ca950410f0b86aef4` | `/cuenta/favoritos`, devoluciones, `/cuenta/resenas` | 5 / 6 |

### Diseño responsive (obligatorio)

Toda pantalla debe funcionar en móvil, tablet y escritorio. Se construye **mobile-first** (estilos base para móvil, `md:` y `lg:` amplían), siguiendo la grilla del design system "Modern Retail Architecture":

| Rango | Grilla | Márgenes / gutters | Breakpoint Tailwind |
|---|---|---|---|
| Móvil `< 768px` | 4 columnas fluidas | margen 16px, gutter 12–16px | base |
| Tablet `768–1023px` | 8 columnas | margen 32px, gutter 20px | `md` |
| Escritorio `≥ 1024px` | 12 columnas, máx. 1360px | margen 48px, gutter 24px | `lg` (y `xl` 1280, `2xl` 1440) |

Patrones por componente:

- **Header**: en móvil, logo + iconos (buscar, cuenta, carrito) + menú hamburguesa; la barra de búsqueda se despliega a pantalla completa. En escritorio, barra de búsqueda con selector de categoría visible.
- **Navegación de categorías**: carrusel horizontal con scroll en móvil y tablet; menú completo en escritorio.
- **Grilla de productos**: 2 columnas en móvil, 3 en tablet, 4–5 en escritorio.
- **Filtros del catálogo**: drawer lateral (Surface 2 + backdrop) en móvil y tablet; sidebar fija en escritorio.
- **Detalle de producto**: galería con swipe arriba y datos abajo en móvil; dos columnas en escritorio. Botón "Agregar al carrito" fijo abajo en móvil.
- **Carrito**: drawer a pantalla completa en móvil.
- **Checkout**: un paso por pantalla con resumen colapsable en móvil; formulario + resumen lateral fijo en escritorio. Barra inferior fija con total y botón de pago.
- **Mi cuenta**: menú lateral en escritorio; tabs con scroll horizontal o lista de secciones en móvil.
- **Tablas** (pedidos, devoluciones): se convierten en tarjetas apiladas en móvil.

Reglas generales:

- Áreas táctiles de **mínimo 44×44px**; inputs con altura mínima 44px.
- Sin scroll horizontal de página en ningún ancho (≥ 320px).
- Imágenes con `next/image` y `sizes` por breakpoint.
- Tipografía con variantes móviles del design system (`display-lg-mobile`, `headline-lg-mobile`).
- Cada pantalla se verifica en **375, 768, 1280 y 1440px** antes de darla por terminada.

---

## 4. Base de datos

El modelo completo está en [`Modelo BD v2.md`](./Modelo%20BD%20v2.md). Este plan no lo repite. Mapa de módulos backend → tablas:

| Módulo | Tablas (schema `commerce`) |
|---|---|
| stores | stores, store_domains, store_api_keys, store_branding, store_settings, store_sequences |
| customers | profiles (global), customers, customer_addresses |
| catalog | brands, categories, product_categories, products, product_options, product_option_values, product_variants, variant_option_values, variant_price_history |
| media | media_assets, product_media, variant_media, category_media |
| inventory | inventory_locations, inventory_levels, inventory_movements, inventory_reservations, inventory_adjustments, inventory_adjustment_items |
| cart | carts, cart_items |
| promotions | promotions, promotion_codes, promotion_targets, promotion_redemptions |
| orders | orders, order_addresses, order_items, order_adjustments, order_status_history, order_notes |
| payments | payments, payment_transactions, refunds, refund_items, webhook_events |
| shipping / returns | shipping_zones, shipping_rates, shipments, shipment_items, returns, return_items |
| reviews / wishlists | reviews, wishlists, wishlist_items |
| events | domain_events, idempotency_keys |
| invoicing | invoices, invoice_items |
| — (schema `admin`) | staff, roles, permisos, audit_log, security_events — proyecto Panel administrativo, fuera de alcance |

### Identidad

- **Clientes**: Supabase Auth → `profiles` (1:1 con `auth.users`, global) → un `customers` por tienda. Registrarse en la tienda 2 con el mismo email no rompe nada: crea otro `customers` ligado al mismo `profile`.
- **Invitados**: `customers` con `profile_id` nulo. Si después se registra con el mismo email, se vincula por `(store_id, email)`.
- **Staff**: vive en el schema `admin` (proyecto Panel administrativo), no en `customers`. Las referencias `assigned_to`, `moderated_by`, `changed_by` apuntan a `admin_user_id`. Este proyecto solo las lee; no gestiona staff.

### Impuestos y facturación electrónica

- **Precios con IGV incluido.** `store_settings.prices_include_tax = true`, `tax_rate = 0.18`. En v1 todo producto está gravado (no hay exonerados). El precio de la variante ya es precio final. `order_items.tax_amount` y `orders.tax_total` se **extraen** del precio (base = precio / 1.18), no se suman. La UI muestra el precio tal cual y el checkout desglosa op. gravada e IGV.
- **Moneda**: PEN. Formato con `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })` → `S/ 1,299.90`.
- **Redondeo**: pendiente decidir por línea o por total (afecta la cuadratura con el comprobante SUNAT). Recomendado: por línea.
- **Facturación electrónica obligatoria (SUNAT).** Tablas `invoices` e `invoice_items` ya están en el Modelo BD v2 (sección 10): boleta (`receipt`, serie `B001`), factura (`invoice`, serie `F001`), notas de crédito/débito ligadas a `parent_invoice_id` y `refund_id`. Series y correlativos desde `store_sequences`.
- **Checkout**: el cliente elige **boleta** (DNI o CE, opcional bajo el monto mínimo que exija SUNAT) o **factura** (RUC de 11 dígitos + razón social + dirección fiscal). Se guarda en `order_addresses.tax_document_type`, `tax_document_number` y `company_name`, y se copia al snapshot de `invoices`.
- **Flujo**: `order.paid` (outbox) → módulo `invoicing` emite el comprobante con el OSE/PSE → guarda XML, PDF y CDR → `invoice.issued` → email al cliente con el PDF. Un reembolso emite nota de crédito.
- **Pendiente**: proveedor OSE/PSE y regla de redondeo (ver README).

### Extensiones Postgres requeridas

`pgcrypto` (uuid), `citext`, `ltree`, `pg_trgm`. Opcional: `pg_partman` o `pg_cron` para particionar `inventory_movements` y `audit_log`. El particionado puede esperar hasta tener volumen real; la tabla se diseña ya particionable.

---

## 5. Imágenes — dev local / prod FTP

- Toda imagen es una fila en `media_assets` (`storage_provider`, `storage_path`, `public_url`, `checksum`, dimensiones, `alt_text`). Productos, variantes y categorías la referencian por tablas puente con `role` (cover / gallery / thumbnail / video / size_guide).
- **Dev**: `LocalStorageProvider` guarda en `uploads/{store_id}/{yyyy}/{mm}/{asset_id}.{ext}` y el backend la sirve como estática en `/uploads/...`.
- **Prod**: `FtpStorageProvider` sube al FTP del hosting y guarda la URL pública. Env: `FTP_HOST`, `FTP_USER`, `FTP_PASS`, `FTP_BASE_PATH`, `FTP_PUBLIC_URL`.
- `STORAGE_DRIVER=local|ftp` elige el provider. El enum ya admite `s3` y `supabase` para el futuro.
- **Deduplicación**: antes de subir se calcula `checksum`; si existe `(store_id, checksum)` se reutiliza el asset.
- `products.featured_image_url` y `product_variants.image_url` son caché de la URL para listados sin joins: se actualizan al cambiar la portada.
- Las URLs guardadas son absolutas por provider. Migrar de local a FTP implica re-subir y reescribir `public_url` (script de migración, no cambio de código).

---

## 6. Roadmap por fases

Cada fase termina con algo usable de punta a punta en las 4 tiendas seed.

| Fase | Alcance | Entregable |
|---|---|---|
| **0. Fundaciones** | Repos, CI, Supabase local, extensiones, convenciones globales, tablas `stores*`, RLS + `tenantTx`, `StoreKeyGuard`, `/health`, Swagger, storage adapter, tokens Tailwind desde Stitch, layout base **responsive** con branding. | Las 4 tiendas seed cargan su home vacía con su marca, en móvil, tablet y escritorio. Test que prueba que la tienda A no ve datos de B. |
| **1. Catálogo (lectura)** | brands, categories, products, options, variants, media, inventory_levels (solo lectura), búsqueda. | Home, catálogo con filtros y detalle de producto con selector de variantes, con datos seed. |
| **2. Clientes** | Supabase Auth, profiles, customers, direcciones, login/registro, Mi cuenta (datos + direcciones). | El cliente se registra, inicia sesión y gestiona direcciones por tienda. |
| **3. Carrito + inventario** | carts, cart_items, merge, reservas con expiración, movimientos de stock, job de expiración. | Carrito anónimo y logueado que sobrevive al login; no se sobrevende. |
| **4. Checkout + pagos + facturación** | shipping_zones/rates, orders y snapshots, store_sequences, impuestos incluidos, payments, webhooks, idempotencia, outbox + email de confirmación, emisión de comprobante electrónico. Pago con **Culqi** (Culqi Checkout en el frontend → token → cargo desde el backend; webhooks a `webhook_events`). Facturación detrás de `InvoicingProvider` con un mock hasta elegir OSE/PSE. | Compra en sandbox de Culqi: pedido pagado, stock descontado, comprobante emitido (mock o real), email enviado. |
| **5. Post-venta** | Historial de pedidos, shipments, returns, refunds, order_status_history visible al cliente. | El cliente sigue su pedido y solicita una devolución. |
| **6. Engagement** | promotions (códigos + automáticas), reviews con moderación, wishlists con aviso de baja de precio. | Cupones aplicables en carrito; reseñas verificadas. |

> Cada fase tiene parte backend (repo `tiendavirtual-backend`) y parte frontend (este repo). El frontend puede adelantarse contra un mock del contrato OpenAPI.
> La carga de catálogo real, ajustes de inventario, gestión de pedidos y moderación de reseñas dependen del **proyecto Panel administrativo**. Mientras no exista, el catálogo se carga por seed/SQL.

---

## 7. Despliegue

- **Frontend**: 4 proyectos Vercel, cada uno con su dominio y su `STORE_API_KEY` (server-only). Los dominios se registran en `store_domains`.
- **Backend NestJS**: Railway / Render / Fly.io. Un deploy, una URL. Necesita procesos persistentes (jobs, cliente FTP).
- **Supabase**: un proyecto con Postgres + Auth. Pooler en modo transaction para el backend; conexión directa solo para migraciones.
- **Entornos**: `local` (Supabase CLI) → `staging` → `production`, con migraciones aplicadas por CI.
- **Rotación de claves**: crear una nueva `store_api_keys`, actualizar la env en Vercel, revocar la vieja (`revoked_at`). Sin downtime.

---

## 8. Decisiones resueltas

| Pregunta | Decisión |
|---|---|
| Panel administrativo (schema `admin`) | Es **otro proyecto**, fuera del alcance de este plan. Aquí solo se referencian sus IDs (`admin_user_id`). |
| Proveedor de pago | **Culqi.** Se implementa detrás de `PaymentProvider` (más un provider `manual` para pruebas). |
| País y moneda | **Perú, PEN** en v1. |
| Impuestos | **IGV 18 % incluido** en todos los precios. Facturación electrónica SUNAT **obligatoria** (sección 4). |
| Cliente de datos | **Prisma** sobre migraciones SQL. |
| Uso de este repo | `tiendavirtual` = **solo frontend**. El backend (sección 2) se lleva a otro repositorio/proyecto. |
| Pantallas faltantes en Stitch | Las construye el usuario en Stitch y avisa; se integran desde el mismo proyecto Stitch. |

Lo que sigue abierto está en [README → Puntos pendientes](../README.md#puntos-pendientes).

---

## 9. Cambios respecto a la versión anterior del plan

| Antes | Ahora |
|---|---|
| `stores.allowed_origin`, `stores.api_key` | `store_domains` (varios dominios) + `store_api_keys` (hash, scopes, rotación) |
| `users` con `store_id` y `rol` | `profiles` global + `customers` por tienda; staff en schema `admin` |
| `addresses` | `customer_addresses`; los pedidos copian un snapshot en `order_addresses` |
| `products.category_id`, marca como texto, precio en producto, estado "agotado" | `product_categories` N:M, `brands`, precio en variante, "agotado" derivado del inventario |
| Atributos de variante en JSON | `product_options` / `product_option_values` / `variant_option_values` |
| `media` polimórfica | `media_assets` + tablas puente con FK reales |
| `inventory` con stock editable | levels + movements (libro mayor) + reservations + locations + adjustments |
| `discounts` con uso actual como contador | promotions + codes + targets + redemptions |
| `orders` con un solo estado | `status` / `payment_status` / `fulfillment_status` + historial, adjustments y notas |
| Sin envíos, devoluciones ni reembolsos | shipping, shipments, returns, refunds, webhook_events |
| Prisma como ORM y migrador | SQL como migrador; Prisma como cliente tipado |
| RLS mencionado de pasada | RLS obligatorio con `app.store_id` por transacción y rol sin bypass |
| Sin jobs ni fases | Jobs en segundo plano + roadmap en 7 fases (0–6) |
| Panel admin dentro del alcance | Panel administrativo = proyecto aparte |
| Sin impuestos ni comprobantes | Precios con impuesto incluido + facturación electrónica (módulo `invoicing`; tablas `invoices` / `invoice_items` en Modelo BD v2) |
| Repo frontend y backend nuevos | Este repo = frontend; backend en otro repositorio |
| `STORE_API_KEY` en el frontend sin aclarar | Key solo en el servidor; el navegador pasa por el BFF |
