import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/components/ProductCard";
import { clampQuantity } from "@/lib/money";

export interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  stock: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number; // total units
  subtotal: number;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "potw_cart";
const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add: CartContextValue["add"] = useCallback((product, quantity = 1) => {
    const max = product.stock ?? 99;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: clampQuantity(i.quantity + quantity, max) }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price ?? 0,
          stock: max,
          quantity: clampQuantity(quantity, max),
        },
      ];
    });
  }, []);

  const setQuantity: CartContextValue["setQuantity"] = useCallback((id, quantity) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: clampQuantity(quantity, i.stock) } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const remove: CartContextValue["remove"] = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, count, subtotal, add, setQuantity, remove, clear };
  }, [items, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
