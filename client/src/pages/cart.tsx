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
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => onCouponCodeChange(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                    data-testid={`input-coupon-${shopId}`}
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={() => onApplyCoupon()} 
                  disabled={couponLoading || !couponCode}
                  className="h-9 rounded-xl px-4 font-bold bg-violet-600 hover:bg-violet-700"
                  data-testid={`button-apply-coupon-${shopId}`}
                >
                  {couponLoading ? "..." : "Apply"}
                </Button>
              </div>
              <AvailableShopCoupons shopId={shopId} shopTotal={shopSubtotal} appliedCodes={coupons.map(c => c.code)} onApply={(code) => onApplyCoupon(code)} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CartPage() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, itemCount, appliedCoupons, applyCoupon, removeCoupon, removeFreeItemsForShop, addItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [couponCodes, setCouponCodes] = useState<Record<string, string>>({});
  const [couponLoading, setCouponLoading] = useState<Record<string, boolean>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [shopDataMap, setShopDataMap] = useState<Record<string, any>>({});
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState(user?.address || "");
  const [userGPS, setUserGPS] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserGPS({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.log("GPS denied:", err.message)
      );
    }
  }, []);

  const uniqueShopIds = Array.from(new Set(items.map(i => i.shop_id)));
  const cartCoupons = appliedCoupons || {};

  const handleApplyCoupon = async (shopId: string, codeOverride?: string) => {
    const code = codeOverride || couponCodes[shopId];
    if (!code) return;
    setCouponLoading(prev => ({ ...prev, [shopId]: true }));
    try {
      const existing = cartCoupons[shopId] || [];
      if (existing.length >= 1) {
        toast({ title: "Only 1 coupon allowed per store", variant: "destructive" }); return;
      }
      const result = await apiRequest("POST", "/api/coupons/validate", { code, shopId });
      
      const hasFreeItems = (result.items_to_add || []).some((i: any) => i.isFreeItem);
      if (hasFreeItems) {
        removeFreeItemsForShop(shopId);
      }
      if (result.items_to_add && result.items_to_add.length > 0) {
        addItems(result.items_to_add.map((item: any) => ({
          id: item.id, name: item.name, price: item.price,
          shop_id: item.shop_id, shopName: item.shopName, 
          isFreeItem: item.isFreeItem ?? false,
          isComboItem: item.isComboItem ?? false,
          originalPrice: item.originalPrice
        })));
      }
      applyCoupon(shopId, result);
      setCouponCodes(prev => ({ ...prev, [shopId]: "" }));
      toast({ title: "Coupon applied successfully!" });
    } catch (err: any) {
      toast({ title: err.message || "Invalid coupon code", variant: "destructive" });
    } finally {
      setCouponLoading(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const handleRemoveCoupon = (shopId: string, code: string) => {
    const shopCoupons = cartCoupons[shopId] || [];
    const coupon = shopCoupons.find(c => c.code === code);
    if (coupon?.items_to_add?.length) {
      coupon.items_to_add.forEach((i: any) => removeItem(i.id));
    }
    removeCoupon(shopId, code);
  };

  const getShopSubtotal = (sid: string) => items.filter(i => i.shop_id === sid).reduce((s, i) => s + i.price * i.quantity, 0);

  const getShopDiscount = (sid: string) => {
    const sItems = items.filter(i => i.shop_id === sid);
    const sCoupons = cartCoupons[sid] || [];
    let d = 0;
    const sSubtotal = sItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    for (const c of sCoupons) {
      if (c.type === "percentage") d += Math.round(sSubtotal * parseFloat(c.value) / 100);
      else if (c.type === "flat") d += Math.min(parseFloat(c.value), sSubtotal);
      else if (c.type === "min_order") {
        const minAmt = (c as any).min_order_amount || 0;
        if (sSubtotal >= parseFloat(minAmt)) {
          if (c.category_offer_subtype === "flat") d += Math.min(parseFloat(c.value), sSubtotal);
          else d += Math.round(sSubtotal * parseFloat(c.value) / 100);
        }
      } else if (c.type === "free_item" || c.type === "bogo") {
        const freeItems = (c as any).items_to_add || [];
        d += freeItems.reduce((s: number, i: any) => s + (parseFloat(i.originalPrice || i.price || "0") * (i.quantity || 1)), 0);
      } else if (c.type === "combo") {
        const comboPrice = parseFloat(c.value);
        d += Math.max(0, sSubtotal - comboPrice);
      }
    }
    return d;
  };

  const totalSubtotal = uniqueShopIds.reduce((s, sid) => s + getShopSubtotal(sid), 0);
  const totalDiscount = uniqueShopIds.reduce((s, sid) => s + getShopDiscount(sid), 0);
  const afterDiscount = Math.max(0, totalSubtotal - totalDiscount);
  const serviceFee = Math.round(afterDiscount * 0.02);
  
  const totalDeliveryFee = uniqueShopIds.reduce((s, sid) => {
    const sData = shopDataMap[sid];
    return s + (sData?.delivery_fee_enabled ? parseFloat(sData.delivery_fee_amount || "0") : 0);
  }, 0);

  const grandTotal = afterDiscount + serviceFee + totalDeliveryFee;

  const handleCheckout = () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (!address) { setShowAddressModal(true); return; }
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setOrderSuccess("order-" + Math.random().toString(36).substr(2, 9));
    }, 1500);
  };

  const getShopDistance = (sid: string) => {
    const s = shopDataMap[sid];
    if (!userGPS || !s?.latitude || !s?.longitude) return null;
    return haversineKm(userGPS.lat, userGPS.lon, parseFloat(s.latitude), parseFloat(s.longitude));
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Order Placed!</h1>
        <p className="text-muted-foreground mb-8">Your order {orderSuccess} has been sent to the shops.</p>
        <Button onClick={() => navigate("/")} className="rounded-2xl px-8 font-bold bg-violet-600 hover:bg-violet-700">Back to Shopping</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8 text-center max-w-xs">Looks like you haven't added anything yet. Browse local shops and claim great offers!</p>
          <Button onClick={() => navigate("/")} className="rounded-2xl px-8 font-bold bg-violet-600 hover:bg-violet-700">Browse Shops</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <Navbar />
      <div className="max-w-md mx-auto p-4 flex flex-col gap-6 pt-20">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Your Cart</h1>
          <Badge variant="secondary" className="rounded-lg font-bold">{itemCount} Items</Badge>
        </div>

        {uniqueShopIds.map(shopId => {
          const shopItems = items.filter(i => i.shop_id === shopId);
          return (
            <ShopSection
              key={shopId}
              shopId={shopId}
              shopItems={shopItems}
              coupons={cartCoupons[shopId] || []}
              couponCode={couponCodes[shopId] || ""}
              couponLoading={!!couponLoading[shopId]}
              userGPS={userGPS}
              onCouponCodeChange={(code) => setCouponCodes(prev => ({ ...prev, [shopId]: code }))}
              onApplyCoupon={(code) => handleApplyCoupon(shopId, code)}
              onRemoveCoupon={(code) => handleRemoveCoupon(shopId, code)}
              onRemoveItem={removeItem}
              onUpdateQty={updateQuantity}
              getShopDiscount={() => getShopDiscount(shopId)}
              onShopData={data => setShopDataMap(prev => ({ ...prev, [shopId]: data }))}
            />
          );
        })}

        {/* Totals Card */}
        <Card className="rounded-3xl border-0 shadow-lg overflow-hidden">
          <CardContent className="p-6 flex flex-col gap-4">
            <h3 className="font-black text-lg text-gray-900 dark:text-white">Order Summary</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">₹{totalSubtotal.toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium">Coupon Discount</span>
                  <span className="text-emerald-600 font-bold">- ₹{totalDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee (2%)</span>
                <span className="font-semibold">₹{serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-semibold">₹{totalDeliveryFee.toLocaleString()}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-900 dark:text-white">Grand Total</span>
                <span className="text-2xl font-black text-primary">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Card */}
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-gray-900 dark:text-white">Delivery Address</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddressModal(true)} className="text-primary font-bold">Change</Button>
            </div>
            {address ? (
              <p className="text-sm text-muted-foreground">{address}</p>
            ) : (
              <p className="text-sm text-red-500 font-medium italic">Please set a delivery address</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 z-50 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <Button 
            onClick={handleCheckout} 
            disabled={isCheckingOut || items.length === 0}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 flex items-center justify-between px-6"
            data-testid="button-checkout"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Final Total</span>
              <span className="text-xl font-black">₹{grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 font-black tracking-tight">
              {isCheckingOut ? "CHECKING OUT..." : "PLACE ORDER"}
              <Zap className="w-5 h-5 fill-white" />
            </div>
          </Button>
        </div>
      </div>

      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="rounded-3xl max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">Set Delivery Address</DialogTitle>
            <DialogDescription>Please provide your full delivery address for the shops.</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="address-input" className="font-bold text-xs uppercase tracking-wider opacity-70">Street, Area, Building</Label>
              <Input 
                id="address-input"
                placeholder="Enter your delivery address..." 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
            <Button onClick={() => setShowAddressModal(false)} className="w-full h-12 rounded-xl font-black bg-primary">SAVE ADDRESS</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
