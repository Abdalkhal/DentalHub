import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  officeId: string;
  officeName: string;
  brand?: string;
  category?: string;
  specs?: Record<string, string>;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
  addedAt: string;
};

const CART_KEY = "dh_cart_v1";

let items: CartItem[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function getSnapshot(): CartItem[] {
  if (!initialized && typeof window !== "undefined") {
    items = load();
    initialized = true;
  }
  return items;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}

export function getCart(): CartItem[] {
  return getSnapshot();
}

export function addToCart(item: Omit<CartItem, "id" | "addedAt"> & { id?: string }) {
  if (!initialized) { items = load(); initialized = true; }

  const existing = items.find(
    (i) => i.productId === item.productId && i.officeId === item.officeId,
  );

  if (existing) {
    existing.quantity += item.quantity || 1;
  } else {
    items = [
      {
        ...item,
        id: item.id ?? `cart_${Date.now().toString(36)}`,
        addedAt: new Date().toISOString(),
      },
      ...items,
    ];
  }

  emit();
  return items.length;
}

export function removeFromCart(cartItemId: string) {
  if (!initialized) { items = load(); initialized = true; }
  items = items.filter((i) => i.id !== cartItemId);
  emit();
}

export function updateCartQuantity(cartItemId: string, quantity: number) {
  if (!initialized) { items = load(); initialized = true; }
  if (quantity <= 0) {
    removeFromCart(cartItemId);
    return;
  }
  const item = items.find((i) => i.id === cartItemId);
  if (item) {
    item.quantity = quantity;
    emit();
  }
}

export function clearCart() {
  items = [];
  initialized = true;
  emit();
}

export function cartTotal(): { count: number; subtotal: number } {
  const cart = getCart();
  return {
    count: cart.reduce((s, i) => s + i.quantity, 0),
    subtotal: cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  };
}

export function cartSummary(): {
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
} {
  const { count, subtotal } = cartTotal();
  const shipping = 0;
  return { count, subtotal, shipping, total: subtotal + shipping };
}

export function cartByOffice(): Record<string, CartItem[]> {
  const cart = getCart();
  return cart.reduce((acc, i) => {
    if (!acc[i.officeId]) acc[i.officeId] = [];
    acc[i.officeId].push(i);
    return acc;
  }, {} as Record<string, CartItem[]>);
}
