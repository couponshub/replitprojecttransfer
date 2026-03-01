import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCart, CartItem } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, CheckCircle, ArrowLeft,
  Gift, Sparkles, ChevronDown, Percent, Zap, X,
  Phone, User, MessageCircle, MapPin, Navigation
} from "lucide-react";
import type { Coupon, Shop } from "@shared/schema";

type ShopCoupon = Coupon & { shop?: Shop };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface AppliedCoupon {
  code: string;
  type: string;
  value: string;
  items_to_add?: any[];
  restrict_sub_category?: string | null;
  bogo_buy_product_name?: string | null;
  bogo_get_product_name?: string | null;
}

const TYPE_COLORS: Record<string, { gradient: string; icon: string }> = {
  percentage: { gradient: "from-blue-500 to-cyan-500", icon: "🏷️" },
  flat:       { gradient: "from-emerald-500 to-teal-500", icon: "💰" },
  free_item:  { gradient: "from-violet-500 to-purple-500", icon: "🎁" },
  flash:      { gradient: "from-orange-500 to-red-500", icon: "⚡" },
};

function CouponBenefit({ coupon }: { coupon: ShopCoupon }) {
  if (coupon.type === "percentage") return <span className="text-emerald-600 dark:text-emerald-400 font-bold">{coupon.value}% off</span>;
  if (coupon.type === "flat") return <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{coupon.value} flat off</span>;
  if (coupon.type === "free_item") return <span className="text-violet-600 dark:text-violet-400 font-bold">Free item added</span>;
  return <span className="text-blue-600 dark:text-blue-400 font-bold">Special offer</span>;
}

function AvailableShopCoupons({ shopId, shopTotal, appliedCodes, onApply }: { shopId: string; shopTotal: number; appliedCodes: string[]; onApply: (code: string) => void; }) {
  const [open, setOpen] = useState(false);
  const { data: allCoupons = [], isLoading } = useQuery<ShopCoupon[]>({
    queryKey: ["/api/coupons", shopId],
    queryFn: async () => { const res = await fetch(`/api/coupons?shopId=${shopId}`); return res.json(); },
    enabled: !!shopId,
  });
  const coupons = allCoupons.filter(c => c.is_active);
  if (coupons.length === 0 && !isLoading) return null;
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left ${open ? "bg-violet-50/80 dark:bg-violet-950/20 border-violet-300 dark:border-violet-700" : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"}`}
        data-testid={`button-show-coupons-${shopId}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Available coupons</span>
          {coupons.length > 0 && <span className="w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center">{coupons.length}</span>}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {coupons.map(coupon => {
            const colors = TYPE_COLORS[coupon.type] || TYPE_COLORS.percentage;
            const expired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
            const isApplied = appliedCodes.includes(coupon.code);
            return (
              <div key={coupon.id} className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900" data-testid={`avail-coupon-${coupon.id}`}>
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.gradient}`} />
                <div className="p-2.5 flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shrink-0`}><span className="text-xs">{colors.icon}</span></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black tracking-wider text-gray-900 dark:text-white">{coupon.code}</p>
                    <div className="text-[11px]"><CouponBenefit coupon={coupon} /></div>
                    {coupon.type !== "free_item" && !expired && shopTotal > 0 && (
                      <p className="text-[10px] text-emerald-600">Saves ₹{coupon.type === "percentage" ? Math.floor(shopTotal * parseFloat(coupon.value as string) / 100) : Math.min(parseFloat(coupon.value as string), shopTotal)}</p>
                    )}
                  </div>
                  {!expired && !isApplied && appliedCodes.length < 3 && (
                    <button onClick={() => { onApply(coupon.code); setOpen(false); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r ${colors.gradient} shrink-0`}
                      data-testid={`button-apply-avail-${coupon.id}`}>Apply</button>
                  )}
                  {isApplied && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Applied</Badge>}
                  {expired && <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] shrink-0">Expired</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ShopSectionProps {
  shopId: string;
  shopItems: CartItem[];
  coupons: AppliedCoupon[];
  couponCode: string;
  couponLoading: boolean;
  userGPS: { lat: number; lon: number } | null;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: (codeOverride?: string) => void;
  onRemoveCoupon: (code: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  getShopDiscount: () => number;
  onShopData: (data: any) => void;
}

function ShopSection({ shopId, shopItems, coupons, couponCode, couponLoading, userGPS, onCouponCodeChange, onApplyCoupon, onRemoveCoupon, onRemoveItem, onUpdateQty, getShopDiscount, onShopData }: ShopSectionProps) {
  const { data: shopData } = useQuery<any>({
    queryKey: [`/api/shops/${shopId}`],
    enabled: !!shopId,
  });

  useEffect(() => { if (shopData) onShopData(shopData); }, [shopData]);

  const shopName = shopItems[0]?.shopName || "Shop";
  const shopSubtotal = shopItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shopDiscount = getShopDiscount();

  const dist = (userGPS && shopData?.latitude && shopData?.longitude)
    ? haversineKm(userGPS.lat, userGPS.lon, parseFloat(shopData.latitude), parseFloat(shopData.longitude))
    : null;
  const deliveryFee = dist !== null ? Math.round(dist * 15) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Store header */}
      <div className="flex items-center gap-3 px-1">
        {shopData?.logo ? (
          <img src={shopData.logo} alt={shopName} className="w-9 h-9 rounded-xl object-cover border border-gray-100 dark:border-gray-800 shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{shopName[0]}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{shopName}</p>
          {dist !== null && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away
              {deliveryFee !== null && (deliveryFee === 0 ? " · Free delivery" : ` · ₹${deliveryFee} delivery`)}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{shopItems.reduce((s, i) => s + i.quantity, 0)} items</span>
      </div>

      {/* Items */}
      {shopItems.map(item => (
        <Card key={item.id} className={`rounded-2xl border-0 shadow-md ${item.isFreeItem ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`} data-testid={`card-cart-item-${item.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${item.isFreeItem ? "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40" : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"}`}>
                {item.isFreeItem ? <Gift className="w-6 h-6 text-emerald-600" /> : <span className="text-xl">{item.name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>
                  {item.isFreeItem && <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-1.5 py-0">FREE</Badge>}
                </div>
                {item.sub_category && <p className="text-[10px] text-muted-foreground">{item.sub_category}</p>}
                {item.isFreeItem
                  ? <p className="font-bold text-emerald-600 mt-0.5 text-sm">₹0</p>
                  : <p className="font-bold text-primary mt-0.5 text-sm">₹{item.price.toLocaleString()} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString()}</p>
                }
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!item.isFreeItem && (
                  <>
                    <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center" data-testid={`button-decrease-${item.id}`}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-medium text-sm" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center" data-testid={`button-increase-${item.id}`}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </>
                )}
                {item.isFreeItem && <span className="w-6 text-center font-medium text-sm text-muted-foreground">×{item.quantity}</span>}
                <button onClick={() => onRemoveItem(item.id)} className="w-7 h-7 rounded-full text-destructive flex items-center justify-center ml-1" data-testid={`button-remove-${item.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Per-store coupons — up to 3 */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{shopName} Coupons</span>
            {coupons.length > 0 && <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">✓</span>}
          </div>
          {/* Applied coupons list */}
          {coupons.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {coupons.map(c => (
                <div key={c.code} className="flex items-center justify-between p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30" data-testid={`applied-coupon-${c.code}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 tracking-wide">{c.code}</p>
                      <p className="text-[10px] text-emerald-600">
                        {c.type === "percentage" ? `${c.value}% off` :
                         c.type === "flat" ? `₹${c.value} off` :
                         c.type === "bogo" ? (
                           c.bogo_buy_product_name && c.bogo_get_product_name
                             ? `Buy ${c.bogo_buy_product_name} → Get ${c.bogo_get_product_name} FREE`
                             : c.bogo_get_product_name ? `Get ${c.bogo_get_product_name} FREE` : "BOGO offer"
                         ) :
                         c.type === "free_item" ? (() => {
                           const freeItem = (c.items_to_add || []).find((i: any) => i.isFreeItem);
                           return freeItem ? `Free: ${freeItem.name}` : "Free item added";
                         })() : "Coupon applied"}
                        {c.restrict_sub_category && <span className="text-orange-500 ml-1"> · {c.restrict_sub_category}</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => onRemoveCoupon(c.code)} className="w-5 h-5 rounded-md bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-muted-foreground hover:text-destructive" data-testid={`button-remove-coupon-${c.code}`}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Coupon input — only show if no coupon yet */}
          {coupons.length < 1 && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={e => onCouponCodeChange(e.target.value.toUpperCase())}
                    className="pl-7 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-mono uppercase tracking-wider h-9 text-sm"
                    onKeyDown={e => e.key === "Enter" && onApplyCoupon()}
                    data-testid={`input-coupon-code-${shopId}`} />
                </div>
                <Button onClick={() => onApplyCoupon()} disabled={couponLoading || !couponCode}
                  className="rounded-xl shrink-0 bg-gradient-to-r from-blue-500 to-violet-600 border-0 h-9 text-sm px-4"
                  data-testid={`button-apply-coupon-${shopId}`}>
                  {couponLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Zap className="w-3 h-3 mr-1" />Apply</>}
                </Button>
              </div>
              <AvailableShopCoupons shopId={shopId} shopTotal={shopSubtotal} appliedCodes={coupons.map(c => c.code)} onApply={code => { onCouponCodeChange(code); onApplyCoupon(code); }} />
            </>
          )}
          {shopDiscount > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-2 text-center">Total savings: ₹{shopDiscount.toFixed(0)}</p>
          )}
        </CardContent>
      </Card>

      {/* Per-store subtotal bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <span className="text-sm text-muted-foreground font-medium">{shopName} subtotal</span>
        <div className="text-right">
          {shopDiscount > 0 && <p className="text-xs line-through text-muted-foreground">₹{shopSubtotal.toLocaleString()}</p>}
          <p className="font-bold text-gray-900 dark:text-white">₹{(shopSubtotal - shopDiscount).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, clearCart, total, addItems, uniqueShopIds } = useCart();
  const { isAuthenticated, user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [appliedCoupons, setAppliedCoupons] = useState<Record<string, AppliedCoupon[]>>({});
  const [couponCodes, setCouponCodes] = useState<Record<string, string>>({});
  const [couponLoadingMap, setCouponLoadingMap] = useState<Record<string, boolean>>({});
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [userGPS, setUserGPS] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [shopDataMap, setShopDataMap] = useState<Record<string, any>>({});

  const lastShopId = typeof window !== "undefined" ? localStorage.getItem("lastShopId") : null;

  useEffect(() => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserGPS({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingCoupon");
    if (!raw) return;
    try {
      const coupon = JSON.parse(raw);
      sessionStorage.removeItem("pendingCoupon");
      if (coupon.shop_id) {
        const entry: AppliedCoupon = { code: coupon.code, type: coupon.type, value: coupon.value, items_to_add: coupon.items_to_add };
        setAppliedCoupons(prev => {
          const existing = prev[coupon.shop_id] || [];
          if (existing.find(c => c.code === coupon.code)) return prev;
          return { ...prev, [coupon.shop_id]: [...existing, entry] };
        });
        setCouponCodes(prev => ({ ...prev, [coupon.shop_id]: "" }));
      }
    } catch {}
  }, []);

  const shopGroups = uniqueShopIds.map(sid => ({ shopId: sid, items: items.filter(i => i.shop_id === sid) }));

  const getShopSubtotal = (sid: string) => items.filter(i => i.shop_id === sid).reduce((s, i) => s + i.price * i.quantity, 0);

  const getShopDiscount = (sid: string): number => {
    const coupons = appliedCoupons[sid] || [];
    if (coupons.length === 0) return 0;
    const shopItems = items.filter(i => i.shop_id === sid);
    let totalDisc = 0;
    let runningSubtotal = getShopSubtotal(sid);
    for (const coupon of coupons) {
      const base = coupon.restrict_sub_category
        ? shopItems.filter(i => i.sub_category === coupon.restrict_sub_category).reduce((s, i) => s + i.price * i.quantity, 0)
        : runningSubtotal;
      let disc = 0;
      if (coupon.type === "percentage") disc = base * parseFloat(coupon.value) / 100;
      else if (coupon.type === "flat") disc = Math.min(parseFloat(coupon.value), base);
      else if (coupon.type === "bogo" || coupon.type === "free_item") {
        const freeItems = (coupon.items_to_add || []).filter((i: any) => i.isFreeItem);
        disc = freeItems.reduce((s: number, i: any) => s + (parseFloat(i.originalPrice || i.price || "0")), 0);
      }
      totalDisc += disc;
      runningSubtotal = Math.max(0, runningSubtotal - disc);
    }
    return totalDisc;
  };

  const getShopDistance = (sid: string): number | null => {
    const d = shopDataMap[sid];
    if (!userGPS || !d?.latitude || !d?.longitude) return null;
    return haversineKm(userGPS.lat, userGPS.lon, parseFloat(d.latitude), parseFloat(d.longitude));
  };

  const totalSubtotal = uniqueShopIds.reduce((s, sid) => s + getShopSubtotal(sid), 0);
  const totalDiscount = uniqueShopIds.reduce((s, sid) => s + getShopDiscount(sid), 0);
  const afterDiscount = totalSubtotal - totalDiscount;
  const serviceFee = Math.round(afterDiscount * 0.02);
  const deliveryFee = uniqueShopIds.reduce((s, sid) => {
    const dist = getShopDistance(sid);
    return s + (dist !== null ? Math.round(dist * 15) : 0);
  }, 0);
  const grandTotal = afterDiscount + serviceFee + (userGPS ? deliveryFee : 0);

  const validateCoupon = async (shopId: string, codeOverride?: string) => {
    const code = (codeOverride || couponCodes[shopId] || "").trim().toUpperCase();
    if (!code) return;
    const existing = appliedCoupons[shopId] || [];
    if (existing.find(c => c.code === code)) {
      toast({ title: "Coupon already applied", variant: "destructive" }); return;
    }
    if (existing.length >= 1) {
      toast({ title: "Only 1 coupon allowed per store", variant: "destructive" }); return;
    }
    setCouponLoadingMap(prev => ({ ...prev, [shopId]: true }));
    try {
      const result = await apiRequest("POST", "/api/coupons/validate", {
        code, shopId, cartTotal: getShopSubtotal(shopId).toString(),
      });
      const newCoupon: AppliedCoupon = { code: result.code, type: result.type, value: result.value, items_to_add: result.items_to_add, restrict_sub_category: result.restrict_sub_category ?? null, bogo_buy_product_name: result.bogo_buy_product_name ?? null, bogo_get_product_name: result.bogo_get_product_name ?? null };
      setAppliedCoupons(prev => ({ ...prev, [shopId]: [...(prev[shopId] || []), newCoupon] }));
      setCouponCodes(prev => ({ ...prev, [shopId]: "" }));
      if (result.items_to_add?.length > 0) {
        addItems(result.items_to_add.map((item: any) => ({ id: item.id, name: item.name, price: item.price, shop_id: item.shop_id, shopName: item.shopName, isFreeItem: item.isFreeItem ?? false })));
      }
      const shopName = items.find(i => i.shop_id === shopId)?.shopName || "shop";
      toast({ title: "🎉 Coupon applied!", description: `${result.code} applied to ${shopName}` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCouponLoadingMap(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const removeCoupon = (shopId: string, code: string) => {
    const shopCoupons = appliedCoupons[shopId] || [];
    const coupon = shopCoupons.find(c => c.code === code);
    if (coupon?.items_to_add?.length) coupon.items_to_add.forEach((i: any) => removeItem(i.id));
    setAppliedCoupons(prev => ({ ...prev, [shopId]: (prev[shopId] || []).filter(c => c.code !== code) }));
  };

  const doPlaceOrders = async () => {
    setPlacingOrder(true);
    try {
      const placedOrders: any[] = [];
      for (const { shopId, items: shopItems } of shopGroups) {
        const sub = getShopSubtotal(shopId);
        const disc = getShopDiscount(shopId);
        const svc = Math.round((sub - disc) * 0.02);
        const dist = getShopDistance(shopId);
        const del = dist !== null && userGPS ? Math.round(dist * 15) : 0;
        const final = sub - disc + svc + del;
        const order = await apiRequest("POST", "/api/orders", {
          items: shopItems.map(i => ({ product_id: i.id, product_name: i.name, quantity: i.quantity, price: i.price.toString(), is_free_item: i.isFreeItem || false })),
          total_amount: sub.toString(), discount_amount: disc.toString(), final_amount: final.toString(),
          shop_id: shopId, shop_name: shopItems[0]?.shopName, coupon_code: (appliedCoupons[shopId] || [])[0]?.code || null,
        });
        const shopCouponCodes = (appliedCoupons[shopId] || []).map(c => c.code).join(", ");
        placedOrders.push({
          orderId: order?.id, shopId, shopName: shopItems[0]?.shopName || "Shop",
          shopWhatsapp: shopDataMap[shopId]?.whatsapp_number, shopPaymentId: shopDataMap[shopId]?.payment_id, shopPaymentQr: shopDataMap[shopId]?.payment_qr,
          items: shopItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, isFreeItem: i.isFreeItem })),
          subtotal: sub, discount: disc, serviceFee: svc, deliveryFee: del, finalAmount: final,
          couponCode: shopCouponCodes || null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      const first = placedOrders[0] || {};
      sessionStorage.setItem("pendingOrder", JSON.stringify({
        orders: placedOrders, grandTotal, totalSubtotal, totalDiscount, serviceFee, deliveryFee: userGPS ? deliveryFee : 0,
        customerName: user?.name, customerPhone: user?.phone, customerAddress: user?.address, lastShopId,
        shopName: first.shopName, shopWhatsapp: first.shopWhatsapp, shopPaymentId: first.shopPaymentId, shopPaymentQr: first.shopPaymentQr,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, isFreeItem: i.isFreeItem })),
        orderId: first.orderId, subtotal: totalSubtotal, discount: totalDiscount, finalAmount: grandTotal,
      }));
      clearCart();
      navigate("/order-confirm");
    } catch (err: any) {
      toast({ title: err.message || "Failed to place order", variant: "destructive" });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (!user?.phone) { setPhoneInput(""); setPhoneDialogOpen(true); return; }
    await doPlaceOrders();
  };

  const handleSavePhone = async () => {
    const cleaned = phoneInput.replace(/\D/g, "");
    if (cleaned.length !== 10) { toast({ title: "Please enter a valid 10-digit mobile number", variant: "destructive" }); return; }
    setPhoneSaving(true);
    try {
      await updateProfile({ phone: cleaned });
      setPhoneDialogOpen(false);
      toast({ title: "Mobile number saved!" });
      await doPlaceOrders();
    } catch {
      toast({ title: "Failed to save number. Try again.", variant: "destructive" });
    } finally {
      setPhoneSaving(false);
    }
  };

  const requestGPS = () => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserGPS({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setGpsLoading(false); },
      () => setGpsLoading(false), { timeout: 8000 }
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Add items from your favorite shops to get started</p>
          <Button onClick={() => navigate(lastShopId ? `/shop/${lastShopId}` : "/home")} className="rounded-xl h-12 px-8" data-testid="button-browse-shops">
            {lastShopId ? "Back to Store" : "Browse Shops"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Button variant="ghost" size="sm" onClick={() => lastShopId ? navigate(`/shop/${lastShopId}`) : navigate("/home")} className="mb-4 -ml-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" /> Continue Shopping
          </Button>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Shopping Cart <span className="text-muted-foreground text-lg font-normal">({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{uniqueShopIds.length} store{uniqueShopIds.length > 1 ? "s" : ""}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — per-store sections */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {shopGroups.map(({ shopId, items: shopItems }, idx) => (
                <div key={shopId}>
                  <ShopSection
                    shopId={shopId}
                    shopItems={shopItems}
                    coupons={appliedCoupons[shopId] || []}
                    couponCode={couponCodes[shopId] || ""}
                    couponLoading={couponLoadingMap[shopId] || false}
                    userGPS={userGPS}
                    onCouponCodeChange={code => setCouponCodes(prev => ({ ...prev, [shopId]: code }))}
                    onApplyCoupon={(codeOverride?: string) => validateCoupon(shopId, codeOverride)}
                    onRemoveCoupon={(code: string) => removeCoupon(shopId, code)}
                    onRemoveItem={removeItem}
                    onUpdateQty={updateQuantity}
                    getShopDiscount={() => getShopDiscount(shopId)}
                    onShopData={data => setShopDataMap(prev => ({ ...prev, [shopId]: data }))}
                  />
                  {idx < shopGroups.length - 1 && <div className="border-b-2 border-dashed border-gray-200 dark:border-gray-700 mt-4" />}
                </div>
              ))}
            </div>

            {/* Right — summary */}
            <div className="flex flex-col gap-4">
              {/* GPS prompt */}
              {gpsLoading ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <Navigation className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  <span className="text-xs text-blue-600">Getting your location…</span>
                </div>
              ) : !userGPS ? (
                <button onClick={requestGPS} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors text-left" data-testid="button-get-location">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Enable location for delivery fee (₹15/km)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Location active • delivery auto-calculated</span>
                </div>
              )}

              {/* Contact info */}
              {user && (
                <Card className="rounded-2xl border-0 shadow-md" data-testid="card-contact-info">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3.5 h-3.5 text-violet-500" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Order For</h3>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200" data-testid="text-order-name">{user.name}</p>
                    {user.phone && <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-order-phone">+91 {user.phone}</p>}
                    {user.email && <p className="text-xs text-muted-foreground truncate" data-testid="text-order-email">{user.email}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Order Summary */}
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({uniqueShopIds.length} store{uniqueShopIds.length > 1 ? "s" : ""})</span>
                      <span className="font-medium">₹{totalSubtotal.toLocaleString()}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-600">Coupon discounts</span>
                        <span className="font-medium text-emerald-600">-₹{totalDiscount.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Service fee</span>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-muted-foreground">2%</span>
                      </div>
                      <span className="font-medium">₹{serviceFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Delivery fee</span>
                        {userGPS && uniqueShopIds.map(sid => {
                          const dist = getShopDistance(sid);
                          return dist !== null ? (
                            <span key={sid} className="text-[10px] text-muted-foreground">
                              {shopDataMap[sid]?.name || items.find(i => i.shop_id === sid)?.shopName}: {dist.toFixed(1)}km × ₹15 = ₹{Math.round(dist * 15)}
                            </span>
                          ) : null;
                        })}
                      </div>
                      {userGPS
                        ? deliveryFee === 0 ? <span className="font-medium text-emerald-600">Free</span> : <span className="font-medium">₹{deliveryFee.toLocaleString()}</span>
                        : <span className="text-xs text-muted-foreground">₹15/km</span>
                      }
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900 dark:text-white">Total</span>
                      <div className="text-right">
                        {totalDiscount > 0 && <div className="text-xs text-muted-foreground line-through">₹{totalSubtotal.toLocaleString()}</div>}
                        <span className="font-black text-xl text-gray-900 dark:text-white">₹{grandTotal.toLocaleString()}</span>
                        {totalDiscount > 0 && <div className="text-xs text-emerald-600 font-semibold">You save ₹{totalDiscount.toFixed(0)}!</div>}
                        {!userGPS && <div className="text-[10px] text-muted-foreground">+ delivery (enable GPS)</div>}
                      </div>
                    </div>
                  </div>
                  <Button onClick={handlePlaceOrder} disabled={placingOrder}
                    className="w-full mt-5 h-12 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-violet-600 border-0 shadow-lg shadow-blue-500/25 text-base"
                    data-testid="button-place-order">
                    {placingOrder
                      ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Placing {shopGroups.length > 1 ? "Orders" : "Order"}...</div>
                      : `Place ${shopGroups.length > 1 ? `${shopGroups.length} Orders` : "Order"} → ₹${grandTotal.toLocaleString()}`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">🔒 Secure checkout • 2% service fee applies</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-lg">Add Mobile Number</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              The shop will contact you on WhatsApp to confirm your order. Please add your mobile number before placing the order.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-input">Mobile Number</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">+91</span>
                <Input id="phone-input" type="tel" inputMode="numeric" placeholder="9876543210" value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={e => e.key === "Enter" && handleSavePhone()}
                  className="h-12 rounded-xl pl-12 text-base" autoFocus data-testid="input-phone-dialog" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPhoneDialogOpen(false)} data-testid="button-phone-cancel">Cancel</Button>
              <Button className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 border-0 font-semibold" onClick={handleSavePhone}
                disabled={phoneSaving || phoneInput.replace(/\D/g, "").length !== 10} data-testid="button-phone-save">
                {phoneSaving ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</div>
                  : <><Phone className="w-4 h-4 mr-1" />Save & Place Order</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
