import { useState, useEffect, useRef } from "react";
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
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, CheckCircle, ArrowLeft,
  Gift, Package, Sparkles, ChevronDown, Percent, Zap, AlertCircle, X, Phone, User, MessageCircle
} from "lucide-react";
import type { Coupon, Shop } from "@shared/schema";

type ShopCoupon = Coupon & { shop?: Shop };

function CouponBenefit({ coupon }: { coupon: ShopCoupon }) {
  if (coupon.type === "percentage") return <span className="text-emerald-600 dark:text-emerald-400 font-bold">{coupon.value}% off your order</span>;
  if (coupon.type === "flat") return <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{coupon.value} flat discount</span>;
  if (coupon.type === "free_item") {
    const qty = (coupon as any).free_item_qty || 1;
    const minAmt = (coupon as any).min_order_amount ? parseFloat((coupon as any).min_order_amount) : null;
    return (
      <span className="text-violet-600 dark:text-violet-400 font-bold">
        {qty > 1 ? `${qty}x free item` : "Free item"} added to cart{minAmt ? ` (min order ₹${minAmt.toFixed(0)})` : ""}
      </span>
    );
  }
  if (coupon.type === "flash") return <span className="text-orange-600 dark:text-orange-400 font-bold">Flash deal!</span>;
  return <span className="text-blue-600 dark:text-blue-400 font-bold">Special offer</span>;
}

const TYPE_COLORS: Record<string, { gradient: string; badge: string; icon: string }> = {
  percentage: { gradient: "from-blue-500 to-cyan-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "🏷️" },
  flat:       { gradient: "from-emerald-500 to-teal-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "💰" },
  free_item:  { gradient: "from-violet-500 to-purple-500", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "🎁" },
  flash:      { gradient: "from-orange-500 to-red-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: "⚡" },
};

interface AvailableCouponsPanelProps {
  shopId: string;
  cartTotal: number;
  appliedCode?: string;
  onApply: (code: string) => void;
}

function AvailableCouponsPanel({ shopId, cartTotal, appliedCode, onApply }: AvailableCouponsPanelProps) {
  const [open, setOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: allCoupons = [], isLoading } = useQuery<ShopCoupon[]>({
    queryKey: ["/api/coupons", shopId],
    queryFn: async () => {
      const res = await fetch(`/api/coupons?shopId=${shopId}`);
      return res.json();
    },
    enabled: !!shopId,
  });

  const coupons = allCoupons.filter(c => c.is_active && c.id !== appliedCode);

  if (coupons.length === 0 && !isLoading) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-300 ${
          open
            ? "bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-300 dark:border-blue-700"
            : "bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border-blue-100 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800"
        }`}
        data-testid="button-show-available-coupons"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500 sparkle-icon" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white">
            Show available coupons
          </span>
          {!isLoading && coupons.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white text-[10px] font-bold shadow-sm">
              {coupons.length}
            </span>
          )}
          {isLoading && <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div ref={panelRef} className="mt-2 flex flex-col gap-2.5 coupon-slide-in" style={{ perspective: "800px" }}>
          {coupons.map((coupon, idx) => {
            const colors = TYPE_COLORS[coupon.type] || TYPE_COLORS.percentage;
            const isAlreadyApplied = appliedCode === coupon.code;
            const expiringSoon = coupon.expiry_date && new Date(coupon.expiry_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const expired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();

            return (
              <div
                key={coupon.id}
                className="relative rounded-2xl overflow-hidden coupon-glow transition-all duration-200 hover:scale-[1.015] hover:-translate-y-0.5"
                style={{
                  animationDelay: `${idx * 60}ms`,
                  transform: "perspective(600px) rotateX(0deg)",
                }}
                data-testid={`available-coupon-${coupon.id}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${colors.gradient}`} />

                <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border border-white/30 dark:border-gray-700/40 rounded-2xl px-4 py-3.5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-md shrink-0`}>
                      <span className="text-lg leading-none">{colors.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="coupon-shimmer-text font-black text-base tracking-wide">{coupon.code}</span>
                        {expiringSoon && !expired && (
                          <Badge className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[9px] px-1.5 py-0">Expiring soon</Badge>
                        )}
                        {expired && (
                          <Badge className="bg-red-100 text-red-600 border-0 text-[9px] px-1.5 py-0">Expired</Badge>
                        )}
                      </div>
                      <div className="text-xs">
                        <CouponBenefit coupon={coupon} />
                      </div>
                      {coupon.expiry_date && !expired && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Expires {new Date(coupon.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {!expired && !isAlreadyApplied && (
                        <button
                          onClick={() => onApply(coupon.code)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${colors.gradient} shadow-md active:scale-95 transition-transform`}
                          data-testid={`button-apply-available-coupon-${coupon.id}`}
                        >
                          Apply
                        </button>
                      )}
                      {isAlreadyApplied && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-1"><CheckCircle className="w-2.5 h-2.5" /> Applied</Badge>
                      )}
                      {expired && (
                        <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">Expired</Badge>
                      )}
                    </div>
                  </div>

                  {(coupon.type === "percentage" || coupon.type === "flat") && !expired && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <AlertCircle className="w-3 h-3" />
                          <span>Cart total: ₹{cartTotal.toLocaleString()}</span>
                        </div>
                        <div className={`text-[11px] font-semibold ${cartTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500"}`}>
                          {cartTotal > 0 ? (
                            <>
                              Saves ₹{coupon.type === "percentage"
                                ? Math.floor(cartTotal * parseFloat(coupon.value as string) / 100).toLocaleString()
                                : Math.min(parseFloat(coupon.value as string), cartTotal).toLocaleString()
                              }
                            </>
                          ) : "Add items to apply"}
                        </div>
                      </div>
                    </div>
                  )}

                  {coupon.type === "free_item" && !expired && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-violet-600 dark:text-violet-400">
                        <Gift className="w-3 h-3 shrink-0" />
                        <span>
                          {((coupon as any).free_item_qty || 1) > 1
                            ? `${(coupon as any).free_item_qty} free items added to cart when applied`
                            : "A free product will be added to your cart when applied"}
                        </span>
                      </div>
                      {(coupon as any).min_order_amount && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Min order ₹{parseFloat((coupon as any).min_order_amount).toFixed(0)} required</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, clearCart, total, shopId, addItems } = useCart();
  const { isAuthenticated, user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: string;
    items_to_add?: any[];
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);

  const discount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? total * parseFloat(appliedCoupon.value) / 100
      : appliedCoupon.type === "flat"
        ? Math.min(parseFloat(appliedCoupon.value), total)
        : 0
    : 0;

  const finalAmount = Math.max(0, total - discount);
  const shopName = items.length > 0 ? items[0].shopName : "";

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/orders", {
        items: items.map(i => ({
          product_id: i.id,
          product_name: i.name,
          quantity: i.quantity,
          price: i.price.toString(),
          is_free_item: i.isFreeItem || false,
          order_id: "",
        })),
        total_amount: total.toString(),
        discount_amount: discount.toString(),
        final_amount: finalAmount.toString(),
        shop_id: shopId || null,
        shop_name: shopName || null,
        coupon_code: appliedCoupon?.code || null,
      });
    },
    onSuccess: async (order: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      const shopData = await (async () => {
        try { const s = await fetch(`/api/shops/${shopId}`); return await s.json(); } catch { return {}; }
      })();
      const pendingOrder = {
        orderId: order?.id,
        shopName,
        shopWhatsapp: shopData?.whatsapp_number,
        shopPaymentId: shopData?.payment_id,
        shopPaymentQr: shopData?.payment_qr,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, isFreeItem: i.isFreeItem })),
        subtotal: total,
        discount,
        finalAmount,
        couponCode: appliedCoupon?.code,
        customerName: user?.name,
        customerPhone: user?.phone,
        customerAddress: user?.address,
      };
      sessionStorage.setItem("pendingOrder", JSON.stringify(pendingOrder));
      clearCart();
      navigate("/order-confirm");
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const validateCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponCode).trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const result = await apiRequest("POST", "/api/coupons/validate", {
        code,
        shopId,
        cartTotal: total.toString(),
      });
      setAppliedCoupon({ code: result.code, type: result.type, value: result.value, items_to_add: result.items_to_add });
      setCouponCode(result.code);

      const hasItems = result.items_to_add && result.items_to_add.length > 0;
      const hasFreeItem = hasItems && result.items_to_add.some((i: any) => i.isFreeItem);
      const hasAttached = hasItems && result.items_to_add.some((i: any) => !i.isFreeItem);

      if (hasItems) {
        addItems(result.items_to_add.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          shop_id: item.shop_id,
          shopName: item.shopName,
          isFreeItem: item.isFreeItem ?? false,
        })));
      }

      const parts: string[] = [];
      if (result.type === "percentage" && parseFloat(result.value) > 0) parts.push(`${result.value}% off applied`);
      if (result.type === "flat" && parseFloat(result.value) > 0) parts.push(`₹${result.value} off applied`);
      if (hasFreeItem) parts.push("free item added to cart");
      if (hasAttached) {
        const n = result.items_to_add.filter((i: any) => !i.isFreeItem).length;
        parts.push(`${n} product${n > 1 ? "s" : ""} added to cart`);
      }
      if (parts.length === 0) parts.push("coupon applied");

      toast({ title: `🎉 Coupon applied!`, description: parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" • ") });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    if (appliedCoupon?.items_to_add && appliedCoupon.items_to_add.length > 0) {
      const idsToRemove = appliedCoupon.items_to_add.map((i: any) => i.id);
      idsToRemove.forEach((id: string) => removeItem(id));
    }
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handlePlaceOrder = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!user?.phone) {
      setPhoneInput("");
      setPhoneDialogOpen(true);
      return;
    }
    placeOrder();
  };

  const handleSavePhone = async () => {
    const cleaned = phoneInput.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      toast({ title: "Please enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setPhoneSaving(true);
    try {
      await updateProfile({ phone: cleaned });
      setPhoneDialogOpen(false);
      toast({ title: "Mobile number saved!" });
      placeOrder();
    } catch {
      toast({ title: "Failed to save number. Try again.", variant: "destructive" });
    } finally {
      setPhoneSaving(false);
    }
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingCoupon");
    if (!raw || appliedCoupon) return;
    try {
      const coupon = JSON.parse(raw);
      sessionStorage.removeItem("pendingCoupon");
      setAppliedCoupon({ code: coupon.code, type: coupon.type, value: coupon.value, items_to_add: coupon.items_to_add });
      setCouponCode(coupon.code);
    } catch {}
  }, []);

  const couponTypeLabel = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? `${appliedCoupon.value}% off`
      : appliedCoupon.type === "flat"
        ? `₹${appliedCoupon.value} off`
        : appliedCoupon.type === "bundle"
          ? `${appliedCoupon.items_to_add?.length || 0} items added`
          : appliedCoupon.type === "free_item"
            ? "Free item added"
            : "Applied"
    : "";

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
          <Button onClick={() => navigate("/home")} className="rounded-xl h-12 px-8" data-testid="button-browse-shops">
            Browse Shops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => shopId ? navigate(`/shop/${shopId}`) : navigate("/home")} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Continue Shopping
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Shopping Cart <span className="text-muted-foreground text-lg font-normal">({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
          </h1>
          {shopName && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <span className="text-sm text-muted-foreground">From <span className="font-semibold text-gray-700 dark:text-gray-300">{shopName}</span></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-3">
            {items.map(item => (
              <Card key={item.id} className={`rounded-2xl border-0 shadow-md ${item.isFreeItem ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`} data-testid={`card-cart-item-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${item.isFreeItem ? "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40" : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"}`}>
                      {item.isFreeItem ? <Gift className="w-7 h-7 text-emerald-600" /> : <span className="text-2xl">{item.name[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                        {item.isFreeItem && <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-1.5 py-0">FREE</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.shopName}</p>
                      {item.isFreeItem
                        ? <p className="font-bold text-emerald-600 mt-1">₹0 <span className="text-xs font-normal text-muted-foreground line-through">(coupon applied)</span></p>
                        : <p className="font-bold text-primary mt-1">₹{item.price.toLocaleString()}</p>
                      }
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!item.isFreeItem && (
                        <>
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center" data-testid={`button-decrease-${item.id}`}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-medium text-sm" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center" data-testid={`button-increase-${item.id}`}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {item.isFreeItem && (
                        <span className="w-6 text-center font-medium text-sm text-muted-foreground" data-testid={`text-quantity-${item.id}`}>×{item.quantity}</span>
                      )}
                      <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full text-destructive flex items-center justify-center ml-2" data-testid={`button-remove-${item.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {item.isFreeItem ? <span className="text-emerald-600">Free</span> : `₹${(item.price * item.quantity).toLocaleString()}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {/* ── Apply Coupon Card ── */}
            <div className="relative rounded-2xl overflow-hidden shadow-md">
              {/* 3D depth: gradient top bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 z-10" />
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/30 dark:border-gray-700/40 rounded-2xl px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md">
                    <Tag className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Apply Coupon</h3>
                </div>

                {appliedCoupon ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 tracking-wide">{appliedCoupon.code}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">{couponTypeLabel}</p>
                        </div>
                      </div>
                      <button onClick={handleRemoveCoupon} className="w-6 h-6 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-muted-foreground hover:text-destructive transition-colors" data-testid="button-remove-coupon">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          className="pl-8 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-mono uppercase tracking-wider"
                          onKeyDown={e => e.key === "Enter" && validateCoupon()}
                          data-testid="input-coupon-code"
                        />
                      </div>
                      <Button
                        onClick={() => validateCoupon()}
                        disabled={couponLoading || !couponCode}
                        className="rounded-xl shrink-0 bg-gradient-to-r from-blue-500 to-violet-600 border-0 shadow-md shadow-blue-500/20"
                        data-testid="button-apply-coupon"
                      >
                        {couponLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 mr-1" /> Apply
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Available coupons panel */}
                    {shopId && (
                      <AvailableCouponsPanel
                        shopId={shopId}
                        cartTotal={total}
                        appliedCode={appliedCoupon?.code}
                        onApply={(code) => {
                          setCouponCode(code);
                          validateCoupon(code);
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Contact Info ── */}
            {user && (
              <Card className="rounded-2xl border-0 shadow-md" data-testid="card-contact-info">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Order For</h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200" data-testid="text-order-name">{user.name}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300" data-testid="text-order-phone">+91 {user.phone}</span>
                      </div>
                    )}
                    {user.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground ml-0.5">✉</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate" data-testid="text-order-email">{user.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Order Summary ── */}
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{total.toLocaleString()}</span>
                  </div>
                  {appliedCoupon && discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Discount ({appliedCoupon.code})</span>
                      <span className="font-medium text-emerald-600">-₹{discount.toFixed(0)}</span>
                    </div>
                  )}
                  {appliedCoupon && (appliedCoupon.type === "bundle" || appliedCoupon.type === "free_item") && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 flex items-center gap-1">
                        {appliedCoupon.type === "free_item" ? <Gift className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {appliedCoupon.code}
                      </span>
                      <span className="text-emerald-600 font-medium text-xs">{couponTypeLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-emerald-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <div className="text-right">
                      {discount > 0 && (
                        <div className="text-xs text-muted-foreground line-through">₹{total.toLocaleString()}</div>
                      )}
                      <span className="font-black text-xl text-gray-900 dark:text-white">₹{finalAmount.toLocaleString()}</span>
                      {discount > 0 && (
                        <div className="text-xs text-emerald-600 font-semibold">You save ₹{discount.toFixed(0)}!</div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPending}
                  className="w-full mt-5 h-12 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-violet-600 border-0 shadow-lg shadow-blue-500/25 text-base"
                  data-testid="button-place-order"
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order...
                    </div>
                  ) : "Place Order →"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">🔒 Secure checkout • Free returns</p>
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
              <Input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={e => e.key === "Enter" && handleSavePhone()}
                className="h-12 rounded-xl pl-12 text-base"
                autoFocus
                data-testid="input-phone-dialog"
              />
            </div>
            <p className="text-xs text-muted-foreground">This number will be saved to your profile and used for order confirmations.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setPhoneDialogOpen(false)}
              data-testid="button-phone-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 border-0 font-semibold"
              onClick={handleSavePhone}
              disabled={phoneSaving || phoneInput.replace(/\D/g, "").length !== 10}
              data-testid="button-phone-save"
            >
              {phoneSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <><Phone className="w-4 h-4 mr-1" /> Save & Place Order</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
