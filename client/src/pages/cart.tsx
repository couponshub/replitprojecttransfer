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
  restrict_sub_category?: string[] | null;
  bogo_buy_product_name?: string | null;
  bogo_get_product_name?: string | null;
  category_offer_subtype?: string | null;
}

const TYPE_COLORS: Record<string, { gradient: string; icon: string }> = {
  percentage:      { gradient: "from-blue-500 to-cyan-500", icon: "🏷️" },
  flat:            { gradient: "from-emerald-500 to-teal-500", icon: "💰" },
  free_item:       { gradient: "from-violet-500 to-purple-500", icon: "🎁" },
  flash:           { gradient: "from-orange-500 to-red-500", icon: "⚡" },
  category_offer:  { gradient: "from-violet-600 to-indigo-500", icon: "🏷️" },
  min_order:       { gradient: "from-teal-500 to-cyan-600", icon: "🛒" },
  combo:           { gradient: "from-orange-500 to-amber-500", icon: "📦" },
};

function CouponBenefit({ coupon }: { coupon: ShopCoupon }) {
  if (coupon.type === "percentage") return <span className="text-emerald-600 dark:text-emerald-400 font-bold">{coupon.value}% off</span>;
  if (coupon.type === "flat") return <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{coupon.value} flat off</span>;
  if (coupon.type === "free_item") return <span className="text-violet-600 dark:text-violet-400 font-bold">Free item added</span>;
  if (coupon.type === "min_order") {
    const sub = (coupon as any).category_offer_subtype || "percentage";
    const minAmt = (coupon as any).min_order_amount;
    if (sub === "flat") return <span className="text-teal-600 dark:text-teal-400 font-bold">Spend ₹{Number(minAmt).toLocaleString()} → ₹{coupon.value} off</span>;
    return <span className="text-teal-600 dark:text-teal-400 font-bold">Spend ₹{Number(minAmt).toLocaleString()} → {coupon.value}% off</span>;
  }
  if (coupon.type === "category_offer") {
    const sub = (coupon as any).category_offer_subtype;
    if (sub === "percentage") return <span className="text-violet-600 dark:text-violet-400 font-bold">{coupon.value}% off (category)</span>;
    if (sub === "flat") return <span className="text-violet-600 dark:text-violet-400 font-bold">₹{coupon.value} off (category)</span>;
    if (sub === "free_item") return <span className="text-violet-600 dark:text-violet-400 font-bold">Free item (category)</span>;
  }
  if (coupon.type === "combo") return <span className="text-orange-600 dark:text-orange-400 font-bold">Combo items added at special price</span>;
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
            const usageLimit = (coupon as any).usage_limit;
            const usageCount = (coupon as any).usage_count ?? 0;
            const usageRemaining = usageLimit ? Math.max(0, usageLimit - usageCount) : null;
            const isExhausted = usageLimit && usageCount >= usageLimit;
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
                    {usageRemaining !== null && !isExhausted && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{usageRemaining} of {usageLimit} uses left</p>
                    )}
                    {isExhausted && (
                      <p className="text-[10px] text-red-500 font-semibold">No uses left</p>
                    )}
                  </div>
                  {!expired && !isApplied && !isExhausted && appliedCodes.length < 3 && (
                    <button onClick={() => { onApply(coupon.code); setOpen(false); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r ${colors.gradient} shrink-0`}
                      data-testid={`button-apply-avail-${coupon.id}`}>Apply</button>
                  )}
                  {isApplied && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Applied</Badge>}
                  {expired && <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] shrink-0">Expired</Badge>}
                  {isExhausted && !isApplied && <Badge className="bg-red-100 text-red-600 border-0 text-[10px] shrink-0">Full</Badge>}
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
  const freeItemsInCart = shopItems.filter(i => i.isFreeItem);
  const hasFreeItemsInCart = freeItemsInCart.length > 0;
  const couponAlreadyApplied = coupons.length > 0 || hasFreeItemsInCart;

  const dist = (userGPS && shopData?.latitude && shopData?.longitude)
    ? haversineKm(userGPS.lat, userGPS.lon, parseFloat(shopData.latitude), parseFloat(shopData.longitude))
    : null;
  
  const deliveryFee = shopData?.delivery_fee_enabled 
    ? parseFloat(shopData.delivery_fee_amount || "0") 
    : 0;

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
          <div className="flex items-center gap-2 flex-wrap">
            {dist !== null && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away
              </p>
            )}
            {shopData?.delivery_fee_enabled ? (
              <Badge variant="outline" className="text-[10px] py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">
                + ₹{deliveryFee} Delivery
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-600 border-emerald-200">
                Free Delivery
              </Badge>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{shopItems.reduce((s, i) => s + i.quantity, 0)} items</span>
      </div>

      {/* Items — regular items first, then combo items, then free items */}
      {shopItems.filter(i => !i.isFreeItem && !i.isComboItem).map(item => (
        <Card key={item.id} className="rounded-2xl border-0 shadow-md" data-testid={`card-cart-item-${item.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <span className="text-xl">{item.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>
                </div>
                {item.sub_category && <p className="text-[10px] text-muted-foreground">{item.sub_category}</p>}
                <p className="font-bold text-primary mt-0.5 text-sm">₹{item.price.toLocaleString()} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center" data-testid={`button-decrease-${item.id}`}>
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-medium text-sm" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center" data-testid={`button-increase-${item.id}`}>
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => onRemoveItem(item.id)} className="w-7 h-7 rounded-full text-destructive flex items-center justify-center ml-1" data-testid={`button-remove-${item.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {/* Combo Offer items — added at original MRP prices; discount applied via coupon */}
      {shopItems.filter(i => i.isComboItem).length > 0 && (
        <div className="flex flex-col gap-2 pl-4 border-l-2 border-orange-300 dark:border-orange-700">
          <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Combo Offer Items
          </p>
          {shopItems.filter(i => i.isComboItem).map(item => (
            <Card key={`${item.id}-combo`} className="rounded-2xl border-0 shadow-md ring-2 ring-orange-300 dark:ring-orange-700 ring-offset-1" data-testid={`card-combo-item-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40">
                    <span className="text-xl">{item.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>
                      <Badge className="bg-orange-500 text-white border-0 text-[10px] px-1.5 py-0">COMBO</Badge>
                    </div>
                    {item.sub_category && <p className="text-[10px] text-muted-foreground">{item.sub_category}</p>}
                    <p className="font-bold text-primary mt-0.5 text-sm">₹{item.price.toLocaleString()} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-6 text-center font-medium text-sm text-muted-foreground">×{item.quantity}</span>
                    <span className="text-[9px] text-orange-500 font-semibold ml-1">Remove coupon to delete</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Free items from BOGO/coupon — shown separately below with FREE badge */}
      {shopItems.filter(i => i.isFreeItem).length > 0 && (
        <div className="flex flex-col gap-2 pl-4 border-l-2 border-emerald-300 dark:border-emerald-700">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Gift className="w-3 h-3" /> Free with offer</p>
          {shopItems.filter(i => i.isFreeItem).map(item => (
            <Card key={item.id} className="rounded-2xl border-0 shadow-md ring-2 ring-emerald-400 ring-offset-1" data-testid={`card-cart-item-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40">
                    <Gift className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>
                      <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-1.5 py-0">FREE</Badge>
                    </div>
                    {item.sub_category && <p className="text-[10px] text-muted-foreground">{item.sub_category}</p>}
                    <p className="font-bold text-emerald-600 mt-0.5 text-sm">{item.originalPrice ? <span className="line-through text-muted-foreground text-xs mr-1">₹{item.originalPrice.toLocaleString()}</span> : null} ₹0</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-6 text-center font-medium text-sm text-muted-foreground">×{item.quantity}</span>
                    <span className="text-[9px] text-emerald-600 font-semibold ml-1">Remove coupon to delete</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Per-store coupons */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{shopName} Coupons</span>
            {couponAlreadyApplied && <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">✓</span>}
          </div>

          {/* Free items claimed from shop page */}
          {hasFreeItemsInCart && coupons.length === 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {freeItemsInCart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 tracking-wide">Coupon Applied</p>
                      <p className="text-[10px] text-emerald-600">Free: {item.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Applied coupons from cart input */}
          {coupons.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {coupons.map(c => (
                <div key={c.code} className="flex items-center justify-between p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30" data-testid={`applied-coupon-${c.code}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 tracking-wide">{c.code}</p>
                      <p className="text-[10px] text-emerald-600">
                        {c.type === "percentage" ? `${c.value}% off — You saved ₹${Math.round(shopSubtotal * parseFloat(c.value) / 100).toLocaleString()}` :
                         c.type === "flat" ? `₹${c.value} off — You saved ₹${Math.min(parseFloat(c.value), shopSubtotal).toLocaleString()}` :
                         c.type === "min_order" ? (() => {
                           const saved = c.category_offer_subtype === "flat"
                             ? Math.min(parseFloat(c.value), shopSubtotal)
                             : Math.round(shopSubtotal * parseFloat(c.value) / 100);
                           return c.category_offer_subtype === "flat"
                             ? `Spend & Save — ₹${c.value} off · You saved ₹${saved.toLocaleString()}`
                             : `Spend & Save — ${c.value}% off · You saved ₹${saved.toLocaleString()}`;
                         })() :
                         c.type === "bogo" ? (
                           c.bogo_buy_product_name && c.bogo_get_product_name
                             ? `Buy ${c.bogo_buy_product_name} → Get ${c.bogo_get_product_name} FREE`
                             : c.bogo_get_product_name ? `Get ${c.bogo_get_product_name} FREE` : "BOGO offer"
                         ) :
                         c.type === "free_item" ? (() => {
                           const freeItem = (c.items_to_add || []).find((i: any) => i.isFreeItem);
                           return freeItem ? `Free: ${freeItem.name}` : "Free item added";
                         })() :
                         c.type === "combo" ? (() => {
                           const comboItems = shopItems.filter(i => i.isComboItem);
                           const comboMRP = comboItems.reduce((s, i) => s + i.price * i.quantity, 0);
                           const comboPrice = parseFloat(c.value);
                           const saved = Math.max(0, shopSubtotal - comboPrice);
                           return `Combo offer ₹${comboPrice.toLocaleString()} · You save ₹${saved.toLocaleString()}`;
                         })() :
                         c.type === "category_offer" ? (() => {
                           const cats = c.restrict_sub_category?.join(", ") || "selected categories";
                           if (c.category_offer_subtype === "percentage") return `${c.value}% off on ${cats}`;
                           if (c.category_offer_subtype === "flat") return `₹${c.value} off on ${cats}`;
                           if (c.category_offer_subtype === "free_item") return `Free item on ${cats}`;
                           return `Category offer on ${cats}`;
                         })() : "Coupon applied"}
                        {c.type !== "category_offer" && c.type !== "min_order" && c.restrict_sub_category && c.restrict_sub_category.length > 0 && <span className="text-orange-500 ml-1"> · {c.restrict_sub_category.join(", ")}</span>}
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

          {/* Coupon input — only show if no coupon yet and no free items in cart */}
          {!couponAlreadyApplied && (
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
              <AvailableShopCoupons shopId={shopId} shopTotal={shopSubtotal} appliedCodes={coupons.map(c => c.code)} onApply={onApplyCoupon} />
            </>
          )}

          {shopDiscount > 0 && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Total Store Savings</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">₹{shopDiscount.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Store Subtotal Summary */}
      <div className="px-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Store Subtotal</p>
          <Separator className="w-8" />
          <p className="text-xs font-bold text-gray-900 dark:text-white">₹{shopSubtotal.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Final</p>
          <p className="font-bold text-gray-900 dark:text-white">₹{(shopSubtotal - shopDiscount).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, clearCart, total, addItems, uniqueShopIds, appliedCoupons: cartCoupons, removeCoupon, applyCoupon } = useCart();
  const { isAuthenticated, user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [couponCodes, setCouponCodes] = useState<Record<string, string>>({});
  const [couponLoadingMap, setCouponLoadingMap] = useState<Record<string, boolean>>({});
  const [pickOneDialog, setPickOneDialog] = useState<{ open: boolean; items: any[]; shopId: string; couponData: any } | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [userGPS, setUserGPS] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);
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

  const shopGroups = uniqueShopIds.map(sid => ({ shopId: sid, items: items.filter(i => i.shop_id === sid) }));

  const getShopSubtotal = (sid: string) => items.filter(i => i.shop_id === sid).reduce((s, i) => s + i.price * i.quantity, 0);

  const getShopDiscount = (sid: string): number => {
    const coupons = cartCoupons[sid] || [];
    if (coupons.length === 0) return 0;
    const shopItems = items.filter(i => i.shop_id === sid);
    let totalDisc = 0;
    let runningSubtotal = getShopSubtotal(sid);
    
    // First, handle combo coupons specifically.
    const comboCoupon = coupons.find(c => c.type === "combo");
    if (comboCoupon) {
      const comboPrice = parseFloat(comboCoupon.value);
      // Logic: The final price for these items should be exactly the combo price.
      // The discount is the difference between current subtotal and intended combo price.
      const comboDisc = Math.max(0, runningSubtotal - comboPrice);
      totalDisc += comboDisc;
      runningSubtotal = Math.max(0, runningSubtotal - comboDisc);
    }

    // Then handle other coupons
    for (const coupon of coupons) {
      if (coupon.type === "combo") continue;
      
      const restrictCats = coupon.restrict_sub_category && coupon.restrict_sub_category.length > 0 ? coupon.restrict_sub_category : null;
      const base = restrictCats
        ? shopItems.filter(i => i.sub_category && restrictCats.includes(i.sub_category)).reduce((s, i) => s + i.price * i.quantity, 0)
        : runningSubtotal;
      
      let disc = 0;
      if (coupon.type === "percentage") disc = base * parseFloat(coupon.value) / 100;
      else if (coupon.type === "flat") disc = Math.min(parseFloat(coupon.value), base);
      else if (coupon.type === "bogo" || coupon.type === "free_item") {
        const freeItems = (coupon.items_to_add || []).filter((i: any) => i.isFreeItem);
        disc = freeItems.reduce((s: number, i: any) => s + (parseFloat(i.originalPrice || i.price || "0")), 0);
      } else if (coupon.type === "min_order") {
        if (coupon.category_offer_subtype === "flat") disc = Math.min(parseFloat(coupon.value), base);
        else disc = base * parseFloat(coupon.value) / 100;
      } else if (coupon.type === "category_offer") {
        const catBase = restrictCats ? base : 0;
        if (coupon.category_offer_subtype === "percentage") disc = catBase * parseFloat(coupon.value) / 100;
        else if (coupon.category_offer_subtype === "flat") disc = Math.min(parseFloat(coupon.value), catBase);
        else if (coupon.category_offer_subtype === "free_item") {
          const freeItems = (coupon.items_to_add || []).filter((i: any) => i.isFreeItem);
          disc = freeItems.reduce((s: number, i: any) => s + (parseFloat(i.originalPrice || i.price || "0")), 0);
        }
      }
      totalDisc += disc;
      runningSubtotal = Math.max(0, runningSubtotal - disc);
    }
    return totalDisc;
  };

  const getShopDistance = (sid: string) => {
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
    const existing = cartCoupons[shopId] || [];
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
      setCouponCodes(prev => ({ ...prev, [shopId]: "" }));

      // If free_item coupon has multiple pick-one choices, show selection dialog
      if (result.type === "free_item" && result.pick_one_items?.length > 0) {
        setPickOneDialog({ open: true, items: result.pick_one_items, shopId, couponData: result });
        return;
      }

      applyCoupon(shopId, {
        code: result.code, type: result.type, value: result.value, 
        items_to_add: result.items_to_add, 
        restrict_sub_category: result.restrict_sub_category ?? null, 
        bogo_buy_product_name: result.bogo_buy_product_name ?? null, 
        bogo_get_product_name: result.bogo_get_product_name ?? null, 
        category_offer_subtype: result.category_offer_subtype ?? null 
      });
      if (result.items_to_add?.length > 0) {
        addItems(result.items_to_add.map((item: any) => ({ id: item.id, name: item.name, price: item.price, shop_id: item.shop_id, shopName: item.shopName, isFreeItem: item.isFreeItem ?? false, isComboItem: item.isComboItem ?? false, originalPrice: item.originalPrice })));
      }
      const shopName = items.find(i => i.shop_id === shopId)?.shopName || "shop";
      toast({ title: "🎉 Coupon applied!", description: `${result.code} applied to ${shopName}` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCouponLoadingMap(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const handlePickOneFreeItem = (chosenItem: any) => {
    if (!pickOneDialog) return;
    const { shopId, couponData } = pickOneDialog;
    const freeCartItem = { id: chosenItem.id, name: chosenItem.name, price: 0, originalPrice: chosenItem.price, shop_id: chosenItem.shop_id, shopName: couponData.shopName || items.find(i => i.shop_id === shopId)?.shopName || "", isFreeItem: true };
    applyCoupon(shopId, {
      code: couponData.code, type: couponData.type, value: couponData.value, 
      items_to_add: [freeCartItem], 
      restrict_sub_category: couponData.restrict_sub_category ?? null, 
      bogo_buy_product_name: null, bogo_get_product_name: null, 
      category_offer_subtype: couponData.category_offer_subtype ?? null 
    });
    addItems([freeCartItem]);
    setPickOneDialog(null);
    const shopName = items.find(i => i.shop_id === shopId)?.shopName || "shop";
    toast({ title: "🎉 Free item added!", description: `${chosenItem.name} added free to your cart!` });
  };

  const handleRemoveCoupon = (shopId: string, code: string) => {
    const shopCoupons = cartCoupons[shopId] || [];
    const coupon = shopCoupons.find(c => c.code === code);
    if (coupon?.items_to_add?.length) {
      coupon.items_to_add.forEach((i: any) => removeItem(i.id));
    }
    removeCoupon(shopId, code);
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
          shop_id: shopId, shop_name: shopItems[0]?.shopName, coupon_code: (cartCoupons[shopId] || [])[0]?.code || null,
          customer_location: (shareLocation && userGPS) ? `${userGPS.lat},${userGPS.lon}` : null,
        });
        const shopCouponCodes = (cartCoupons[shopId] || []).map(c => c.code).join(", ");
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
                    coupons={cartCoupons[shopId] || []}
                    couponCode={couponCodes[shopId] || ""}
                    couponLoading={couponLoadingMap[shopId] || false}
                    userGPS={userGPS}
                    onCouponCodeChange={code => setCouponCodes(prev => ({ ...prev, [shopId]: code }))}
                    onApplyCoupon={(codeOverride?: string) => validateCoupon(shopId, codeOverride)}
                    onRemoveCoupon={(code: string) => handleRemoveCoupon(shopId, code)}
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
            <div className="flex flex-col gap-6">
              <Card className="rounded-2xl border-0 shadow-lg sticky top-24">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{totalSubtotal.toLocaleString()}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600 font-medium">
                        <span>Total Savings</span>
                        <span>- ₹{totalDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Service Fee (2%)</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{serviceFee.toLocaleString()}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Delivery Fee</span>
                        <span className="font-medium text-gray-900 dark:text-white">₹{deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-black text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>₹{grandTotal.toLocaleString()}</span>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <input type="checkbox" id="share-loc" checked={shareLocation} onChange={e => setShareLocation(e.target.checked)} className="rounded border-gray-300 text-primary" />
                        <label htmlFor="share-loc" className="text-xs text-muted-foreground cursor-pointer select-none">Share precise location for delivery</label>
                      </div>

                      <Button onClick={handlePlaceOrder} disabled={placingOrder} className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-700 text-lg font-bold gap-2 shadow-lg shadow-blue-500/20" data-testid="button-place-order">
                        {placingOrder ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><MessageCircle className="w-5 h-5" /> Place Order</>}
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">Your order will be sent to individual shops via WhatsApp</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!userGPS && (
                <Card className="rounded-2xl border-0 shadow-md bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Enable GPS for delivery fee</p>
                      <p className="text-[10px] text-blue-700 dark:text-blue-400">Get accurate distance-based delivery estimates</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setGpsLoading(true); navigator.geolocation.getCurrentPosition(pos => { setUserGPS({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setGpsLoading(false); }, () => setGpsLoading(false)); }} className="rounded-lg h-8 text-[10px] bg-white border-blue-200 text-blue-600" data-testid="button-enable-gps">
                      Enable
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={pickOneDialog?.open} onOpenChange={open => !open && setPickOneDialog(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Gift className="w-5 h-5 text-violet-500" /> Choose Your Free Gift</DialogTitle>
            <DialogDescription>Pick one of these items for free!</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {pickOneDialog?.items.map((item: any) => (
              <div key={item.id} onClick={() => handlePickOneFreeItem(item)} className="group relative flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-violet-500 transition-all cursor-pointer shadow-sm hover:shadow-md">
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Gift className="w-8 h-8 text-violet-500 opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground line-through">₹{parseFloat(item.price || "0").toLocaleString()}</p>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] mt-1">FREE GIFT</Badge>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 group-hover:border-violet-500 group-hover:bg-violet-500 transition-all flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Complete Profile</DialogTitle>
            <DialogDescription>We need your mobile number to send order updates via WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Mobile Number</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+91</span>
                <Input id="phone" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="1234567890" maxLength={10} className="pl-12 rounded-xl h-12 text-lg tracking-widest" data-testid="input-phone" />
              </div>
            </div>
            <Button onClick={handleSavePhone} disabled={phoneSaving} className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-700 text-lg font-bold">
              {phoneSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save & Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
