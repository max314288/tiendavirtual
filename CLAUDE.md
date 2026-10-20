# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

tiendavirtual — Tienda de Compras (online store). This repo is the **storefront frontend only** (Next.js 16 · React 19 · TypeScript · Tailwind v4 · Motion · lucide-react).

- Backend (NestJS + Supabase) lives in a separate repo (`tiendavirtual-backend`); its spec is section 2 of `docs/PLAN_IMPLEMENTACION.md`. Do not implement backend code here.
- Admin panel (schema `admin`) is a separate project, out of scope.
- Data model source of truth: `docs/Modelo BD v2.md`.
- v1 scope: Peru only, PEN, prices include IGV 18 %, SUNAT e-invoicing, Culqi payments.
- UI designs: Stitch project `13530596929626228117` (design system "Modern Retail Architecture" — the one all 9 screens use; ignore "Retail Omniverse"). Screen → route map in plan section 3.
- Pending decisions: README → "Puntos pendientes".

## Commands

- `npm run dev` — dev server (only one `next dev` per folder; Next 16 refuses a second one)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `next typegen` + `tsc --noEmit`
- `npm test` — Vitest (`**/*.test.ts`)

## Architecture

- Next 16 with **Cache Components** on: uncached async data must sit under `<Suspense>` or in a `"use cache"` function. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Tenant: each deployment serves one store. `getStore()` (`lib/store/get-store.ts`, cached) returns it from mock data (`API_MODE=mock`, `STORE_SLUG`) or `GET /v1/store` on the backend (`API_MODE=live`).
- `lib/api/client.ts` and `lib/env.ts` are `server-only`; `STORE_API_KEY` must never reach the browser.
- Catalog: `lib/catalog/api.ts` (cached reads, mock or live), pure logic in `query.ts` (URL filters), `variants.ts`, `pricing.ts`, mock data/engine in `lib/catalog/mock/`. Listing pages share `components/catalog/catalog-view.tsx`; pages that read `params`/`searchParams` render inside `<Suspense>`.
- Auth: `lib/auth` (`auth()` picks Supabase in live, cookie+file session in mock; `getSessionUser()` is request-time → inside `<Suspense>`; `requireUser()` redirects). Account data in `lib/account/api.ts` (never cached). Forms use Server Actions + `useActionState`; zod schemas in `lib/account/schemas.ts`. Each `/cuenta/*` page has its own `<Suspense>` so tab switches stay instant. `proxy.ts` refreshes Supabase cookies (live only).
- Cart: `lib/cart/api.ts` (guest cookie `tv_cart` or customer session; merge on login in `lib/auth/actions.ts`), pure math in `lib/cart/totals.ts` (cents, IGV extracted per line). UI: `CartUIProvider` (drawer state + toast) in the storefront layout; the header cart streams in `<Suspense>`. Don't use `usePathname()`/`useSearchParams()` in components rendered in the static shell.
- Checkout: `lib/checkout` (validate → Culqi token → place order with idempotency key; mock payment dialog in mock mode). Orders at `/pedido/[number]?t=<accessToken>`. Card data never touches our code: only Culqi tokens.
- Post-sale: `lib/orders` (lookup, returns, mock-only `advanceMockOrder` behind the "Herramientas de demo" panel shown only with API_MODE=mock). Rules in `lib/orders/post-sale.ts`.
- Engagement: `lib/promotions` (pure engine + mock codes), `lib/reviews`, `lib/wishlist`. Hearts use the client `WishlistProvider` (loads saved ids via a server action, so static pages stay static).
- Theme tokens live in `app/globals.css` (`@theme`). Per-store `color_overrides` become inline CSS variables on `<html>` via `lib/branding.ts` (allowlisted tokens, hex only).
- Responsive is mandatory, mobile-first: base = mobile, `md` 768, `lg` 1024; 44px min tap targets; check 375/768/1280/1440.
