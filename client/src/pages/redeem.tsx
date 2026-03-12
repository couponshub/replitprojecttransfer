import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Store, Tag, CheckCircle2, Clock, Ticket, MapPin, Phone } from "lucide-react";

export default function RedeemPage() {
  const { id: couponId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [redeemed, setRedeemed] = useState(false);

  const { data: coupon, isLoading } = useQuery<any>({
    queryKey: [`/api/coupons/${couponId}/public`],
  });

  const redeemMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/coupons/${couponId}/redeem-store`),
    onSuccess: () => {
      setRedeemed(true);
      toast({ title: "Coupon redeemed at store!", description: "Show this screen to the shopkeeper." });
    },
    onError: (e: any) => {
      toast({ title: "Redemption failed", description: e.message, variant: "destructive" });
    },
  });

  const handleRedeem = () => {
    if (!user) {
      toast({ title: "Please sign in to redeem", variant: "destructive" });
      navigate("/login");
      return;
    }
    redeemMutation.mutate();
  };

  const discountLabel = () => {
    if (!coupon) return "";
    if (coupon.type === "percentage") return `${coupon.value}% OFF`;
    if (coupon.type === "flat") return `₹${coupon.value} OFF`;
    if (coupon.type === "free_item") return "Free Item";
    if (coupon.type === "bogo") return "Buy 1 Get 1";
    if (coupon.type === "category_offer") return "Category Offer";
    return coupon.value;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          data-testid="button-back-redeem"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-8 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse w-3/4" />
            <div className="h-6 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse w-1/2" />
          </div>
        ) : !coupon ? (
          <div className="text-center py-16">
            <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-muted-foreground">Coupon not found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shop Info */}
            {coupon.shop && (
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                {coupon.shop.logo ? (
                  <img src={coupon.shop.logo} alt={coupon.shop.name} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                    <Store className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{coupon.shop.name}</p>
                  {coupon.shop.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{coupon.shop.address}</span>
                    </p>
                  )}
                  {coupon.shop.whatsapp_number && (
                    <a
                      href={`tel:${coupon.shop.whatsapp_number}`}
                      className="text-xs text-blue-500 flex items-center gap-1 mt-0.5 hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {coupon.shop.whatsapp_number}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Coupon Card */}
            <div className={`rounded-3xl p-6 shadow-lg ${redeemed ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-blue-500 to-violet-600"} text-white transition-all duration-500`}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 opacity-80" />
                <span className="text-sm font-semibold opacity-80 uppercase tracking-wider">
                  {redeemed ? "Redeemed" : "Use at Store"}
                </span>
              </div>

              <div className="text-5xl font-black mb-2">{discountLabel()}</div>
              <div className="text-xl font-bold opacity-90 mb-4">CODE: {coupon.code}</div>

              {coupon.description && (
                <p className="text-sm opacity-80 mb-4">{coupon.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm opacity-75">
                {coupon.expiry_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Valid till {new Date(coupon.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                {coupon.min_order_amount && (
                  <span>Min ₹{coupon.min_order_amount}</span>
                )}
              </div>

              {redeemed && (
                <div className="mt-5 flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">Successfully Redeemed!</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            {!redeemed && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold mb-1">How to use at store</p>
                <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                  <li>Visit the shop in person</li>
                  <li>Show this screen to the shopkeeper</li>
                  <li>Tap "Redeem Now" to confirm usage</li>
                </ol>
              </div>
            )}

            {/* Redeem Button */}
            {redeemed ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900 dark:text-white">Coupon Used!</p>
                <p className="text-sm text-muted-foreground mt-1">Your redemption has been recorded.</p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => navigate(`/shop/${coupon.shop_id}`)}
                  data-testid="button-back-to-shop"
                >
                  Back to Shop
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleRedeem}
                disabled={redeemMutation.isPending}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                data-testid="button-redeem-now"
              >
                {redeemMutation.isPending ? "Redeeming..." : "Redeem Now"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
