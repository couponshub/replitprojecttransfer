import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
  couponCode?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  addItems: (items: Omit<CartItem, "quantity">[], silent?: boolean) => void;
  appliedCoupons: Record<string, any[]>;
  applyCoupon: (shopId: string, coupon: any) => void;
  removeCoupon: (shopId: string, code: string) => void;
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
  const [appliedCoupons, setAppliedCoupons] = useState<Record<string, any[]>>({});

  const shopId = items.length > 0 ? items[0].shop_id : null;
  const uniqueShopIds = Array.from(new Set(items.map(i => i.shop_id)));

  const matchItem = (a: { id: string; shop_id: string; isFreeItem?: boolean; isComboItem?: boolean; couponCode?: string }, b: { id: string; shop_id: string; isFreeItem?: boolean; isComboItem?: boolean; couponCode?: string }) =>
    a.id === b.id && a.shop_id === b.shop_id && !!a.isFreeItem === !!b.isFreeItem && !!a.isComboItem === !!b.isComboItem && a.couponCode === b.couponCode;

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems(prev => {
      // Regular items (no couponCode) merge. Items with couponCode are always unique per-coupon.
      const existing = prev.find(i => matchItem(i, item));
      if (existing && !item.couponCode) {
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
        if (existing && !item.couponCode) {
          updated = updated.map(i => matchItem(i, item) ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
          updated = [...updated, { ...item, quantity: 1 }];
        }
      }
      return updated;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    setItems(prev => {
      const newItems = prev.map(i => (i.id === id && !i.couponCode) ? { ...i, quantity } : i);
      
      // Auto-remove coupons if min_order is no longer met
      const finalItems = [...newItems];
      Object.entries(appliedCoupons).forEach(([shopId, coupons]) => {
        const coupon = coupons[0];
        if (coupon && coupon.type === "min_order") {
          const minAmount = parseFloat(coupon.min_order_amount || "0");
          const currentShopSubtotal = newItems
            .filter(i => i.shop_id === shopId && !i.couponCode)
            .reduce((sum, i) => sum + i.price * i.quantity, 0);
          
          if (currentShopSubtotal < minAmount) {
            // Remove the coupon and its items
            const couponCode = coupon.code;
            // We need to filter finalItems
            for (let idx = finalItems.length - 1; idx >= 0; idx--) {
              if (finalItems[idx].shop_id === shopId && finalItems[idx].couponCode === couponCode) {
                finalItems.splice(idx, 1);
              }
            }
            // Update appliedCoupons state indirectly via a follow-up or by shifting logic
          }
        }
      });
      return finalItems;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const itemToRemove = prev.find(i => i.id === id);
      const newItems = prev.filter(i => i.id !== id);
      if (!itemToRemove) return newItems;

      const shopId = itemToRemove.shop_id;
      const finalItems = [...newItems];
      
      // Check min_order for this shop
      const coupons = appliedCoupons[shopId] || [];
      const coupon = coupons[0];
      if (coupon && coupon.type === "min_order") {
        const minAmount = parseFloat(coupon.min_order_amount || "0");
        const currentShopSubtotal = newItems
          .filter(i => i.shop_id === shopId && !i.couponCode)
          .reduce((sum, i) => sum + i.price * i.quantity, 0);
        
        if (currentShopSubtotal < minAmount) {
          const couponCode = coupon.code;
          for (let idx = finalItems.length - 1; idx >= 0; idx--) {
            if (finalItems[idx].shop_id === shopId && finalItems[idx].couponCode === couponCode) {
              finalItems.splice(idx, 1);
            }
          }
        }
      }
      return finalItems;
    });
  };

  const removeFreeItemsForShop = (shopId: string) => {
    setItems(prev => prev.filter(i => !(i.shop_id === shopId && i.isFreeItem)));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupons({});
  };

  const applyCoupon = (shopId: string, coupon: any) => {
    setAppliedCoupons(prev => {
      // Replace existing coupon for this shop - only one allowed
      return { ...prev, [shopId]: [coupon] };
    });
    // If there was an old coupon, we should technically remove its items, 
    // but the handleRemoveCoupon in cart.tsx or a separate cleanup might be better.
    // For simplicity, we'll let the UI handle the replacement logic or add cleanup here.
  };

  const removeCoupon = (shopId: string, code: string) => {
    setAppliedCoupons(prev => {
      const newCoupons = { ...prev };
      delete newCoupons[shopId];
      return newCoupons;
    });
    setItems(prev => prev.filter(i => !(i.shop_id === shopId && i.couponCode === code)));
  };

  // Effect to sync appliedCoupons with items (cleanup coupons whose items are gone)
  useEffect(() => {
    setAppliedCoupons(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(prev).forEach(([shopId, coupons]) => {
        const coupon = coupons[0];
        if (!coupon) return;
        
        // 1. Check if min_order is still met
        if (coupon.type === "min_order") {
          const minAmount = parseFloat(coupon.min_order_amount || "0");
          const currentShopSubtotal = items
            .filter(i => i.shop_id === shopId && !i.couponCode)
            .reduce((sum, i) => sum + i.price * i.quantity, 0);
          
          if (currentShopSubtotal < minAmount) {
            delete next[shopId];
            changed = true;
            return;
          }
        }

        // 2. Check if coupon items still exist for item-based coupons
        const hasCouponItems = items.some(i => i.shop_id === shopId && i.couponCode === coupon.code);
        const isItemCoupon = coupon.type === "combo" || coupon.type === "free_item" || coupon.type === "bogo";
        if (isItemCoupon && !hasCouponItems) {
          delete next[shopId];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, addItems, removeItem, removeFreeItemsForShop, updateQuantity, clearCart, total, itemCount, shopId, uniqueShopIds, appliedCoupons, applyCoupon, removeCoupon }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
