import "server-only";
import { randomUUID, scryptSync } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Address, Customer } from "@/lib/account/types";
import type { CheckoutResult, Order } from "@/lib/checkout/types";

// File-backed store for API_MODE=mock so accounts survive dev-server restarts
// and are shared by every server worker. Never used with API_MODE=live.

export type MockUser = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

export type MockSession = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
};

export type MockCustomer = Customer & { storeSlug: string; profileId: string };
export type MockAddress = Address & { customerId: string; deletedAt: string | null };

export type MockCartItem = {
  id: string;
  variantId: string;
  quantity: number;
  unitPriceSnapshot: string;
  addedAt: string;
};

export type MockCart = {
  id: string;
  storeSlug: string;
  /** Anonymous carts: the cookie token (carts.session_token). */
  token: string | null;
  /** Customer carts: profiles.id. */
  profileId: string | null;
  status: "active" | "merged" | "converted";
  items: MockCartItem[];
  /** Applied coupon code (carts.promotion_code_id). */
  promotionCode?: string | null;
  updatedAt: string;
};

export type MockOrder = Order & {
  id: string;
  storeSlug: string;
  profileId: string | null;
  cartId: string;
  accessToken: string;
  /** promotion_redemptions.promotion_id */
  promotionId?: string | null;
};

export type MockReview = {
  id: string;
  storeSlug: string;
  productId: string;
  profileId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  /** Order that proves the purchase (reviews.order_item_id), if any. */
  orderNumber: string | null;
  status: "pending" | "approved" | "rejected" | "hidden";
  createdAt: string;
};

export type MockWishlistItem = {
  id: string;
  storeSlug: string;
  profileId: string;
  productId: string;
  variantId: string | null;
  priceAtAdd: string;
  addedAt: string;
};

export type MockDb = {
  users: MockUser[];
  sessions: MockSession[];
  customers: MockCustomer[];
  addresses: MockAddress[];
  carts: MockCart[];
  orders: MockOrder[];
  /** store_sequences: "<store>:<name>:<prefix>" → last_value */
  sequences: Record<string, number>;
  /** idempotency_keys: "<store>:<key>" → first result */
  idempotency: Record<string, CheckoutResult>;
  reviews: MockReview[];
  /** One default wishlist per customer, flattened (wishlists + wishlist_items). */
  wishlist: MockWishlistItem[];
};

/** Demo account seeded on first use (mock mode only). */
export const MOCK_DEMO_USER = {
  email: "cliente@demo.test",
  password: "DemoTienda2026",
  firstName: "Lucía",
  lastName: "Quispe",
} as const;

const DB_FILE = path.join(process.cwd(), ".data", "mock-db.json");

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

function seed(): MockDb {
  const salt = randomUUID();
  return {
    users: [
      {
        id: randomUUID(),
        email: MOCK_DEMO_USER.email,
        salt,
        passwordHash: hashPassword(MOCK_DEMO_USER.password, salt),
        firstName: MOCK_DEMO_USER.firstName,
        lastName: MOCK_DEMO_USER.lastName,
        createdAt: new Date("2026-03-15T15:00:00Z").toISOString(),
      },
    ],
    sessions: [],
    customers: [],
    addresses: [],
    carts: [],
    orders: [],
    sequences: {},
    idempotency: {},
    reviews: [],
    wishlist: [],
  };
}

async function load(): Promise<MockDb> {
  try {
    const db = JSON.parse(await readFile(DB_FILE, "utf8")) as MockDb;
    // Files created by earlier phases lack newer collections.
    db.carts ??= [];
    db.orders ??= [];
    db.sequences ??= {};
    db.idempotency ??= {};
    db.reviews ??= [];
    db.wishlist ??= [];
    for (const o of db.orders) {
      o.refundedTotal ??= "0.00";
      o.promotion ??= null;
      o.shipments ??= [];
      o.returns ??= [];
      o.refunds ??= [];
      o.history ??= [];
      for (const l of o.lines) {
        l.quantityFulfilled ??= 0;
        l.quantityReturned ??= 0;
      }
    }
    return db;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const db = seed();
    await save(db);
    return db;
  }
}

async function save(db: MockDb): Promise<void> {
  await mkdir(path.dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, DB_FILE);
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialized read-modify-write. Return a value from `fn` to pass it out. */
export function withMockDb<T>(fn: (db: MockDb) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function readMockDb(): Promise<MockDb> {
  return queue.then(load);
}
