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
  const manualItems = shopItems.filter(i => !i.couponCode);
  const manualSubtotal = manualItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shopDiscount = getShopDiscount();
  const couponAlreadyApplied = coupons.length > 0;

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

      {/* ── Section 1: Your Items (manually added, no coupon) ── */}
      {manualItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Your Items</p>
          {manualItems.map(item => (
            <Card key={item.id} className="rounded-2xl border-0 shadow-md" data-testid={`card-cart-item-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                    <span className="text-xl">{item.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>
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
          {/* Manual items subtotal row */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-muted-foreground">Items subtotal</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">₹{manualSubtotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* ── Section 2: Coupon Offer Items (grouped per coupon) ── */}
      {coupons.map(c => {
        const offerItems = shopItems.filter(i => i.couponCode === c.code);
        const comboItems = offerItems.filter(i => i.isComboItem);
        const freeItems = offerItems.filter(i => i.isFreeItem);
        const comboMRP = comboItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const comboPrice = c.type === "combo" ? parseFloat(c.value) : 0;
        const comboSaved = Math.max(0, comboMRP - comboPrice);

        // discount text for non-item coupons
        const discountLabel = (() => {
          if (c.type === "percentage") return `${c.value}% off on your items`;
          if (c.type === "flat") return `₹${c.value} flat off on your items`;
          if (c.type === "min_order") return c.category_offer_subtype === "flat"
            ? `Spend & Save — ₹${c.value} off` : `Spend & Save — ${c.value}% off`;
          if (c.type === "category_offer") {
            const cats = c.restrict_sub_category?.join(", ") || "selected categories";
            return c.category_offer_subtype === "percentage"
              ? `${c.value}% off on ${cats}` : `₹${c.value} off on ${cats}`;
          }
          return null;
        })();

        return (
          <div key={c.code} className="rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/10 overflow-hidden">
            {/* Coupon header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-violet-100/60 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800/40">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-black text-violet-700 dark:text-violet-300 tracking-wider">{c.code}</span>
                <Badge className="bg-violet-500 text-white border-0 text-[10px] px-1.5">
                  {c.type === "combo" ? "COMBO OFFER" : c.type === "free_item" ? "FREE ITEM" : c.type === "bogo" ? "BOGO" : "OFFER"}
                </Badge>
              </div>
              <button onClick={() => onRemoveCoupon(c.code)}
                className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                data-testid={`button-remove-coupon-${c.code}`}>
                <X className="w-3 h-3" /> Remove
              </button>
            </div>

            {/* Combo items */}
            {comboItems.length > 0 && (
              <div className="flex flex-col gap-2 p-3">
                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Combo Items (MRP ₹{comboMRP.toLocaleString()} → ₹{comboPrice.toLocaleString()})
                </p>
                {comboItems.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-center gap-3 px-1" data-testid={`card-combo-item-${item.id}`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-orange-100 dark:bg-orange-900/30">
                      <span className="text-sm">{item.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{item.name}</p>
                      {item.sub_category && <p className="text-[10px] text-muted-foreground">{item.sub_category}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] line-through text-muted-foreground">₹{item.price.toLocaleString()}</p>
                      <p className="text-xs font-bold text-orange-600">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t border-orange-200 dark:border-orange-800/30 mt-1">
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Combo Price</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-orange-600">₹{comboPrice.toLocaleString()}</span>
                    {comboSaved > 0 && <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">You save ₹{comboSaved.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Free items */}
            {freeItems.length > 0 && (
              <div className="flex flex-col gap-2 p-3">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Gift className="w-3 h-3" /> Free Items with Offer
                </p>
                {freeItems.map((item, idx) => (
                  <div key={`${item.id}-free-${idx}`} className="flex items-center gap-3 px-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                      <Gift className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{item.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.originalPrice ? <p className="text-[10px] line-through text-muted-foreground">₹{item.originalPrice.toLocaleString()}</p> : null}
                      <Badge className="bg-emerald-500 text-white border-0 text-[10px]">FREE</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discount-only coupon (no items added) */}
            {offerItems.length === 0 && discountLabel && (
              <div className="flex items-center gap-2 px-4 py-3">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{discountLabel}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Coupon input card ── */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              {couponAlreadyApplied ? "Applied Coupon" : `${shopName} Coupons`}
            </span>
            {couponAlreadyApplied && <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">✓</span>}
          </div>

          {couponAlreadyApplied ? (
            <p className="text-[11px] text-muted-foreground">
              To apply a different coupon, remove the current one first.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={e => onCouponCodeChange(e.target.value.toUpperCase())}
                    className="pl-8 rounded-xl h-9 text-xs font-mono"
                    data-testid={`input-coupon-${shopId}`}
                    disabled={couponLoading} />
                </div>
                <Button onClick={() => onApplyCoupon()} size="sm" disabled={couponLoading || !couponCode}
                  className="rounded-xl h-9 px-4 text-xs font-bold bg-violet-600 hover:bg-violet-700 shadow-sm"
                  data-testid={`button-apply-coupon-${shopId}`}>
                  {couponLoading ? <Zap className="w-3 h-3 animate-pulse" /> : "Apply"}
                </Button>
              </div>
              <AvailableShopCoupons shopId={shopId} shopTotal={manualSubtotal}
                appliedCodes={coupons.map(c => c.code)}
                onApply={onApplyCoupon} />
            </>
          )}

          {shopDiscount > 0 && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Total Savings</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">- ₹{shopDiscount.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Store total row: all items at MRP minus total discount */}
      {(() => {
        const allMRP = shopItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const storeTotal = allMRP - shopDiscount;
        return (
          <div className="px-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Store Total</span>
            <span className="font-bold text-gray-900 dark:text-white">₹{storeTotal.toLocaleString()}</span>
          </div>
        );
      })()}
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

  // Manual items = items user added themselves (no couponCode)
  const getManualItems = (sid: string) => items.filter(i => i.shop_id === sid && !i.couponCode);
  // Offer items = items added by a coupon
  const getOfferItems = (sid: string, code: string) => items.filter(i => i.shop_id === sid && i.couponCode === code);

  const getShopDiscount = (sid: string): number => {
    const coupons = cartCoupons[sid] || [];
    if (coupons.length === 0) return 0;
    let totalDisc = 0;

    for (const coupon of coupons) {
      const offerItems = getOfferItems(sid, coupon.code);

      if (coupon.type === "combo") {
        // Discount = (sum of combo items at MRP) - comboPrice
        const comboMRP = offerItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const comboPrice = parseFloat(coupon.value);
        totalDisc += Math.max(0, comboMRP - comboPrice);

      } else if (coupon.type === "free_item" || coupon.type === "bogo") {
        // Discount = original price of free items (price is stored as 0, originalPrice is MRP)
        const freeItems = offerItems.filter(i => i.isFreeItem);
        totalDisc += freeItems.reduce((s, i) => s + (i.originalPrice || 0) * i.quantity, 0);

      } else {
        // percentage, flat, min_order, category_offer — apply to manual items only
        const restrictCats = coupon.restrict_sub_category?.length ? coupon.restrict_sub_category : null;
        const manualItems = getManualItems(sid);
        const base = restrictCats
          ? manualItems.filter(i => i.sub_category && restrictCats.includes(i.sub_category)).reduce((s, i) => s + i.price * i.quantity, 0)
          : manualItems.reduce((s, i) => s + i.price * i.quantity, 0);

        if (coupon.type === "percentage") totalDisc += base * parseFloat(coupon.value) / 100;
        else if (coupon.type === "flat") totalDisc += Math.min(parseFloat(coupon.value), base);
        else if (coupon.type === "min_order") {
          if (coupon.category_offer_subtype === "flat") totalDisc += Math.min(parseFloat(coupon.value), base);
          else totalDisc += base * parseFloat(coupon.value) / 100;
        } else if (coupon.type === "category_offer") {
          if (coupon.category_offer_subtype === "percentage") totalDisc += base * parseFloat(coupon.value) / 100;
          else if (coupon.category_offer_subtype === "flat") totalDisc += Math.min(parseFloat(coupon.value), base);
        }
      }
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
    
    // Auto-remove existing coupon if any
    const existing = cartCoupons[shopId] || [];
    if (existing.length > 0) {
      handleRemoveCoupon(shopId, existing[0].code);
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
        const itemsWithCode = result.items_to_add.map((item: any) => ({
          ...item,
          couponCode: result.code
        }));
        addItems(itemsWithCode, true);
      } else if (result.type === "bogo") {
        const bogoItem = {
          id: result.free_item_product_id!,
          name: result.free_item_product_name || "Free Item",
          price: 0,
          originalPrice: result.free_item_product_price ? parseFloat(result.free_item_product_price) : 0,
          shop_id: shopId,
          shopName: items.find(i => i.shop_id === shopId)?.shopName || "shop",
          isFreeItem: true,
          couponCode: result.code
        };
        addItems([bogoItem], true);
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
    const freeCartItem = { 
      id: chosenItem.id, 
      name: chosenItem.name, 
      price: 0, 
      originalPrice: chosenItem.price, 
      shop_id: chosenItem.shop_id, 
      shopName: couponData.shopName || items.find(i => i.shop_id === shopId)?.shopName || "", 
      isFreeItem: true,
      couponCode: couponData.code
    };
    applyCoupon(shopId, {
      code: couponData.code, type: couponData.type, value: couponData.value, 
      items_to_add: [freeCartItem], 
      restrict_sub_category: couponData.restrict_sub_category ?? null, 
      bogo_buy_product_name: null, bogo_get_product_name: null, 
      category_offer_subtype: couponData.category_offer_subtype ?? null 
    });
    addItems([freeCartItem], true);
    setPickOneDialog(null);
    const shopName = items.find(i => i.shop_id === shopId)?.shopName || "shop";
    toast({ title: "🎉 Free item added!", description: `${chosenItem.name} added free to your cart!` });
  };

  const handleRemoveCoupon = (shopId: string, code: string) => {
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
              {shopGroups.map(({ shopId, items: shopItems }) => (
                <ShopSection key={shopId} shopId={shopId} shopItems={shopItems}
                  coupons={cartCoupons[shopId] || []}
                  couponCode={couponCodes[shopId] || ""}
                  couponLoading={couponLoadingMap[shopId] || false}
                  userGPS={userGPS}
                  onCouponCodeChange={(code) => setCouponCodes(prev => ({ ...prev, [shopId]: code }))}
                  onApplyCoupon={(codeOverride) => validateCoupon(shopId, codeOverride)}
                  onRemoveCoupon={(code) => handleRemoveCoupon(shopId, code)}
                  onRemoveItem={removeItem}
                  onUpdateQty={updateQuantity}
                  getShopDiscount={() => getShopDiscount(shopId)}
                  onShopData={(data) => setShopDataMap(prev => ({ ...prev, [shopId]: data }))} />
              ))}
            </div>

            {/* Right — Order Summary */}
            <div className="flex flex-col gap-4">
              <Card className="rounded-3xl border-0 shadow-lg sticky top-20 overflow-hidden bg-white dark:bg-gray-900">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-white font-bold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Order Summary
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Cart Subtotal</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{totalSubtotal.toLocaleString()}</span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Total Savings</span>
                        <span>- ₹{totalDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">Service Fee <Badge variant="outline" className="text-[9px] h-4">2%</Badge></span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{serviceFee.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">Delivery Fee {deliveryFee === 0 && <Badge className="bg-emerald-500 text-white text-[9px] h-4">FREE</Badge>}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{userGPS ? `₹${deliveryFee.toLocaleString()}` : "Enable GPS"}</span>
                    </div>

                    {!userGPS && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-2xl flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Enable location for accurate delivery fee</p>
                      </div>
                    )}

                    <Separator className="bg-gray-100 dark:bg-gray-800" />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Grand Total</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-primary">₹{grandTotal.toLocaleString()}</span>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Inclusive of taxes</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <Checkbox id="location" checked={shareLocation} onCheckedChange={(v) => setShareLocation(!!v)} className="rounded-lg h-5 w-5 border-2 border-gray-300 dark:border-gray-600" />
                        <label htmlFor="location" className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight cursor-pointer">
                          Share my GPS location with vendor for faster delivery
                        </label>
                      </div>

                      <Button onClick={handlePlaceOrder} disabled={placingOrder} size="lg" className="w-full rounded-2xl h-14 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/20 text-base font-bold gap-2">
                        {placingOrder ? <Zap className="w-5 h-5 animate-pulse" /> : <MessageCircle className="w-5 h-5" />}
                        {placingOrder ? "Placing Order..." : "Place Order via WhatsApp"}
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground px-4">By placing order, you agree to our Terms and Conditions.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Pick One Free Item Dialog */}
      <Dialog open={!!pickOneDialog} onOpenChange={(v) => !v && setPickOneDialog(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" /> Pick Your Free Item
            </DialogTitle>
            <DialogDescription className="text-center text-xs">Choose one item to add free with your coupon</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {pickOneDialog?.items.map(item => (
              <button key={item.id} onClick={() => handlePickOneFreeItem(item)} className="group flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-all text-left">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40">
                  <Gift className="w-6 h-6 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground line-through">₹{item.price}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-violet-600" />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile/Phone Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">Add Mobile Number</DialogTitle>
            <DialogDescription className="text-center text-xs">Need for WhatsApp order placement</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold ml-1">WhatsApp Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Enter 10-digit number" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} className="pl-10 rounded-2xl h-12 text-sm" type="tel" maxLength={10} />
              </div>
            </div>
            <Button onClick={handleSavePhone} disabled={phoneSaving} className="rounded-2xl h-12 font-bold text-sm">
              {phoneSaving ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Checkbox({ id, checked, onCheckedChange, className }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void; className?: string }) {
  return (
    <input type="checkbox" id={id} checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} className={className} />
  );
}
