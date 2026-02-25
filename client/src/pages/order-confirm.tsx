import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageCircle, CreditCard, Home, Phone } from "lucide-react";

interface OrderData {
  shopName: string;
  shopWhatsapp?: string;
  items: Array<{ name: string; quantity: number; price: number; isFreeItem?: boolean }>;
  subtotal: number;
  discount: number;
  finalAmount: number;
  couponCode?: string;
}

export default function OrderConfirmPage() {
  const [, navigate] = useLocation();

  const raw = sessionStorage.getItem("pendingOrder");
  const order: OrderData | null = raw ? JSON.parse(raw) : null;

  useEffect(() => {
    if (!order) navigate("/cart");
  }, []);

  if (!order) return null;

  const buildWhatsAppMessage = () => {
    const lines: string[] = [
      `🛍️ *New Order from CouponsHub X*`,
      ``,
      `*Shop:* ${order.shopName}`,
      ``,
      `*Items:*`,
      ...order.items.map(i => i.isFreeItem
        ? `• ${i.name} ×${i.quantity} — FREE 🎁`
        : `• ${i.name} ×${i.quantity} — ₹${(i.price * i.quantity).toLocaleString()}`
      ),
      ``,
      `*Subtotal:* ₹${order.subtotal.toLocaleString()}`,
      order.discount > 0 ? `*Discount (${order.couponCode || "coupon"}):* -₹${order.discount.toFixed(0)}` : "",
      `*Total:* ₹${order.finalAmount.toLocaleString()}`,
      ``,
      `Please confirm my order. Thank you! 🙏`,
    ].filter(l => l !== undefined);
    return encodeURIComponent(lines.join("\n"));
  };

  const handleWhatsApp = () => {
    const phone = (order.shopWhatsapp || "").replace(/\D/g, "");
    const msg = buildWhatsAppMessage();
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    sessionStorage.removeItem("pendingOrder");
    navigate("/profile");
  };

  const handleOnlinePayment = () => {
    alert("Online payment integration coming soon! Your order has been saved.");
    sessionStorage.removeItem("pendingOrder");
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-400/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Ready!</h1>
          <p className="text-muted-foreground mt-1">Choose how you'd like to place your order</p>
        </div>

        {/* Order Summary */}
        <Card className="rounded-2xl border-0 shadow-md mb-6">
          <CardContent className="p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{order.shopName}</h2>
            <div className="flex flex-col gap-2 mb-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name} ×{item.quantity}{item.isFreeItem ? " 🎁" : ""}</span>
                  <span className="font-medium">{item.isFreeItem ? "Free" : `₹${(item.price * item.quantity).toLocaleString()}`}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1">
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-₹{order.discount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Total</span>
                <span className="text-lg">₹{order.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Options */}
        <div className="flex flex-col gap-3">
          {order.shopWhatsapp && (
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-4 bg-[#25D366] hover:bg-[#20b958] text-white rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
              data-testid="button-order-whatsapp"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-base">Order via WhatsApp</p>
                <p className="text-sm text-white/80">Send your order directly to the shop</p>
              </div>
              <Phone className="w-5 h-5 text-white/60" />
            </button>
          )}

          <button
            onClick={handleOnlinePayment}
            className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
            data-testid="button-order-online"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-base">Pay Online</p>
              <p className="text-sm text-white/80">UPI, Cards, Net Banking & more</p>
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Coming Soon</span>
          </button>

          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="w-full rounded-2xl mt-1 text-muted-foreground"
            data-testid="button-back-home"
          >
            <Home className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
