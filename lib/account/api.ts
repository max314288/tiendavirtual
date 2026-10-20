import "server-only";
import { randomUUID } from "node:crypto";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { readMockDb, withMockDb, type MockAddress, type MockDb } from "@/lib/mock-db";
import type { Address, AddressInput, Customer, CustomerUpdate } from "./types";

// Customer account data for the signed-in user. Never cached: it is personal
// and read per request. Live mode calls the backend with the user's JWT; the
// backend upserts the `customers` row for this store on first access.

const isMock = () => getServerEnv().API_MODE === "mock";

function stripMock({ customerId: _c, deletedAt: _d, ...address }: MockAddress): Address {
  void _c;
  void _d;
  return address;
}

function mockCustomer(db: MockDb, user: SessionUser) {
  const storeSlug = getServerEnv().STORE_SLUG;
  let customer = db.customers.find((c) => c.storeSlug === storeSlug && c.profileId === user.id);
  if (!customer) {
    customer = {
      id: randomUUID(),
      storeSlug,
      profileId: user.id,
      email: user.email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: null,
      acceptsMarketing: false,
      totalOrders: 0,
      totalSpent: "0.00",
      createdAt: new Date().toISOString(),
    };
    db.customers.push(customer);
  }
  return customer;
}

function toCustomer({ storeSlug: _s, profileId: _p, ...customer }: MockDb["customers"][number]): Customer {
  void _s;
  void _p;
  return customer;
}

/** Keeps at most one default shipping and one default billing address. */
function applyDefaults(addresses: MockAddress[], target: MockAddress) {
  for (const a of addresses) {
    if (a === target) continue;
    if (target.isDefaultShipping) a.isDefaultShipping = false;
    if (target.isDefaultBilling) a.isDefaultBilling = false;
  }
}

export async function getCustomer(user: SessionUser): Promise<Customer> {
  if (isMock()) return withMockDb((db) => toCustomer(mockCustomer(db, user)));
  return apiFetch<Customer>("/v1/me", { accessToken: user.accessToken ?? undefined });
}

export async function updateCustomer(user: SessionUser, update: CustomerUpdate): Promise<Customer> {
  if (isMock()) {
    return withMockDb((db) => {
      const customer = mockCustomer(db, user);
      Object.assign(customer, update);
      const profile = db.users.find((u) => u.id === user.id);
      if (profile) Object.assign(profile, { firstName: update.firstName, lastName: update.lastName });
      return toCustomer(customer);
    });
  }
  return apiFetch<Customer>("/v1/me", {
    method: "PATCH",
    body: JSON.stringify(update),
    accessToken: user.accessToken ?? undefined,
  });
}

export async function listAddresses(user: SessionUser): Promise<Address[]> {
  if (isMock()) {
    const db = await readMockDb();
    const customer = db.customers.find((c) => c.storeSlug === getServerEnv().STORE_SLUG && c.profileId === user.id);
    if (!customer) return [];
    return db.addresses
      .filter((a) => a.customerId === customer.id && !a.deletedAt)
      .sort((a, b) => Number(b.isDefaultShipping) - Number(a.isDefaultShipping))
      .map(stripMock);
  }
  return apiFetch<Address[]>("/v1/me/addresses", { accessToken: user.accessToken ?? undefined });
}

export async function getAddress(user: SessionUser, id: string): Promise<Address | null> {
  const all = await listAddresses(user);
  return all.find((a) => a.id === id) ?? null;
}

export async function createAddress(user: SessionUser, input: AddressInput): Promise<Address> {
  if (isMock()) {
    return withMockDb((db) => {
      const customer = mockCustomer(db, user);
      const mine = db.addresses.filter((a) => a.customerId === customer.id && !a.deletedAt);
      const address: MockAddress = {
        ...input,
        id: randomUUID(),
        customerId: customer.id,
        deletedAt: null,
        // The first address becomes the default for both.
        isDefaultShipping: mine.length === 0 || Boolean(input.isDefaultShipping),
        isDefaultBilling: mine.length === 0 || Boolean(input.isDefaultBilling),
      };
      db.addresses.push(address);
      applyDefaults(mine, address);
      return stripMock(address);
    });
  }
  return apiFetch<Address>("/v1/me/addresses", {
    method: "POST",
    body: JSON.stringify(input),
    accessToken: user.accessToken ?? undefined,
  });
}

export async function updateAddress(user: SessionUser, id: string, input: Partial<AddressInput>): Promise<Address | null> {
  if (isMock()) {
    return withMockDb((db) => {
      const customer = mockCustomer(db, user);
      const mine = db.addresses.filter((a) => a.customerId === customer.id && !a.deletedAt);
      const address = mine.find((a) => a.id === id);
      if (!address) return null;
      // Unchecking the only default would leave none; keep it.
      const patch = { ...input };
      if (patch.isDefaultShipping === false && address.isDefaultShipping) delete patch.isDefaultShipping;
      if (patch.isDefaultBilling === false && address.isDefaultBilling) delete patch.isDefaultBilling;
      Object.assign(address, patch);
      applyDefaults(mine, address);
      return stripMock(address);
    });
  }
  try {
    return await apiFetch<Address>(`/v1/me/addresses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      accessToken: user.accessToken ?? undefined,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Soft delete. A remaining address inherits the default flags. */
export async function deleteAddress(user: SessionUser, id: string): Promise<void> {
  if (isMock()) {
    await withMockDb((db) => {
      const customer = mockCustomer(db, user);
      const mine = db.addresses.filter((a) => a.customerId === customer.id && !a.deletedAt);
      const address = mine.find((a) => a.id === id);
      if (!address) return;
      address.deletedAt = new Date().toISOString();
      const next = mine.find((a) => a !== address);
      if (next && address.isDefaultShipping) next.isDefaultShipping = true;
      if (next && address.isDefaultBilling) next.isDefaultBilling = true;
      address.isDefaultShipping = false;
      address.isDefaultBilling = false;
    });
    return;
  }
  await apiFetch<void>(`/v1/me/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken: user.accessToken ?? undefined,
  });
}
