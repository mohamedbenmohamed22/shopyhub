import { Product } from "@/components/ProductCard";

const BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

// ---- Wire types (what the NestJS API actually returns) --------------------

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  category?: ApiCategory | null;
  link?: string | null;
  price?: string | null; // Prisma Decimal serializes as a string
  weekNumber?: number | null;
  year?: number | null;
  stock?: number;
  votesCount: number;
  isCurrentWinner: boolean;
  images?: string[];
  properties?: Record<string, unknown>;
  tags?: { id: string; name: string; slug?: string; color?: string | null }[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export interface TagOption {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  productCount?: number;
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "votes";
export type TagMatchMode = "any" | "all";

export interface ProductFilters {
  search?: string;
  category?: string; // category slug
  tags?: string[]; // tag slugs
  tagMode?: TagMatchMode; // combine tags with ANY (default) or ALL
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface Governorate {
  id: number;
  name: string;
  deliveryFee: string; // Decimal → string
  active: boolean;
}

export interface OrderLine {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  // Either a multi-item cart…
  items?: OrderLine[];
  // …or the legacy single-product shape.
  productId?: string;
  quantity?: number;
  customer: {
    fullName: string;
    phone: string;
    governorateId: number;
    address: string;
  };
  notes?: string;
}

// ---- Mapping API → UI Product --------------------------------------------

function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    imageUrl: p.imageUrl,
    category: p.category?.name ?? "",
    weekNumber: p.weekNumber ?? 0,
    year: p.year ?? 0,
    votes: p.votesCount ?? 0,
    link: p.link ?? "#",
    isCurrentWinner: p.isCurrentWinner,
    price: p.price != null ? Number(p.price) : undefined,
    stock: p.stock,
    images: p.images ?? [],
    properties: p.properties ?? {},
    tags: p.tags ?? [],
  };
}

// ---- Fetch helpers --------------------------------------------------------

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}

function buildQuery(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.tags?.length) params.set("tags", filters.tags.join(","));
  if (filters.tagMode && filters.tags?.length) params.set("tagMode", filters.tagMode);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.inStock) params.set("inStock", "true");
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = body?.message ?? body?.error;
    return Array.isArray(msg) ? msg.join(", ") : (msg ?? `Request failed (${res.status})`);
  } catch {
    return `Request failed (${res.status})`;
  }
}

// ---- Public API -----------------------------------------------------------

export const api = {
  getCurrentWinner: () =>
    getJson<ApiProduct>("/products/current-winner").then(toProduct),

  getPastWinners: () =>
    getJson<ApiProduct[]>("/products/past-winners").then((list) => list.map(toProduct)),

  getProduct: (idOrSlug: string) =>
    getJson<ApiProduct>(`/products/${idOrSlug}`).then(toProduct),

  // Storefront catalog: paginated list with category / tag / sort filters.
  getProducts: (filters: ProductFilters = {}) =>
    getJson<Paginated<ApiProduct>>(`/products${buildQuery(filters)}`).then((res) => ({
      data: res.data.map(toProduct),
      meta: res.meta,
    })),

  getCategories: () =>
    getJson<(CategoryOption & { _count?: { products: number } })[]>("/categories").then((list) =>
      list.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        productCount: c._count?.products,
      })),
    ),

  getTags: () =>
    getJson<(TagOption & { _count?: { products: number } })[]>("/tags").then((list) =>
      list.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        productCount: t._count?.products,
      })),
    ),

  getGovernorates: () => getJson<Governorate[]>("/reference/governorates"),

  createOrder: (payload: CreateOrderPayload) =>
    postJson<{ orderNumber: string; total: string }>("/orders", payload),

  subscribe: (email: string) =>
    postJson<{ email: string; status: string }>("/subscribers", { email }),
};
