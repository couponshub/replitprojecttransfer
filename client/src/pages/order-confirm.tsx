import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageCircle, CreditCard, Home, Phone, Copy, Check, QrCode, X } from "lucide-react";

interface OrderData {
  shopName: string;
  shopWhatsapp?: string;
  shopPaymentId?: string;
  shopPaymentQr?: string;
  items: Array<{ name: string; quantity: number; price: number; isFreeItem?: boolean }>;
  subtotal: number;
  discount: number;
  finalAmount: number;
  couponCode?: string;
}

export default function OrderConfirmPage() {
  const [, navigate] = useLocation();
  const [showPayment, setShowPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  const raw = sessionStorage.getItem("pendingOrder");
  const order: OrderData | null = raw ? JSON.parse(raw) : null;

  useEffect(() => {
    if (!order) navigate("/cart");
  }, []);

  if (!order) return null;

  const hasPayment = !!(order.shopPaymentId || order.shopPaymentQr);

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

  const handleCopyUPI = () => {
    if (order.shopPaymentId) {
      navigator.clipboard.writeText(order.shopPaymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDonePayment = () => {
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

        {/* Payment Panel — shown inline when Pay Online is clicked */}
        {showPayment && hasPayment && (
          <Card className="rounded-2xl border-0 shadow-xl mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5" />
                <span className="font-bold">Pay ₹{order.finalAmount.toLocaleString()}</span>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-white/70 hover:text-white transition-colors" data-testid="button-close-payment">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-5 flex flex-col items-center gap-4">
              {order.shopPaymentQr && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Scan QR to Pay</p>
                  <div className="p-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white shadow-inner">
                    <img
                      src={order.shopPaymentQr}
                      alt="Payment QR"
                      className="w-52 h-52 object-contain"
                      data-testid="img-payment-qr"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                </div>
              )}
              {order.shopPaymentId && (
                <div className="w-full">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 text-center">UPI / Payment ID</p>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white flex-1 text-center tracking-wider" data-testid="text-payment-id">{order.shopPaymentId}</span>
                    <button onClick={handleCopyUPI} className="shrink-0 text-primary" data-testid="button-copy-upi">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center mt-2">Tap to copy & pay via any UPI app</p>
                </div>
              )}
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl px-4 py-2 text-center w-full">
                After payment, please share screenshot on WhatsApp for confirmation.
              </p>
              <Button onClick={handleDonePayment} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border-0 text-white" data-testid="button-done-payment">
                I've Paid — Done ✓
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
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
            onClick={() => hasPayment ? setShowPayment(p => !p) : undefined}
            className={`w-full flex items-center gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              hasPayment
                ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
            data-testid="button-order-online"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${hasPayment ? "bg-white/20" : "bg-gray-300 dark:bg-gray-700"}`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-base">Pay Online</p>
              <p className={`text-sm ${hasPayment ? "text-white/80" : "text-gray-400"}`}>
                {hasPayment ? "UPI / Scan QR to pay" : "Not set up by this shop yet"}
              </p>
            </div>
            {hasPayment
              ? <QrCode className="w-5 h-5 text-white/60" />
              : <span className="text-xs bg-gray-300 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-full">N/A</span>
            }
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
