import { useCallback, useEffect, useState } from "react";

const SHOP_HISTORY_KEY = "chx_shop_history";
const CAT_HISTORY_KEY = "chx_cat_history";
const MAX_SHOPS = 20;
const MAX_CATS = 10;

interface ShopEntry { id: string; categoryId?: string; ts: number; }
interface CatEntry { id: string; ts: number; }

function readShops(): ShopEntry[] {
  try { return JSON.parse(localStorage.getItem(SHOP_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function readCats(): CatEntry[] {
  try { return JSON.parse(localStorage.getItem(CAT_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

export function recordShopView(shopId: string, categoryId?: string) {
  const existing = readShops().filter(e => e.id !== shopId);
  const updated = [{ id: shopId, categoryId, ts: Date.now() }, ...existing].slice(0, MAX_SHOPS);
  try { localStorage.setItem(SHOP_HISTORY_KEY, JSON.stringify(updated)); }
  catch {}
}

export function recordCategoryView(catId: string) {
  const existing = readCats().filter(e => e.id !== catId);
  const updated = [{ id: catId, ts: Date.now() }, ...existing].slice(0, MAX_CATS);
  try { localStorage.setItem(CAT_HISTORY_KEY, JSON.stringify(updated)); }
  catch {}
}

export function useUserHistory() {
  const [shopHistory, setShopHistory] = useState<ShopEntry[]>([]);
  const [catHistory, setCatHistory] = useState<CatEntry[]>([]);

  useEffect(() => {
    setShopHistory(readShops());
    setCatHistory(readCats());
  }, []);

  const recordShop = useCallback((shopId: string, categoryId?: string) => {
    recordShopView(shopId, categoryId);
    setShopHistory(readShops());
  }, []);

  const recordCategory = useCallback((catId: string) => {
    recordCategoryView(catId);
    setCatHistory(readCats());
  }, []);

  const recentShopIds = shopHistory.slice(0, 8).map(e => e.id);

  const topCategoryIds = (() => {
    const freq: Record<string, number> = {};
    for (const e of shopHistory) {
      if (e.categoryId) freq[e.categoryId] = (freq[e.categoryId] || 0) + 1;
    }
    for (const e of catHistory) {
      freq[e.id] = (freq[e.id] || 0) + 2;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id]) => id);
  })();

  return {
    recentShopIds,
    topCategoryIds,
    hasHistory: shopHistory.length > 0 || catHistory.length > 0,
    recordShop,
    recordCategory,
  };
}
