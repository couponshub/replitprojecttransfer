import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LayoutDashboard, Tag, Store, Package, Ticket, ShoppingBag,
  Plus, Edit, Trash2, Crown, LogOut, ChevronRight, Users, TrendingUp,
  Zap, Star, Check, X, Menu, Award, Flame, UserCheck, Phone, Mail
} from "lucide-react";
import type { Category, Shop, Product, Coupon, Order, User } from "@shared/schema";

type Tab = "overview" | "categories" | "shops" | "products" | "coupons" | "orders" | "users" | "vendors" | "top-shops" | "top-coupons";

const NAV_ITEMS: { id: Tab; label: string; icon: any; section?: string }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, section: "Main" },
  { id: "categories", label: "Categories", icon: Tag, section: "Manage" },
  { id: "shops", label: "Shops", icon: Store, section: "Manage" },
  { id: "products", label: "Products", icon: Package, section: "Manage" },
  { id: "coupons", label: "Coupons", icon: Ticket, section: "Manage" },
  { id: "orders", label: "Orders", icon: ShoppingBag, section: "Manage" },
  { id: "users", label: "Users", icon: Users, section: "People" },
  { id: "vendors", label: "Vendors", icon: Crown, section: "People" },
  { id: "top-shops", label: "Top Shops", icon: Award, section: "Insights" },
  { id: "top-coupons", label: "Top Coupons", icon: Flame, section: "Insights" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STAT_CARDS = [
  { key: "users", label: "Total Users", icon: Users, color: "from-blue-500 to-cyan-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  { key: "categories", label: "Categories", icon: Tag, color: "from-violet-500 to-purple-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
  { key: "shops", label: "All Shops", icon: Store, color: "from-emerald-500 to-teal-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { key: "vendors", label: "Vendors", icon: Crown, color: "from-amber-500 to-yellow-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  { key: "products", label: "Products", icon: Package, color: "from-orange-500 to-red-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
  { key: "coupons", label: "Coupons", icon: Ticket, color: "from-pink-500 to-rose-400", bg: "bg-pink-50 dark:bg-pink-950/40" },
  { key: "orders", label: "Orders", icon: ShoppingBag, color: "from-indigo-500 to-blue-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
];

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [filterShopId, setFilterShopId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  if (!isAdmin) {
    navigate("/login");
    return null;
  }

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: recentOrders = [] } = useQuery<(Order & { user?: User })[]>({ queryKey: ["/api/admin/recent-orders"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: shops = [] } = useQuery<(Shop & { category?: Category })[]>({ queryKey: ["/api/shops"] });
  const { data: products = [] } = useQuery<(Product & { shop?: Shop })[]>({ queryKey: ["/api/products"] });
  const { data: coupons = [] } = useQuery<(Coupon & { shop?: Shop })[]>({ queryKey: ["/api/coupons"] });
  const { data: orders = [] } = useQuery<(Order & { user?: User })[]>({ queryKey: ["/api/orders"] });
  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: topShops = [] } = useQuery<Shop[]>({ queryKey: ["/api/admin/top-shops"] });
  const { data: topCoupons = [] } = useQuery<(Coupon & { shop?: Shop })[]>({ queryKey: ["/api/admin/top-coupons"] });

  const premiumShops = shops.filter(s => s.is_premium);

  const openCreate = (defaults: any = {}) => { setEditItem(null); setFormData(defaults); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormData({ ...item }); setDialogOpen(true); };
  const setForm = (key: string, value: any) => setFormData((f: any) => ({ ...f, [key]: value }));

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => apiRequest("DELETE", `/api/${type}/${id}`),
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Deleted successfully" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ type, data, id }: { type: string; data: any; id?: string }) => {
      if (id) return apiRequest("PUT", `/api/${type}/${id}`, data);
      return apiRequest("POST", `/api/${type}`, data);
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/top-shops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/top-coupons"] });
      setDialogOpen(false);
      toast({ title: editItem ? "Updated successfully" : "Created successfully" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PUT", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const togglePremium = (shop: Shop) => {
    saveMutation.mutate({ type: "shops", data: { is_premium: !shop.is_premium }, id: shop.id });
  };

  const handleSave = (type: string) => {
    const data = { ...formData };
    if (data.price) data.price = data.price.toString();
    if (data.value) data.value = data.value.toString();
    saveMutation.mutate({ type, data, id: editItem?.id });
  };

  const filteredProducts = filterShopId ? products.filter(p => p.shop_id === filterShopId) : products;
  const filteredShops = filterCategoryId ? shops.filter(s => s.category_id === filterCategoryId) : shops;

  const sections = ["Main", "Manage", "People", "Insights"];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-white leading-none tracking-tight">CouponsHub X</p>
          <p className="text-[11px] text-muted-foreground font-medium">Admin Console</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {sections.map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          return (
            <div key={section} className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-1.5">{section}</p>
              {items.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                      active
                        ? "bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    }`}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-500" : ""}`} />
                    {item.label}
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800/50">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {user?.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await logout(); navigate("/login"); }}
            className="flex-1 gap-1.5 text-muted-foreground text-xs h-8 rounded-lg"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/home")}
            className="flex-1 gap-1.5 text-muted-foreground text-xs h-8 rounded-lg"
          >
            <ChevronRight className="w-3.5 h-3.5" /> Store
          </Button>
        </div>
      </div>
    </div>
  );

  const StatCard = ({ stat, onClick }: { stat: typeof STAT_CARDS[0]; onClick?: () => void }) => {
    const Icon = stat.icon;
    const value = stats?.[stat.key];
    return (
      <button
        onClick={onClick}
        className={`${stat.bg} rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] border border-transparent hover:border-gray-200 dark:hover:border-gray-700`}
        data-testid={`stat-${stat.key}`}
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {value !== undefined ? value : <Skeleton className="h-7 w-10" />}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</div>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50/80 dark:bg-gray-950 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 p-3 shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60 bg-white dark:bg-gray-900 p-3 flex flex-col shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1" data-testid="button-mobile-menu">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight capitalize">
              {NAV_ITEMS.find(i => i.id === activeTab)?.label || activeTab}
            </h1>
          </div>
          <Badge className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50 text-xs font-semibold hidden sm:flex">
            Admin
          </Badge>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {STAT_CARDS.map(stat => (
                  <StatCard key={stat.key} stat={stat} onClick={() => {
                    const tabMap: Record<string, Tab> = { users: "users", categories: "categories", shops: "shops", vendors: "vendors", products: "products", coupons: "coupons", orders: "orders" };
                    setActiveTab(tabMap[stat.key] || "overview");
                  }} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5 text-white" />
                      </div>
                      Recent Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                      {recentOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between py-3 gap-3" data-testid={`overview-order-${order.id}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                              {order.user?.name?.[0] || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{order.user?.name || "Unknown"}</p>
                              <p className="text-[11px] text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`${STATUS_COLORS[order.status]} border-0 text-[11px] capitalize`}>{order.status}</Badge>
                            <span className="font-bold text-sm text-gray-900 dark:text-white">₹{parseFloat(order.final_amount as string).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                      {recentOrders.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No orders yet</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center">
                        <Award className="w-3.5 h-3.5 text-white" />
                      </div>
                      Top Shops
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                      {topShops.map((shop, i) => (
                        <div key={shop.id} className="flex items-center gap-3 py-3" data-testid={`overview-top-shop-${shop.id}`}>
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{shop.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{shop.address}</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[11px] gap-1">
                            <Crown className="w-3 h-3" /> Premium
                          </Badge>
                        </div>
                      ))}
                      {topShops.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No premium shops</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
                      <Flame className="w-3.5 h-3.5 text-white" />
                    </div>
                    Top Coupons
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {topCoupons.map(coupon => (
                      <div key={coupon.id} className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 p-4" data-testid={`overview-top-coupon-${coupon.id}`}>
                        <code className="text-sm font-bold text-gray-900 dark:text-white">{coupon.code}</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{coupon.shop?.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "users" && (
            <div className="flex flex-col gap-4">
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">User</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Contact</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Role</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {allUsers.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-user-${u.id}`}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
                                  u.role === "admin" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-blue-400 to-violet-500"
                                }`}>
                                  {u.name[0]}
                                </div>
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                                {u.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> +91 {u.phone}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge className={`border-0 text-[11px] capitalize ${
                                u.role === "admin"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}>{u.role}</Badge>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {allUsers.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No users found</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "vendors" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {premiumShops.map(shop => (
                  <Card key={shop.id} className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden" data-testid={`card-vendor-${shop.id}`}>
                    <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {shop.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate">{shop.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{shop.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[11px] gap-1">
                          <Crown className="w-3 h-3" /> Premium Vendor
                        </Badge>
                        {shop.featured && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[11px]">Featured</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{shop.commission_percentage}% commission</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate flex-1">{shop.address}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePremium(shop)}
                          className="rounded-lg text-xs border-red-200 text-red-500 hover:bg-red-50 ml-2 shrink-0"
                          data-testid={`button-remove-vendor-${shop.id}`}
                        >
                          <X className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {premiumShops.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No premium vendors yet</div>
              )}
            </div>
          )}

          {activeTab === "top-shops" && (
            <div className="flex flex-col gap-4">
              {topShops.map((shop, i) => (
                <Card key={shop.id} className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden" data-testid={`card-top-shop-${shop.id}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                      i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500" :
                      i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400" :
                      i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700" :
                      "bg-gradient-to-br from-blue-400 to-violet-500"
                    }`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white">{shop.name}</h3>
                      <p className="text-xs text-muted-foreground">{shop.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs gap-1">
                        <Crown className="w-3 h-3" /> Premium
                      </Badge>
                      <span className="text-sm font-semibold text-gray-500">{shop.commission_percentage}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {topShops.length === 0 && <div className="text-center py-12 text-muted-foreground">No top shops</div>}
            </div>
          )}

          {activeTab === "top-coupons" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topCoupons.map((coupon, i) => (
                <Card key={coupon.id} className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden" data-testid={`card-top-coupon-${coupon.id}`}>
                  <div className={`h-1.5 ${
                    i === 0 ? "bg-gradient-to-r from-pink-500 to-rose-500" :
                    i === 1 ? "bg-gradient-to-r from-violet-500 to-purple-500" :
                    "bg-gradient-to-r from-blue-500 to-cyan-500"
                  }`} />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <code className="text-lg font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">{coupon.code}</code>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Active</Badge>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {coupon.type === "percentage" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{coupon.shop?.name}</p>
                  </CardContent>
                </Card>
              ))}
              {topCoupons.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No top coupons</div>}
            </div>
          )}

          {activeTab === "categories" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25" data-testid="button-create-category">
                  <Plus className="w-4 h-4" /> Add Category
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-category-${cat.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Tag className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "categories", id: cat.id })} data-testid={`button-delete-category-${cat.id}`}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Dialog open={dialogOpen && activeTab === "categories"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>{editItem ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div><Label>Name</Label><Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1.5 rounded-xl" data-testid="input-category-name" /></div>
                    <div><Label>Image URL</Label><Input value={formData.image || ""} onChange={e => setForm("image", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <Button onClick={() => handleSave("categories")} disabled={saveMutation.isPending} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600" data-testid="button-save-category">
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "shops" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                  <SelectTrigger className="w-48 rounded-xl" data-testid="select-filter-category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25" data-testid="button-create-shop">
                  <Plus className="w-4 h-4" /> Add Shop
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredShops.map(shop => (
                      <div key={shop.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-shop-${shop.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md">
                            {shop.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 dark:text-white">{shop.name}</span>
                              {shop.is_premium && <Badge className="bg-amber-100 text-amber-700 border-0 text-[11px] gap-1"><Crown className="w-3 h-3" /> Premium</Badge>}
                              {shop.featured && <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px]">Featured</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{shop.category?.name || "No category"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePremium(shop)}
                            className={`rounded-xl text-xs gap-1 ${shop.is_premium ? "border-amber-300 text-amber-600" : ""}`}
                            data-testid={`button-premium-${shop.id}`}
                          >
                            <Crown className="w-3 h-3" /> {shop.is_premium ? "Unpremium" : "Premium"}
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(shop)} data-testid={`button-edit-shop-${shop.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "shops", id: shop.id })} data-testid={`button-delete-shop-${shop.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Dialog open={dialogOpen && activeTab === "shops"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl max-w-lg">
                  <DialogHeader><DialogTitle>{editItem ? "Edit Shop" : "Add Shop"}</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Name</Label><Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1.5 rounded-xl" data-testid="input-shop-name" /></div>
                    <div className="col-span-2"><Label>Description</Label><Input value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div><Label>Address</Label><Input value={formData.address || ""} onChange={e => setForm("address", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div><Label>WhatsApp</Label><Input value={formData.whatsapp_number || ""} onChange={e => setForm("whatsapp_number", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div><Label>Category</Label>
                      <Select value={formData.category_id || ""} onValueChange={v => setForm("category_id", v)}>
                        <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Commission %</Label><Input type="number" value={formData.commission_percentage || ""} onChange={e => setForm("commission_percentage", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" id="featured" checked={formData.featured || false} onChange={e => setForm("featured", e.target.checked)} className="w-4 h-4 rounded" />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" id="is_premium" checked={formData.is_premium || false} onChange={e => setForm("is_premium", e.target.checked)} className="w-4 h-4 rounded" />
                      <Label htmlFor="is_premium">Premium</Label>
                    </div>
                  </div>
                  <Button onClick={() => handleSave("shops")} disabled={saveMutation.isPending} className="rounded-xl mt-2 bg-gradient-to-r from-blue-500 to-violet-600" data-testid="button-save-shop">
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "products" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Select value={filterShopId} onValueChange={setFilterShopId}>
                  <SelectTrigger className="w-48 rounded-xl" data-testid="select-filter-shop">
                    <SelectValue placeholder="All shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Shops</SelectItem>
                    {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25" data-testid="button-create-product">
                  <Plus className="w-4 h-4" /> Add Product
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredProducts.map(prod => (
                      <div key={prod.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-product-${prod.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold shadow-md">{prod.name[0]}</div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{prod.name}</p>
                            <p className="text-xs text-muted-foreground">{prod.shop?.name} &middot; ₹{parseFloat(prod.price as string).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(prod)} data-testid={`button-edit-product-${prod.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "products", id: prod.id })} data-testid={`button-delete-product-${prod.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Dialog open={dialogOpen && activeTab === "products"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>{editItem ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div><Label>Name</Label><Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1.5 rounded-xl" data-testid="input-product-name" /></div>
                    <div><Label>Description</Label><Input value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div><Label>Price (₹)</Label><Input type="number" value={formData.price || ""} onChange={e => setForm("price", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div><Label>Shop</Label>
                      <Select value={formData.shop_id || ""} onValueChange={v => setForm("shop_id", v)}>
                        <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select shop" /></SelectTrigger>
                        <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => handleSave("products")} disabled={saveMutation.isPending} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600" data-testid="button-save-product">
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "coupons" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate({ is_active: true, type: "percentage" })} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25" data-testid="button-create-coupon">
                  <Plus className="w-4 h-4" /> Add Coupon
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {coupons.map(coupon => (
                      <div key={coupon.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-coupon-${coupon.id}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="font-bold text-sm bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">{coupon.code}</code>
                            <Badge className={`border-0 text-[11px] capitalize ${coupon.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600"}`}>
                              {coupon.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`} &middot; {coupon.shop?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(coupon)} data-testid={`button-edit-coupon-${coupon.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "coupons", id: coupon.id })} data-testid={`button-delete-coupon-${coupon.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Dialog open={dialogOpen && activeTab === "coupons"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>{editItem ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div><Label>Code</Label><Input value={formData.code || ""} onChange={e => setForm("code", e.target.value.toUpperCase())} className="mt-1.5 rounded-xl font-mono" data-testid="input-coupon-code" /></div>
                    <div><Label>Type</Label>
                      <Select value={formData.type || "percentage"} onValueChange={v => setForm("type", v)}>
                        <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="free_item">Free Item</SelectItem>
                          <SelectItem value="flash">Flash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Value</Label><Input type="number" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className="mt-1.5 rounded-xl" /></div>
                    <div><Label>Shop</Label>
                      <Select value={formData.shop_id || ""} onValueChange={v => setForm("shop_id", v)}>
                        <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select shop" /></SelectTrigger>
                        <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_active" checked={formData.is_active ?? true} onChange={e => setForm("is_active", e.target.checked)} className="w-4 h-4 rounded" />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <Button onClick={() => handleSave("coupons")} disabled={saveMutation.isPending} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600" data-testid="button-save-coupon">
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="flex flex-col gap-4">
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Order</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Customer</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Amount</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Date</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {orders.map(order => (
                          <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-order-${order.id}`}>
                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{order.user?.name || "Unknown"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">₹{parseFloat(order.final_amount as string).toLocaleString()}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5">
                              <Select
                                value={order.status}
                                onValueChange={v => updateOrderStatus.mutate({ id: order.id, status: v })}
                              >
                                <SelectTrigger className={`w-32 rounded-xl text-xs ${STATUS_COLORS[order.status] || ""} border-0`} data-testid={`select-order-status-${order.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {orders.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No orders yet</p>}
                </CardContent>
              </Card>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
