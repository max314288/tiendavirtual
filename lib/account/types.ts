/**
 * Customer account contract (Modelo BD v2 §3: profiles, customers,
 * customer_addresses), as returned by the backend under /v1/me.
 */

export type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  totalOrders: number;
  totalSpent: string;
  createdAt: string;
};

export type CustomerUpdate = Pick<Customer, "firstName" | "lastName" | "phone" | "acceptsMarketing">;

export const TAX_DOCUMENT_TYPES = ["DNI", "CE", "RUC"] as const;
export type TaxDocumentType = (typeof TAX_DOCUMENT_TYPES)[number];

export type Address = {
  id: string;
  alias: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  /** Distrito (Peru). */
  city: string;
  /** Departamento (Peru). */
  province: string;
  postalCode: string | null;
  countryCode: string;
  taxDocumentType: TaxDocumentType | null;
  taxDocumentNumber: string | null;
  companyName: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export type AddressInput = Omit<Address, "id" | "isDefaultShipping" | "isDefaultBilling"> & {
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
};

export const PE_DEPARTMENTS = [
  "Amazonas",
  "Áncash",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Ica",
  "Junín",
  "La Libertad",
  "Lambayeque",
  "Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martín",
  "Tacna",
  "Tumbes",
  "Ucayali",
] as const;
