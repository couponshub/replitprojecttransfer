import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  shop_id: string;
  shopName: string;
  quantity: number;
  isFreeItem?: boolean;
  isComboItem?: boolean;
  originalPrice?: number;
  sub_category?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  addItems: (items: Omit<CartItem, "quantity">[], silent?: boolean) => void;
  removeItem: (id: string) => void;
  removeFreeItemsForShop: (shopId: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  shopId: string | null;
  uniqueShopIds: string[];
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const shopId = items.length > 0 ? items[0].shop_id : null;
  const uniqueShopIds = Array.from(new Set(items.map(i => i.shop_id)));

  const matchItem = (a: { id: string; shop_id: string; isFreeItem?: boolean; isComboItem?: boolean }, b: { id: string; shop_id: string; isFreeItem?: boolean; isComboItem?: boolean }) =>
    a.id === b.id && a.shop_id === b.shop_id && !!a.isFreeItem === !!b.isFreeItem && !!a.isComboItem === !!b.isComboItem;

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems(prev => {
      const existing = prev.find(i => matchItem(i, item));
      if (existing) {
        return prev.map(i => matchItem(i, item) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const addItems = (newItems: Omit<CartItem, "quantity">[], silent = false) => {
    setItems(prev => {
      let updated = [...prev];
      for (const item of newItems) {
        const existing = updated.find(i => matchItem(i, item));
        if (existing) {
          updated = updated.map(i => matchItem(i, item) ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
          updated = [...updated, { ...item, quantity: 1 }];
        }
      }
      return updated;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const removeFreeItemsForShop = (shopId: string) => {
    setItems(prev => prev.filter(i => !(i.shop_id === shopId && i.isFreeItem)));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, addItems, removeItem, removeFreeItemsForShop, updateQuantity, clearCart, total, itemCount, shopId, uniqueShopIds }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
