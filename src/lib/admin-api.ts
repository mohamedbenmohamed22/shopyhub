const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const TOKEN_KEY = "pow_admin_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ---- Shared types ---------------------------------------------------------

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type ProductStatus = "draft" | "published" | "archived";
export type AdminRole = "admin" | "staff";

export interface AuthUser {
  id: string;
  email: string;
  role: AdminRole;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  fullName: string;
  phone: string;
  address: string;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  total: string;
  notes?: string | null;
  createdAt: string;
  governorate: { id: number; name: string };
  items: { productName: string; quantity: number; unitPrice: string; lineTotal: string }[];
}

export interface PropertyDef {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  propertySchema: PropertyDef[];
  _count?: { products: number };
}

export interface AdminTag {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  _count?: { products: number };
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  images: string[];
  properties: Record<string, unknown>;
  price: string | null;
  weekNumber: number | null;
  year: number | null;
  votesCount: number;
  isCurrentWinner: boolean;
  status: ProductStatus;
  category?: { id: string; name: string } | null;
  tags?: { id: string; name: string; color?: string | null }[];
}

export interface ProductInput {
  name?: string;
  tagline?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  properties?: Record<string, unknown>;
  categoryId?: string;
  tagIds?: string[];
  price?: number;
  weekNumber?: number;
  year?: number;
  status?: string;
  isCurrentWinner?: boolean;
}

export interface AdminSubscriber {
  id: string;
  email: string;
  status: "subscribed" | "unsubscribed";
  confirmed: boolean;
  createdAt: string;
}

export interface AdminVote {
  id: string;
  createdAt: string;
  product: { id: string; name: string };
  edition: { weekNumber: number; year: number };
}

export interface Overview {
  products: { total: number; published: number };
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    grossRevenueTnd: number;
    netRevenueTnd: number;
  };
  subscribers: { total: number; active: number };
  votes: { total: number };
  recentOrders: AdminOrder[];
}

// ---- Request helpers ------------------------------------------------------

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    tokenStore.clear();
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      const m = body?.message ?? body?.error;
      msg = Array.isArray(m) ? m.join(", ") : (m ?? msg);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function uploadMultipart<T>(path: string, file: File): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  const token = tokenStore.get();
  // No Content-Type header — the browser sets the multipart boundary.
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (res.status === 401) {
    tokenStore.clear();
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const b = await res.json();
      const m = b?.message ?? b?.error;
      msg = Array.isArray(m) ? m.join(", ") : (m ?? msg);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// ---- Admin API ------------------------------------------------------------

export const adminApi = {
  // auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    ),
  me: () => request<AuthUser>("/auth/me"),

  // dashboard
  overview: () => request<Overview>("/admin/overview"),

  // orders
  listOrders: (p: { page?: number; status?: string; phone?: string } = {}) =>
    request<Paginated<AdminOrder>>(`/admin/orders${qs(p)}`),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    request<AdminOrder>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // products
  listProducts: (p: { page?: number; status?: string; search?: string; categoryId?: string } = {}) =>
    request<Paginated<AdminProduct>>(`/admin/products${qs(p)}`),
  createProduct: (body: ProductInput) =>
    request<AdminProduct>("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: ProductInput) =>
    request<AdminProduct>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<AdminProduct>(`/products/${id}`, { method: "DELETE" }),

  // categories
  listCategories: () => request<AdminCategory[]>("/categories"),
  createCategory: (body: { name: string; propertySchema?: PropertyDef[] }) =>
    request<AdminCategory>("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: { name?: string; propertySchema?: PropertyDef[] }) =>
    request<AdminCategory>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // tags
  listTags: () => request<AdminTag[]>("/tags"),
  createTag: (body: { name: string; color?: string }) =>
    request<AdminTag>("/tags", { method: "POST", body: JSON.stringify(body) }),
  updateTag: (id: string, body: { name?: string; color?: string }) =>
    request<AdminTag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTag: (id: string) => request<AdminTag>(`/tags/${id}`, { method: "DELETE" }),

  // Upload an image and get its URL back — works before a product exists, so it
  // powers both the cover image at creation time and the gallery.
  uploadImage: (file: File) => uploadMultipart<{ url: string }>("/products/upload", file),

  // subscribers
  listSubscribers: (p: { page?: number; status?: string } = {}) =>
    request<Paginated<AdminSubscriber>>(`/admin/subscribers${qs(p)}`),

  // votes
  listVotes: (p: { page?: number } = {}) => request<Paginated<AdminVote>>(`/admin/votes${qs(p)}`),
};
