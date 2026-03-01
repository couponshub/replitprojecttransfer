import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, MessageCircle, CreditCard, Home, Phone,
  Copy, Check, QrCode, X, Loader2, IndianRupee, ShieldCheck,
  Upload, ImageIcon, Send, MapPin, User, ArrowLeft
} from "lucide-react";

interface OrderData {
  orderId?: string;
  shopName: string;
  shopWhatsapp?: string;
  shopPaymentId?: string;
  shopPaymentQr?: string;
  items: Array<{ name: string; quantity: number; price: number; isFreeItem?: boolean }>;
  subtotal: number;
  discount: number;
  finalAmount: number;
  couponCode?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  lastShopId?: string;
  orders?: any[];
  totalDiscount?: number;
  serviceFee?: number;
  deliveryFee?: number;
  grandTotal?: number;
}

declare global { interface Window { Razorpay: any; } }

export default function OrderConfirmPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const screenshotRef = useRef<HTMLInputElement>(null);

  const raw = sessionStorage.getItem("pendingOrder");
  const order: OrderData | null = raw ? JSON.parse(raw) : null;

  useEffect(() => {
    if (!order) navigate("/cart");
  }, []);

  if (!order) return null;

  const hasQrPayment = !!(order.shopPaymentId || order.shopPaymentQr);

  const buildWhatsAppMessage = () => {
    const lines = [
      `🛍️ *New Order from CouponsHub X*`, ``,
      `*Shop:* ${order.shopName}`,
      order.orderId ? `*Order ID:* #${order.orderId.slice(0, 8).toUpperCase()}` : "",
      ``,
      `*Customer Details:*`,
      order.customerName ? `• Name: ${order.customerName}` : "",
      order.customerPhone ? `• Phone: +91${order.customerPhone}` : "",
      order.customerAddress ? `• Address: ${order.customerAddress}` : "",
      ``,
      `*Items:*`,
      ...order.items.map(i => i.isFreeItem
        ? `• ${i.name} ×${i.quantity} — FREE 🎁`
        : `• ${i.name} ×${i.quantity} — ₹${(i.price * i.quantity).toLocaleString()}`
      ), ``,
      order.discount > 0 ? `*Discount (${order.couponCode || "coupon"}):* -₹${order.discount.toFixed(0)}` : "",
      `*Total:* ₹${order.finalAmount.toLocaleString()}`, ``,
      `Please confirm my order. Thank you! 🙏`,
    ].filter(Boolean);
    return encodeURIComponent(lines.join("\n"));
  };

  const handleWhatsApp = () => {
    const phone = (order.shopWhatsapp || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${buildWhatsAppMessage()}`, "_blank");
    sessionStorage.removeItem("pendingOrder");
    navigate("/my-orders");
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSharePaymentWhatsApp = async () => {
    if (!order.shopWhatsapp) {
      toast({ title: "Shop WhatsApp number not available", description: "This shop has not set up a WhatsApp number.", variant: "destructive" });
      return;
    }
    setScreenshotUploading(true);
    // Open the window IMMEDIATELY (synchronous, tied to user tap) so mobile doesn't block it
    const phone = (order.shopWhatsapp || "").replace(/\D/g, "");
    const win = window.open("", "_blank");
    try {
      let screenshotUrl = "";
      if (screenshotFile) {
        const fd = new FormData();
        fd.append("file", screenshotFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          screenshotUrl = data.url || "";
        }
      }

      const paymentStatus = screenshotUrl
        ? `✅ Paid — Screenshot attached`
        : utrNumber.trim()
          ? `✅ Paid — UTR provided`
          : `⏳ Payment Pending`;

      const lines = [
        `💳 *Payment Confirmation — CouponsHub X*`, ``,
        `*Shop:* ${order.shopName}`,
        order.orderId ? `*Order ID:* #${order.orderId.slice(0, 8).toUpperCase()}` : "",
        ``,
        `*Customer:*`,
        order.customerName ? `• Name: ${order.customerName}` : "",
        order.customerPhone ? `• Phone: +91${order.customerPhone}` : "",
        order.customerAddress ? `• Address: ${order.customerAddress}` : "",
        ``,
        `*Order Items:*`,
        ...order.items.map(i => i.isFreeItem
          ? `• ${i.name} ×${i.quantity} — FREE 🎁`
          : `• ${i.name} ×${i.quantity} — ₹${(i.price * i.quantity).toLocaleString()}`
        ), ``,
        order.discount > 0 ? `*Discount (${order.couponCode || "coupon"}):* -₹${order.discount.toFixed(0)}` : "",
        `*Total:* ₹${order.finalAmount.toLocaleString()}`,
        ``,
        `*Payment Status:* ${paymentStatus}`,
        utrNumber.trim() ? `*UTR / Transaction ID:* ${utrNumber.trim()}` : "",
        screenshotUrl ? `*Payment Screenshot:* ${screenshotUrl}` : "",
        ``,
        `Please confirm receipt. Thank you! 🙏`,
      ].filter(Boolean);

      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
      if (win) {
        win.location.href = waUrl;
      } else {
        window.location.href = waUrl;
      }
      toast({ title: "WhatsApp తెరుచుకుంటోంది ✓" });
    } catch (e: any) {
      if (win) win.close();
      toast({ title: e.message || "Failed to share", variant: "destructive" });
    } finally {
      setScreenshotUploading(false);
    }
  };

  const handleCopyUPI = () => {
    if (order.shopPaymentId) {
      navigator.clipboard.writeText(order.shopPaymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!order.orderId) {
      toast({ title: "Order ID missing", description: "Please go back and try again.", variant: "destructive" });
      return;
    }
    setRazorpayLoading(true);
    try {
      const token = localStorage.getItem("coupons_hub_token");
      const resp = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.orderId, amount: order.finalAmount }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast({ title: data.error || "Payment failed", variant: "destructive" });
        setRazorpayLoading(false);
        return;
      }

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.head.appendChild(script);
        });
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "CouponsHub X",
        description: `Order from ${order.shopName}`,
        order_id: data.razorpayOrderId,
        prefill: {},
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            const verifyResp = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order.orderId,
              }),
            });
            const verifyData = await verifyResp.json();
            if (verifyResp.ok && verifyData.success) {
              setPaymentSuccess(true);
              sessionStorage.removeItem("pendingOrder");
              toast({ title: "Payment successful! 🎉", description: "Your order has been confirmed." });
              setTimeout(() => navigate("/my-orders"), 2000);
            } else {
              toast({ title: verifyData.error || "Verification failed", variant: "destructive" });
            }
          } catch {
            toast({ title: "Verification failed. Contact support.", variant: "destructive" });
          }
        },
        modal: { ondismiss: () => setRazorpayLoading(false) },
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: err.message || "Payment error", variant: "destructive" });
    } finally {
      setRazorpayLoading(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4 p-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-400/40 animate-bounce">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h1>
          <p className="text-muted-foreground">Your order is confirmed. Redirecting to orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
        {/* Back to Store */}
        {order.lastShopId && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/shop/${order.lastShopId}`)} className="mb-4 -ml-2" data-testid="button-back-to-store">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Store
          </Button>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-400/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {(order.orders?.length ?? 1) > 1 ? `${order.orders!.length} Orders Placed!` : "Order Ready!"}
          </h1>
          <p className="text-muted-foreground mt-1">Choose how to pay or place your order</p>
        </div>

        {/* Multi-store breakdown */}
        {order.orders && order.orders.length > 1 && (
          <div className="flex flex-col gap-3 mb-4">
            {order.orders.map((o: any, idx: number) => (
              <Card key={o.shopId || idx} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{o.shopName}</h3>
                    {o.orderId && <span className="text-[10px] text-muted-foreground">#{o.orderId.slice(0,8).toUpperCase()}</span>}
                  </div>
                  <div className="flex flex-col gap-1 mb-2">
                    {o.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.name} ×{item.quantity}{item.isFreeItem ? " 🎁" : ""}</span>
                        <span>{item.isFreeItem ? "Free" : `₹${(item.price * item.quantity).toLocaleString()}`}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs space-y-0.5 border-t border-gray-100 dark:border-gray-800 pt-1.5">
                    {o.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{o.discount.toFixed(0)}</span></div>}
                    {o.serviceFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Service fee (2%)</span><span>₹{o.serviceFee}</span></div>}
                    {o.deliveryFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>₹{o.deliveryFee}</span></div>}
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-0.5">
                      <span>Subtotal</span><span>₹{o.finalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  {o.shopWhatsapp && (
                    <button
                      onClick={() => {
                        const phone = o.shopWhatsapp.replace(/\D/g, "");
                        const itemLines = o.items.map((i: any) => i.isFreeItem ? `• ${i.name} ×${i.quantity} — FREE 🎁` : `• ${i.name} ×${i.quantity} — ₹${(i.price * i.quantity).toLocaleString()}`).join("\n");
                        const text = [`🛍️ *New Order from CouponsHub X*`, ``, `*Shop:* ${o.shopName}`, o.orderId ? `*Order ID:* #${o.orderId.slice(0,8).toUpperCase()}` : "", ``, `*Customer:*`, order.customerName ? `• Name: ${order.customerName}` : "", order.customerPhone ? `• Phone: +91${order.customerPhone}` : "", ``, `*Items:*`, itemLines, ``, o.discount > 0 ? `*Discount:* -₹${o.discount.toFixed(0)}` : "", `*Total:* ₹${o.finalAmount.toLocaleString()}`, ``, `Please confirm my order. Thank you! 🙏`].filter(Boolean).join("\n");
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-semibold"
                      data-testid={`button-whatsapp-shop-${o.shopId}`}
                    >
                      <MessageCircle className="w-4 h-4" /> Order via WhatsApp
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Summary (single store or combined total) */}
        <Card className="rounded-2xl border-0 shadow-md mb-4">
          <CardContent className="p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
              {order.orders && order.orders.length > 1 ? "Grand Total" : order.shopName}
            </h2>
            {!(order.orders && order.orders.length > 1) && (
              <div className="flex flex-col gap-1.5 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} ×{item.quantity}{item.isFreeItem ? " 🎁" : ""}</span>
                    <span className="font-medium">{item.isFreeItem ? "Free" : `₹${(item.price * item.quantity).toLocaleString()}`}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1">
              {(order.totalDiscount ?? order.discount) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Coupon discounts</span>
                  <span>-₹{(order.totalDiscount ?? order.discount).toFixed(0)}</span>
                </div>
              )}
              {(order.serviceFee ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Service fee (2%)</span>
                  <span>₹{order.serviceFee}</span>
                </div>
              )}
              {(order.deliveryFee ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Delivery fee</span>
                  <span>₹{order.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Total</span>
                <span className="text-lg flex items-center gap-0.5"><IndianRupee className="w-4 h-4" />{order.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        {(order.customerName || order.customerPhone || order.customerAddress) && (
          <Card className="rounded-2xl border-0 shadow-md mb-4">
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customer Details</h3>
              <div className="flex flex-col gap-2">
                {order.customerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{order.customerName}</span>
                  </div>
                )}
                {order.customerPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">+91 {order.customerPhone}</span>
                  </div>
                )}
                {order.customerAddress && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{order.customerAddress}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR/UPI Panel */}
        {showQrPanel && hasQrPayment && (
          <Card className="rounded-2xl border-0 shadow-xl mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5" />
                <span className="font-bold">Pay ₹{order.finalAmount.toLocaleString()}</span>
              </div>
              <button onClick={() => setShowQrPanel(false)} className="text-white/70 hover:text-white" data-testid="button-close-qr">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-5 flex flex-col items-center gap-4">
              {order.shopPaymentQr && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Scan QR to Pay</p>
                  <div className="p-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white shadow-inner">
                    <img src={order.shopPaymentQr} alt="Payment QR" className="w-52 h-52 object-contain" data-testid="img-payment-qr" />
                  </div>
                </div>
              )}
              {order.shopPaymentId && (
                <div className="w-full">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 text-center">UPI ID</p>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white flex-1 text-center tracking-wider" data-testid="text-payment-id">{order.shopPaymentId}</span>
                    <button onClick={handleCopyUPI} className="shrink-0 text-primary" data-testid="button-copy-upi">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              {/* UTR Number */}
              <div className="w-full">
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">UTR / Transaction ID <span className="font-normal">(optional)</span></Label>
                <Input
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="e.g. 424242424242"
                  className="rounded-xl text-sm"
                  data-testid="input-utr-number"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="w-full">
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Payment Screenshot <span className="font-normal">(optional)</span></Label>
                <input type="file" accept="image/*" ref={screenshotRef} className="hidden" onChange={handleScreenshotSelect} data-testid="input-screenshot-file" />
                {screenshotPreview ? (
                  <div className="relative">
                    <img src={screenshotPreview} alt="Screenshot" className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-700" data-testid="img-screenshot-preview" />
                    <button onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); if (screenshotRef.current) screenshotRef.current.value = ""; }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center" data-testid="button-remove-screenshot">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => screenshotRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-4 text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-colors" data-testid="button-upload-screenshot">
                    <ImageIcon className="w-4 h-4" /> Upload payment screenshot
                  </button>
                )}
              </div>

              {/* Share on WhatsApp */}
              {order.shopWhatsapp && (
                <Button
                  onClick={handleSharePaymentWhatsApp}
                  disabled={screenshotUploading}
                  className="w-full rounded-xl bg-[#25D366] hover:bg-[#20b958] text-white border-0 gap-2"
                  data-testid="button-share-payment-whatsapp"
                >
                  {screenshotUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {screenshotUploading ? "Uploading & Sharing..." : "Share Payment via WhatsApp"}
                </Button>
              )}

              <Button onClick={() => { sessionStorage.removeItem("pendingOrder"); navigate("/my-orders"); }} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border-0 text-white" data-testid="button-done-payment">
                Done — View My Orders
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Razorpay — Primary */}
          <button
            onClick={handleRazorpayPayment}
            disabled={razorpayLoading}
            className="w-full flex items-center gap-4 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 text-white rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            data-testid="button-razorpay-pay"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              {razorpayLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-base">Pay Securely Online</p>
              <p className="text-sm text-white/80">UPI, Cards, Net Banking via Razorpay</p>
            </div>
            <IndianRupee className="w-5 h-5 text-white/60" />
          </button>

          {/* WhatsApp */}
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
                <p className="text-sm text-white/80">Send order directly to shop</p>
              </div>
              <Phone className="w-5 h-5 text-white/60" />
            </button>
          )}

          {/* QR/UPI manual */}
          <button
            onClick={() => hasQrPayment ? setShowQrPanel(p => !p) : undefined}
            className={`w-full flex items-center gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${hasQrPayment ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer" : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"}`}
            data-testid="button-order-qr"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${hasQrPayment ? "bg-white/20" : "bg-gray-300 dark:bg-gray-700"}`}>
              <QrCode className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-base">Pay via UPI / QR</p>
              <p className={`text-sm ${hasQrPayment ? "text-white/80" : "text-gray-400"}`}>
                {hasQrPayment ? "Scan QR or copy UPI ID" : "Not configured by shop"}
              </p>
            </div>
            <CreditCard className="w-5 h-5 opacity-60" />
          </button>

          <Button variant="ghost" onClick={() => navigate("/home")} className="w-full rounded-2xl mt-1 text-muted-foreground" data-testid="button-back-home">
            <Home className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
