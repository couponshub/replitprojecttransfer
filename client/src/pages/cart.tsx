import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ShoppingCart, Trash2, Plus, Minus, Tag, CheckCircle, ArrowLeft, Gift, Package } from "lucide-react";

export default function CartPage() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, clearCart, total, shopId, addItems } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: string;
    items_to_add?: any[];
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const discount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? total * parseFloat(appliedCoupon.value) / 100
      : appliedCoupon.type === "flat"
        ? Math.min(parseFloat(appliedCoupon.value), total)
        : 0
    : 0;

  const finalAmount = Math.max(0, total - discount);

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/orders", {
        items: items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          price: i.price.toString(),
          order_id: "",
        })),
        total_amount: total.toString(),
        discount_amount: discount.toString(),
        final_amount: finalAmount.toString(),
      });
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "Order placed successfully!" });
      navigate("/profile");
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await apiRequest("POST", "/api/coupons/validate", {
        code: couponCode.trim().toUpperCase(),
        shopId,
      });
      setAppliedCoupon({ code: result.code, type: result.type, value: result.value, items_to_add: result.items_to_add });

      if (result.items_to_add && result.items_to_add.length > 0) {
        addItems(result.items_to_add.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          shop_id: item.shop_id,
          shopName: item.shopName,
          isFreeItem: item.isFreeItem ?? false,
        })));

        if (result.type === "free_item") {
          toast({ title: `🎁 Free item added!`, description: `${result.items_to_add[0]?.name} added to your cart for free.` });
        } else if (result.type === "bundle") {
          toast({ title: `📦 Bundle applied!`, description: `${result.items_to_add.length} item(s) added to your cart.` });
        }
      } else if (result.type === "percentage") {
        toast({ title: `Coupon applied! Saving ${result.value}% on your order.` });
      } else if (result.type === "flat") {
        toast({ title: `Coupon applied! Saving ₹${result.value} on your order.` });
      } else {
        toast({ title: "Coupon applied successfully!" });
      }
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
    placeOrder();
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Continue Shopping
        </Button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Shopping Cart <span className="text-muted-foreground text-lg font-normal">({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
        </h1>

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
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-medium text-sm" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {item.isFreeItem && (
                        <span className="w-6 text-center font-medium text-sm text-muted-foreground" data-testid={`text-quantity-${item.id}`}>×{item.quantity}</span>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-full text-destructive flex items-center justify-center ml-2"
                        data-testid={`button-remove-${item.id}`}
                      >
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
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Apply Coupon</h3>
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{appliedCoupon.code}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500">{couponTypeLabel}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      className="rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      onKeyDown={e => e.key === "Enter" && validateCoupon()}
                      data-testid="input-coupon-code"
                    />
                    <Button
                      onClick={validateCoupon}
                      disabled={couponLoading || !couponCode}
                      variant="outline"
                      className="rounded-xl shrink-0"
                      data-testid="button-apply-coupon"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

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
                    <span className="font-bold text-xl text-gray-900 dark:text-white">₹{finalAmount.toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPending}
                  className="w-full mt-4 h-12 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-violet-600 border-0"
                  data-testid="button-place-order"
                >
                  {isPending ? "Placing Order..." : "Place Order"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">Secure checkout • Free returns</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
