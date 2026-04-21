import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  Package, CheckCircle, Clock, Truck, ShoppingBag, ChevronRight,
  IndianRupee, Tag, Store, ArrowLeft, CreditCard
} from "lucide-react";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  price: string;
  is_free_item: boolean;
}

interface Order {
  id: string;
  shop_name: string | null;
  final_amount: string;
  total_amount: string;
  discount_amount: string;
  status: "pending" | "confirmed" | "completed";
  payment_status: string;
  coupon_code: string | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  completed: { label: "Completed", icon: Truck, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const PAYMENT_CONFIG = {
  unpaid: { label: "Unpaid", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  pending: { label: "Processing", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  paid: { label: "Paid ✓", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function MyOrdersPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
    enabled: isAuthenticated,
  });

  if (!loading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  const pending = orders.filter(o => o.status === "pending");
  const confirmed = orders.filter(o => o.status === "confirmed");
  const completed = orders.filter(o => o.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/home")} className="w-9 h-9 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Orders</h1>
            <p className="text-xs text-muted-foreground">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
          </div>
        </div>

        {/* Stats Row */}
        {!isLoading && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Pending", count: pending.length, color: "from-amber-400 to-orange-500", icon: Clock },
              { label: "Confirmed", count: confirmed.length, color: "from-blue-400 to-blue-600", icon: CheckCircle },
              { label: "Completed", count: completed.length, color: "from-emerald-400 to-teal-500", icon: Truck },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{stat.count}</span>
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ShoppingBag className="w-9 h-9 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">No orders yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start shopping to place your first order</p>
            </div>
            <Button onClick={() => navigate("/home")} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white mt-2" data-testid="button-start-shopping">
              Browse Shops
            </Button>
          </div>
        )}

        {/* Orders List */}
        {!isLoading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map(order => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const paymentCfg = PAYMENT_CONFIG[order.payment_status as keyof typeof PAYMENT_CONFIG] || PAYMENT_CONFIG.unpaid;
              const StatusIcon = statusCfg.icon;
              const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const time = new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

              return (
                <Card key={order.id} className="rounded-2xl border-0 shadow-sm overflow-hidden" data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          {order.shop_name && (
                            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              <Store className="w-3 h-3" /> {order.shop_name}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground">#{order.id.slice(-8).toUpperCase()} · {date} {time}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-0.5 text-sm">
                          <IndianRupee className="w-3 h-3" />{parseFloat(order.final_amount).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="px-4 py-2 flex flex-col gap-1">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground truncate max-w-[65%]">
                              {item.is_free_item ? "🎁 " : ""}{item.product_name || "Product"} ×{item.quantity}
                            </span>
                            <span className="font-medium text-gray-700 dark:text-gray-300 shrink-0">
                              {item.is_free_item ? <span className="text-emerald-600 text-xs font-semibold">FREE</span> : `₹${(parseFloat(item.price) * item.quantity).toLocaleString()}`}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 mt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${paymentCfg.color}`}>
                          <CreditCard className="w-3 h-3" />
                          {paymentCfg.label}
                        </span>
                        {order.coupon_code && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            <Tag className="w-3 h-3" />
                            {order.coupon_code}
                          </span>
                        )}
                      </div>
                      {parseFloat(order.discount_amount) > 0 && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Saved ₹{parseFloat(order.discount_amount).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
