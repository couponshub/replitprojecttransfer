import { useState, useEffect } from "react";
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
  Zap, Star, Check, X, Menu, Award, Flame, UserCheck, Phone, Mail,
  Globe, MapPin, Wifi, WifiOff, Search, Image, Link, ExternalLink, Upload, Loader2, Eye, EyeOff
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Shop, Product, Coupon, Order, User } from "@shared/schema";

type Tab = "overview" | "categories" | "shops" | "products" | "coupons" | "orders" | "users" | "vendors" | "top-shops" | "top-coupons" | "banners";

const NAV_ITEMS: { id: Tab; label: string; icon: any; section?: string }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, section: "Main" },
  { id: "categories", label: "Categories", icon: Tag, section: "Manage" },
  { id: "shops", label: "Shops", icon: Store, section: "Manage" },
  { id: "products", label: "Products", icon: Package, section: "Manage" },
  { id: "coupons", label: "Coupons", icon: Ticket, section: "Manage" },
  { id: "banners", label: "Banners", icon: Image, section: "Manage" },
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
  const { user, logout, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [filterShopId, setFilterShopId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [bundleItems, setBundleItems] = useState<{ product_id: string; custom_price: string; name: string }[]>([]);
  const [couponProdSearch, setCouponProdSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [productImageUrls, setProductImageUrls] = useState<string[]>([""]);
  const [shopBanners, setShopBanners] = useState<string[]>([""]);
  const [qrUploading, setQrUploading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", password: "" });

  useEffect(() => {
    if (!dialogOpen || activeTab !== "shops") return;
    const bans = editItem?.banners && Array.isArray(editItem.banners) && editItem.banners.length > 0
      ? editItem.banners : [""];
    setShopBanners(bans);
  }, [editItem, dialogOpen, activeTab]);

  useEffect(() => {
    if (!dialogOpen || activeTab !== "products") return;
    const imgs = editItem?.images && Array.isArray(editItem.images) && editItem.images.length > 0
      ? editItem.images
      : editItem?.image ? [editItem.image] : [""];
    setProductImageUrls(imgs);
  }, [editItem, dialogOpen, activeTab]);

  useEffect(() => {
    if (!dialogOpen || activeTab !== "coupons") return;
    if (editItem?.id) {
      apiRequest("GET", `/api/coupons/${editItem.id}/products`).then((items: any[]) => {
        setBundleItems(items.map((cp: any) => ({
          product_id: cp.product_id,
          custom_price: cp.custom_price,
          name: cp.product?.name || "Product",
        })));
      }).catch(() => setBundleItems([]));
    } else {
      setBundleItems([]);
    }
    setCouponProdSearch("");
  }, [editItem, dialogOpen, activeTab]);

  if (!loading && !isAdmin) {
    navigate("/login");
    return null;
  }
  if (loading) return null;

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
  const { data: vendorAccounts = [], refetch: refetchVendors } = useQuery<any[]>({ queryKey: ["/api/admin/vendors"] });

  const premiumShops = shops.filter(s => s.is_premium);

  const [vendorLoginDialog, setVendorLoginDialog] = useState(false);
  const [vendorLoginShop, setVendorLoginShop] = useState<any>(null);
  const [vendorLoginForm, setVendorLoginForm] = useState({ email: "", password: "", name: "" });
  const [showVendorPass, setShowVendorPass] = useState(false);

  const saveVendorLoginMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/vendors", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Vendor login saved!" }); setVendorLoginDialog(false); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/vendors/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Vendor login removed" }); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const openCreate = (defaults: any = {}) => { setEditItem(null); setFormData(defaults); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormData({ ...item }); setDialogOpen(true); };
  const setForm = (key: string, value: any) => setFormData((f: any) => ({ ...f, [key]: value }));

  const handleQrUpload = async (file: File) => {
    setQrUploading(true);
    try {
      const token = localStorage.getItem("coupons_hub_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url) setForm("payment_qr", data.url);
      else toast({ title: "Upload failed", description: data.error || "Unknown error", variant: "destructive" });
    } catch {
      toast({ title: "Upload failed", description: "Network error", variant: "destructive" });
    } finally {
      setQrUploading(false);
    }
  };

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
    if (type === "shops") {
      const cleanBanners = shopBanners.filter(u => u.trim());
      data.banners = cleanBanners.length > 0 ? cleanBanners : null;
    }
    if (type === "products") {
      const cleanUrls = productImageUrls.filter(u => u.trim());
      data.images = cleanUrls.length > 0 ? cleanUrls : null;
      if (!data.type) data.type = "product";
      if (data.type === "service") {
        data.price = null;
      } else {
        if (data.price) data.price = data.price.toString();
      }
    }
    if (data.price) data.price = data.price.toString();
    if (type === "coupons") {
      data.coupon_products = bundleItems.map(i => ({ product_id: i.product_id, custom_price: i.custom_price }));
      if (data.type === "free_item") {
        data.value = "0";
      } else {
        data.value = data.value ? data.value.toString() : "0";
        data.free_item_product_id = data.free_item_product_id || null;
      }
    } else {
      if (data.value) data.value = data.value.toString();
    }
    saveMutation.mutate({ type, data, id: editItem?.id });
  };

  const filteredProducts = products
    .filter(p => !filterShopId || p.shop_id === filterShopId)
    .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.shop?.name?.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredCoupons = coupons.filter(c =>
    !couponSearch ||
    c.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
    c.shop?.name?.toLowerCase().includes(couponSearch.toLowerCase())
  );
  const filteredShops = shops
    .filter(s => !filterCategoryId || s.category_id === filterCategoryId)
    .filter(s => !shopSearch || s.name.toLowerCase().includes(shopSearch.toLowerCase()));

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
              <div className="flex justify-end">
                <Button onClick={() => { setUserForm({ name: "", email: "", phone: "", password: "" }); setUserDialogOpen(true); }} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25" data-testid="button-create-user">
                  <Plus className="w-4 h-4" /> Create User
                </Button>
              </div>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogContent className="rounded-2xl max-w-md">
                  <DialogHeader><DialogTitle className="text-lg font-bold">Create New User</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">
                    <div><Label className="text-xs font-semibold">Full Name</Label><Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="e.g. Rahul Patel" data-testid="input-new-user-name" /></div>
                    <div><Label className="text-xs font-semibold">Email</Label><Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="user@example.com" data-testid="input-new-user-email" /></div>
                    <div>
                      <Label className="text-xs font-semibold">Mobile <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+91</span>
                        <Input value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="rounded-xl pl-10" placeholder="9876543210" data-testid="input-new-user-phone" />
                      </div>
                    </div>
                    <div><Label className="text-xs font-semibold">Password</Label><Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Min 6 characters" data-testid="input-new-user-password" /></div>
                    <Button
                      onClick={async () => {
                        if (!userForm.name || !userForm.email || userForm.password.length < 6) {
                          toast({ title: "Please fill all required fields (password min 6 chars)", variant: "destructive" }); return;
                        }
                        try {
                          await apiRequest("POST", "/api/users", { ...userForm, phone: userForm.phone || null });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                          setUserDialogOpen(false);
                          toast({ title: `User "${userForm.name}" created! They can login with email: ${userForm.email}` });
                        } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
                      }}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600"
                      data-testid="button-save-user"
                    >Create User</Button>
                  </div>
                </DialogContent>
              </Dialog>
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Vendor Login Accounts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Each shop can have one vendor login. Click "Set Login" to create or update.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map(shop => {
                  const vendorAcc = vendorAccounts.find((v: any) => v.shop_id === shop.id);
                  return (
                    <Card key={shop.id} className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden" data-testid={`card-vendor-${shop.id}`}>
                      <div className={`h-1.5 ${vendorAcc ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
                            {shop.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">{shop.name}</h3>
                            <p className="text-[11px] text-muted-foreground truncate">{shop.description}</p>
                          </div>
                        </div>

                        {vendorAcc ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 mb-3">
                            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Login Active
                            </p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 truncate mt-0.5">{vendorAcc.email}</p>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-3">
                            <p className="text-[11px] text-muted-foreground">No vendor login set</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setVendorLoginShop(shop);
                              setVendorLoginForm({ name: shop.name, email: vendorAcc?.email || `${shop.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}@vendor.com`, password: "" });
                              setVendorLoginDialog(true);
                            }}
                            className="rounded-lg text-xs flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 border-0"
                            data-testid={`button-set-login-${shop.id}`}
                          >
                            <UserCheck className="w-3 h-3 mr-1" /> {vendorAcc ? "Update Login" : "Set Login"}
                          </Button>
                          {vendorAcc && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteVendorMutation.mutate(vendorAcc.id)}
                              className="rounded-lg h-8 w-8 shrink-0"
                              data-testid={`button-delete-vendor-${shop.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Dialog open={vendorLoginDialog} onOpenChange={setVendorLoginDialog}>
                <DialogContent className="rounded-2xl max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold">
                      {vendorLoginShop ? `Vendor Login — ${vendorLoginShop.name}` : "Set Vendor Login"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">
                    <div>
                      <Label className="text-sm">Name</Label>
                      <Input value={vendorLoginForm.name} onChange={e => setVendorLoginForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Vendor name" data-testid="input-vendor-name" />
                    </div>
                    <div>
                      <Label className="text-sm">Email *</Label>
                      <Input type="email" value={vendorLoginForm.email} onChange={e => setVendorLoginForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="shopname@vendor.com" data-testid="input-vendor-login-email" />
                    </div>
                    <div>
                      <Label className="text-sm">Password *</Label>
                      <div className="relative mt-1.5">
                        <Input type={showVendorPass ? "text" : "password"} value={vendorLoginForm.password} onChange={e => setVendorLoginForm(f => ({ ...f, password: e.target.value }))} className="rounded-xl pr-10" placeholder="Min 6 characters" data-testid="input-vendor-login-password" />
                        <button type="button" onClick={() => setShowVendorPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showVendorPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Leave blank to keep existing password</p>
                    </div>
                    <Button
                      onClick={() => saveVendorLoginMutation.mutate({ shop_id: vendorLoginShop?.id, name: vendorLoginForm.name, email: vendorLoginForm.email, password: vendorLoginForm.password || "Vendor@123" })}
                      disabled={saveVendorLoginMutation.isPending || !vendorLoginForm.email}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border-0"
                      data-testid="button-save-vendor-login"
                    >
                      {saveVendorLoginMutation.isPending ? "Saving..." : "Save Vendor Login"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shops..."
                    value={shopSearch}
                    onChange={e => setShopSearch(e.target.value)}
                    className="pl-9 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    data-testid="input-shop-search"
                  />
                </div>
                <Button onClick={() => openCreate({ subscription_active: true, is_premium: false, featured: false })} className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 shrink-0" data-testid="button-create-shop">
                  <Plus className="w-4 h-4" /> Add Shop
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterCategoryId("")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!filterCategoryId ? "bg-blue-500 text-white shadow-md shadow-blue-500/25" : "bg-white dark:bg-gray-800 text-muted-foreground border border-gray-200 dark:border-gray-700"}`}
                  data-testid="filter-all-categories"
                >All</button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? "" : cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCategoryId === cat.id ? "bg-blue-500 text-white shadow-md shadow-blue-500/25" : "bg-white dark:bg-gray-800 text-muted-foreground border border-gray-200 dark:border-gray-700"}`}
                    data-testid={`filter-category-${cat.id}`}
                  >{cat.name}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredShops.map(shop => (
                  <Card key={shop.id} className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden group" data-testid={`card-shop-${shop.id}`}>
                    <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                          {shop.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">{shop.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{shop.description || "No description"}</p>
                          {shop.category && (
                            <Badge className="mt-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-0 text-[10px]">
                              {(shop as any).category?.name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 mb-3">
                        {shop.address && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{shop.address}</span>
                          </div>
                        )}
                        {shop.whatsapp_number && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{shop.whatsapp_number}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {shop.is_premium && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] gap-1"><Crown className="w-2.5 h-2.5" />Premium</Badge>}
                        {shop.featured && <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0 text-[10px]">Top Shop</Badge>}
                        <Badge className={`border-0 text-[10px] gap-1 ${shop.subscription_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
                          {shop.subscription_active ? <><Wifi className="w-2.5 h-2.5" />Live</> : <><WifiOff className="w-2.5 h-2.5" />Offline</>}
                        </Badge>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <button
                          onClick={() => saveMutation.mutate({ type: "shops", data: { subscription_active: !shop.subscription_active }, id: shop.id })}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${shop.subscription_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                          data-testid={`button-live-${shop.id}`}
                        >
                          {shop.subscription_active ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {shop.subscription_active ? "Live" : "Offline"}
                        </button>
                        <button
                          onClick={() => saveMutation.mutate({ type: "shops", data: { featured: !shop.featured }, id: shop.id })}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${shop.featured ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                          data-testid={`button-top-${shop.id}`}
                        >
                          <Star className="w-3 h-3" />
                          Top Shop
                        </button>
                        <div className="ml-auto flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="rounded-lg h-8 w-8" onClick={() => openEdit(shop)} data-testid={`button-edit-shop-${shop.id}`}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-lg h-8 w-8" onClick={() => deleteMutation.mutate({ type: "shops", id: shop.id })} data-testid={`button-delete-shop-${shop.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredShops.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No shops found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
              )}

              <Dialog open={dialogOpen && activeTab === "shops"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">{editItem ? "Edit Shop" : "Add New Shop"}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-6 pb-2">
                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Info</p>
                      <div>
                        <Label className="text-sm">Shop Name *</Label>
                        <Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. Burger Bliss" data-testid="input-shop-name" />
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Textarea value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1.5 rounded-xl resize-none" rows={3} placeholder="Brief description of the shop..." />
                      </div>
                      <div>
                        <Label className="text-sm mb-2 block">Listing Type</Label>
                        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          {[
                            { value: "products", label: "Products Only" },
                            { value: "services", label: "Services Only" },
                            { value: "both", label: "Both" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setForm("listing_type", opt.value)}
                              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                                (formData as any).listing_type === opt.value || (!((formData as any).listing_type) && opt.value === "both")
                                  ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white"
                                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
                              }`}
                              data-testid={`button-listing-type-${opt.value}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search categories..."
                          value={catSearch}
                          onChange={e => setCatSearch(e.target.value)}
                          className="pl-8 rounded-xl text-sm h-9"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                        {categories
                          .filter(c => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()))
                          .map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setForm("category_id", cat.id)}
                              className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left border ${
                                formData.category_id === cat.id
                                  ? "bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25"
                                  : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                              }`}
                              data-testid={`cat-pick-${cat.id}`}
                            >
                              {cat.name}
                            </button>
                          ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact & Location</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">WhatsApp Number</Label>
                          <div className="relative mt-1.5">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">+91</span>
                            <Input
                              value={(formData.whatsapp_number || "").replace("+91", "")}
                              onChange={e => setForm("whatsapp_number", `+91${e.target.value.replace(/\D/g, "").slice(0, 10)}`)}
                              className="pl-10 rounded-xl"
                              placeholder="9876543210"
                              data-testid="input-shop-whatsapp"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Commission %</Label>
                          <Input type="number" min="0" max="100" value={formData.commission_percentage || ""} onChange={e => setForm("commission_percentage", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. 15" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Address</Label>
                        <Input value={formData.address || ""} onChange={e => setForm("address", e.target.value)} className="mt-1.5 rounded-xl" placeholder="Full address..." data-testid="input-shop-address" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Online Payment</p>
                      <div>
                        <Label className="text-sm">UPI ID / Payment ID</Label>
                        <Input value={(formData as any).payment_id || ""} onChange={e => setForm("payment_id", e.target.value)} className="mt-1.5 rounded-xl" placeholder="yourname@upi or UPI ID" data-testid="input-shop-payment-id" />
                        <p className="text-[11px] text-muted-foreground mt-1">e.g. shopname@okicici, 9876543210@ybl</p>
                      </div>
                      <div>
                        <Label className="text-sm">Payment QR Code</Label>
                        <div className="mt-1.5 flex flex-col gap-2">
                          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${qrUploading ? "opacity-60 pointer-events-none" : "border-blue-300 dark:border-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"}`} data-testid="input-shop-payment-qr">
                            {qrUploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Upload className="w-4 h-4 text-blue-500" />}
                            <span className="text-sm text-muted-foreground">{qrUploading ? "Uploading..." : "Click to upload QR image"}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload(f); e.target.value = ""; }} />
                          </label>
                          {(formData as any).payment_qr && (
                            <div className="flex items-center gap-3 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                              <img src={(formData as any).payment_qr} alt="QR Preview" className="w-16 h-16 object-contain rounded-lg shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-emerald-600 font-medium">QR uploaded ✓</p>
                                <p className="text-[11px] text-muted-foreground truncate">{(formData as any).payment_qr}</p>
                              </div>
                              <button type="button" onClick={() => setForm("payment_qr", "")} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors" title="Remove QR">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</p>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input value={formData.website_link || ""} onChange={e => setForm("website_link", e.target.value)} className="rounded-xl flex-1" placeholder="https://yourshop.com" data-testid="input-shop-website" />
                          {formData.website_link && (
                            <button type="button" onClick={() => window.open(formData.website_link, "_blank")} className="shrink-0 w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 flex items-center justify-center hover:bg-violet-100 transition-colors" title="Open website" data-testid="button-open-website">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Google Maps Link</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input value={formData.map_link || ""} onChange={e => setForm("map_link", e.target.value)} className="rounded-xl flex-1" placeholder="https://maps.google.com/..." data-testid="input-shop-map" />
                          {formData.map_link && (
                            <button type="button" onClick={() => window.open(formData.map_link, "_blank")} className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="Open map" data-testid="button-open-map">
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media</p>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Logo URL</Label>
                        <Input value={formData.logo || ""} onChange={e => setForm("logo", e.target.value)} className="mt-1.5 rounded-xl" placeholder="https://..." data-testid="input-shop-logo" />
                      </div>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Main Banner URL</Label>
                        <Input value={formData.banner_image || ""} onChange={e => setForm("banner_image", e.target.value)} className="mt-1.5 rounded-xl" placeholder="https://..." data-testid="input-shop-banner" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Extra Banners (Slideshow)</Label>
                          <button type="button" onClick={() => setShopBanners(b => [...b, ""])} className="text-[11px] text-blue-600 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20" data-testid="button-add-banner">+ Add Banner</button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {shopBanners.map((url, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <div className="relative flex-1">
                                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input value={url} onChange={e => setShopBanners(b => b.map((v, i) => i === idx ? e.target.value : v))} className="rounded-xl pl-8 text-sm" placeholder="https://banner-url.jpg" data-testid={`input-banner-url-${idx}`} />
                              </div>
                              {shopBanners.length > 1 && (
                                <button type="button" onClick={() => setShopBanners(b => b.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1 rounded-lg" data-testid={`button-remove-banner-${idx}`}>
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">These images appear as a slideshow on the shop page</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settings</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([
                          { key: "subscription_active", label: "Shop Live", desc: "Visible to customers",
                            onCls: "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20", textCls: "text-emerald-700 dark:text-emerald-400", trackCls: "bg-emerald-500" },
                          { key: "featured", label: "Top Shop", desc: "Show in top shops",
                            onCls: "border-violet-400 bg-violet-50 dark:bg-violet-900/20", textCls: "text-violet-700 dark:text-violet-400", trackCls: "bg-violet-500" },
                          { key: "is_premium", label: "Premium Vendor", desc: "Premium badge shown",
                            onCls: "border-amber-400 bg-amber-50 dark:bg-amber-900/20", textCls: "text-amber-700 dark:text-amber-400", trackCls: "bg-amber-500" },
                        ] as const).map(({ key, label, desc, onCls, textCls, trackCls }) => {
                          const checked = formData[key] ?? (key === "subscription_active");
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setForm(key, !checked)}
                              className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${checked ? onCls : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"}`}
                              data-testid={`toggle-${key}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold ${checked ? textCls : "text-gray-500"}`}>{label}</span>
                                <div className={`w-9 h-5 rounded-full transition-colors relative ${checked ? trackCls : "bg-gray-300 dark:bg-gray-600"}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground">{desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSave("shops")}
                      disabled={saveMutation.isPending || !formData.name}
                      className="w-full rounded-xl h-11 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 font-semibold"
                      data-testid="button-save-shop"
                    >
                      {saveMutation.isPending ? "Saving..." : editItem ? "Update Shop" : "Create Shop"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "products" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products & services..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-product-search" />
                  </div>
                  <Select value={filterShopId || "all"} onValueChange={v => setFilterShopId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-40 rounded-xl h-9" data-testid="select-filter-shop"><SelectValue placeholder="All shops" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shops</SelectItem>
                      {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openCreate({ type: "product" })} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 shrink-0" data-testid="button-create-product">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredProducts.map(prod => {
                      const isService = (prod as any).type === "service";
                      const firstImg = (prod as any).images?.[0] || prod.image;
                      return (
                        <div key={prod.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-product-${prod.id}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0 ${isService ? "bg-gradient-to-br from-blue-400 to-cyan-500" : "bg-gradient-to-br from-orange-400 to-red-500"}`}>
                              {firstImg ? <img src={firstImg} className="w-full h-full object-cover rounded-xl" alt="" onError={e => { (e.target as any).style.display = "none"; }} /> : prod.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{prod.name}</p>
                                <Badge className={`border-0 text-[10px] px-1.5 py-0 shrink-0 ${isService ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                                  {isService ? "Service" : "Product"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {prod.shop?.name}{prod.price ? ` · ₹${parseFloat(prod.price as string).toLocaleString()}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(prod)} data-testid={`button-edit-product-${prod.id}`}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "products", id: prod.id })} data-testid={`button-delete-product-${prod.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Dialog open={dialogOpen && activeTab === "products"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">{editItem ? "Edit" : "Add"} {formData.type === "service" ? "Service" : "Product"}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">

                    {/* Product / Service toggle */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {([
                          { value: "product", label: "Product", desc: "Physical item for sale", icon: "📦" },
                          { value: "service", label: "Service", desc: "Service or experience", icon: "⚡" },
                        ] as const).map(opt => {
                          const active = (formData.type || "product") === opt.value;
                          return (
                            <button key={opt.value} type="button" onClick={() => setForm("type", opt.value)} data-testid={`item-type-${opt.value}`}
                              className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 text-left transition-all ${active ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}>
                              <span className="text-base leading-none mb-1">{opt.icon}</span>
                              <span className={`text-xs font-bold ${active ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                              <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <Label className="text-xs font-semibold">{formData.type === "service" ? "Service" : "Product"} Name</Label>
                      <Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. Classic Cheeseburger" data-testid="input-product-name" />
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-xs font-semibold">Description</Label>
                      <Textarea value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1.5 rounded-xl resize-none" rows={2} placeholder="Brief description..." data-testid="input-product-description" />
                    </div>

                    {/* Price — products only */}
                    {formData.type !== "service" && (
                      <div>
                        <Label className="text-xs font-semibold">Price (₹)</Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                          <Input type="number" min="0" value={formData.price || ""} onChange={e => setForm("price", e.target.value)} className="rounded-xl pl-8" placeholder="e.g. 299" data-testid="input-product-price" />
                        </div>
                      </div>
                    )}

                    {/* Shop */}
                    <div>
                      <Label className="text-xs font-semibold">Shop</Label>
                      <Select value={formData.shop_id || ""} onValueChange={v => setForm("shop_id", v)}>
                        <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select shop" /></SelectTrigger>
                        <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* Image URLs — multiple */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-semibold">Image URLs</Label>
                        <button type="button" onClick={() => setProductImageUrls(u => [...u, ""])} className="text-[11px] text-blue-600 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20" data-testid="button-add-image-url">+ Add URL</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {productImageUrls.map((url, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <Input
                                value={url}
                                onChange={e => setProductImageUrls(u => u.map((v, i) => i === idx ? e.target.value : v))}
                                className="rounded-xl pl-8 text-sm"
                                placeholder="https://example.com/image.jpg"
                                data-testid={`input-image-url-${idx}`}
                              />
                            </div>
                            {productImageUrls.length > 1 && (
                              <button type="button" onClick={() => setProductImageUrls(u => u.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1 rounded-lg" data-testid={`button-remove-image-${idx}`}>
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Optional product-only fields */}
                    {formData.type !== "service" && (
                      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Optional Details</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs font-semibold">Grams</Label>
                            <Input value={formData.grams || ""} onChange={e => setForm("grams", e.target.value)} className="mt-1 rounded-xl text-sm h-8" placeholder="e.g. 250g" data-testid="input-product-grams" />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Quantity</Label>
                            <Input value={formData.quantity || ""} onChange={e => setForm("quantity", e.target.value)} className="mt-1 rounded-xl text-sm h-8" placeholder="e.g. 12 pcs" data-testid="input-product-quantity" />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Size</Label>
                            <Input value={formData.size || ""} onChange={e => setForm("size", e.target.value)} className="mt-1 rounded-xl text-sm h-8" placeholder="e.g. M / XL" data-testid="input-product-size" />
                          </div>
                        </div>
                      </div>
                    )}

                    <Button onClick={() => handleSave("products")} disabled={saveMutation.isPending} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 shadow-md shadow-blue-500/20 mt-1" data-testid="button-save-product">
                      {saveMutation.isPending ? "Saving..." : `Save ${formData.type === "service" ? "Service" : "Product"}`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "coupons" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={couponSearch} onChange={e => setCouponSearch(e.target.value)} placeholder="Search coupons or shops..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-coupon-search" />
                </div>
                <Button onClick={() => openCreate({ is_active: true, type: "percentage" })} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 shrink-0" data-testid="button-create-coupon">
                  <Plus className="w-4 h-4" /> Add Coupon
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredCoupons.map(coupon => {
                      const typeLabel: Record<string, string> = {
                        percentage: `${coupon.value}% off`,
                        flat: `₹${coupon.value} off`,
                        bundle: "Bundle deal",
                        free_item: "Free item",
                        flash: "Flash sale",
                      };
                      return (
                        <div key={coupon.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-coupon-${coupon.id}`}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="font-bold text-sm bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">{coupon.code}</code>
                              <Badge className={`border-0 text-[11px] ${coupon.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600"}`}>
                                {coupon.is_active ? "Live" : "Inactive"}
                              </Badge>
                              {(coupon as any).featured && (
                                <Badge className="border-0 text-[11px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">Top</Badge>
                              )}
                              <Badge className="border-0 text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">{coupon.type?.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {typeLabel[coupon.type] || coupon.type} &middot; {coupon.shop?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(coupon)} data-testid={`button-edit-coupon-${coupon.id}`}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "coupons", id: coupon.id })} data-testid={`button-delete-coupon-${coupon.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Dialog open={dialogOpen && activeTab === "coupons"} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="text-lg font-bold">{editItem ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-5 pb-2">

                    {/* Coupon Type Selector — 3 types */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coupon Type</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {([
                          { value: "percentage", label: "% Discount", desc: "Percentage off", icon: "%" },
                          { value: "flat", label: "₹ Flat Off", desc: "Fixed amount off", icon: "₹" },
                          { value: "free_item", label: "Free Item", desc: "Add free item to cart", icon: "🎁" },
                        ] as const).map(opt => {
                          const active = (formData.type || "percentage") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setForm("type", opt.value)}
                              data-testid={`coupon-type-${opt.value}`}
                              className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 text-left transition-all ${active ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
                            >
                              <span className="text-base leading-none mb-1">{opt.icon}</span>
                              <span className={`text-[11px] font-bold ${active ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                              <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Code & Shop */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Coupon Code</Label>
                        <Input value={formData.code || ""} onChange={e => setForm("code", e.target.value.toUpperCase())} className="mt-1.5 rounded-xl font-mono uppercase" placeholder="e.g. SAVE20" data-testid="input-coupon-code" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Shop</Label>
                        <Select value={formData.shop_id || ""} onValueChange={v => { setForm("shop_id", v); setBundleItems([]); setCouponProdSearch(""); }}>
                          <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select shop" /></SelectTrigger>
                          <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Percentage discount value */}
                    {(formData.type === "percentage" || !formData.type) && (
                      <div>
                        <Label className="text-xs font-semibold">Discount Percentage (%)</Label>
                        <div className="relative mt-1.5">
                          <Input type="number" min="1" max="100" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className="rounded-xl pr-10" placeholder="e.g. 20" data-testid="input-coupon-value-percent" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                        </div>
                      </div>
                    )}

                    {/* Flat discount value */}
                    {formData.type === "flat" && (
                      <div>
                        <Label className="text-xs font-semibold">Discount Amount (₹)</Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                          <Input type="number" min="1" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className="rounded-xl pl-8" placeholder="e.g. 100" data-testid="input-coupon-value-flat" />
                        </div>
                      </div>
                    )}

                    {/* Free item picker — specific to free_item type */}
                    {formData.type === "free_item" && (
                      <div className="flex flex-col gap-3">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Free Item</Label>
                        {!formData.shop_id ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">Select a shop first</p>
                        ) : (
                          <>
                            <Input placeholder="Search products..." value={couponProdSearch} onChange={e => setCouponProdSearch(e.target.value)} className="rounded-xl h-8 text-xs" data-testid="input-free-product-search" />
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                              {products
                                .filter(p => p.shop_id === formData.shop_id && (!couponProdSearch || p.name.toLowerCase().includes(couponProdSearch.toLowerCase())))
                                .map(p => {
                                  const selected = formData.free_item_product_id === p.id;
                                  return (
                                    <button key={p.id} type="button" onClick={() => setForm("free_item_product_id", selected ? null : p.id)} data-testid={`free-item-product-${p.id}`}
                                      className={`flex items-center justify-between p-2.5 rounded-xl border-2 text-left w-full transition-all ${selected ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                      </div>
                                      {selected && <Badge className="bg-emerald-500 text-white border-0 text-[10px]">FREE ✓</Badge>}
                                    </button>
                                  );
                                })}
                              {products.filter(p => p.shop_id === formData.shop_id).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No products in this shop</p>}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Optional Products Section — available for ALL coupon types */}
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">📦 Attach Products / Services <span className="text-[10px] font-normal text-muted-foreground ml-1">Optional</span></p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">When user claims this coupon, selected products auto-add to cart. If none selected, normal offer applies.</p>
                        </div>
                      </div>
                      {!formData.shop_id ? (
                        <p className="text-xs text-muted-foreground italic">Select a shop above to attach products</p>
                      ) : (
                        <>
                          <Input
                            placeholder="Search products to attach..."
                            value={couponProdSearch}
                            onChange={e => setCouponProdSearch(e.target.value)}
                            className="rounded-xl h-8 text-xs"
                            data-testid="input-attach-product-search"
                          />
                          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                            {products
                              .filter(p => p.shop_id === formData.shop_id)
                              .filter(p => !couponProdSearch || p.name.toLowerCase().includes(couponProdSearch.toLowerCase()))
                              .map(p => {
                                const attached = bundleItems.some(b => b.product_id === p.id);
                                return (
                                  <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${attached ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700"}`} data-testid={`attach-product-${p.id}`}>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                      <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                    </div>
                                    {attached ? (
                                      <button type="button" onClick={() => setBundleItems(prev => prev.filter(b => b.product_id !== p.id))} className="text-[11px] text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">Remove</button>
                                    ) : (
                                      <button type="button" onClick={() => setBundleItems(prev => [...prev, { product_id: p.id, custom_price: p.price ? p.price.toString() : "0", name: p.name }])} className="text-[11px] text-blue-600 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20">Add</button>
                                    )}
                                  </div>
                                );
                              })}
                            {products.filter(p => p.shop_id === formData.shop_id).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No products in this shop</p>}
                          </div>
                          {bundleItems.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <p className="text-[11px] font-semibold text-muted-foreground">Attached ({bundleItems.length}) — set offer prices:</p>
                              {bundleItems.map((item, idx) => (
                                <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border border-blue-200 dark:border-blue-800">
                                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{item.name}</span>
                                  <div className="relative w-24 shrink-0">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                                    <Input type="number" value={item.custom_price} onChange={e => setBundleItems(prev => prev.map((b, i) => i === idx ? { ...b, custom_price: e.target.value } : b))} className="h-7 text-xs rounded-lg pl-5 pr-1" data-testid={`input-attach-price-${item.product_id}`} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <Label className="text-xs font-semibold">Expiry Date (optional)</Label>
                      <Input type="date" value={formData.expiry_date ? new Date(formData.expiry_date).toISOString().split("T")[0] : ""} onChange={e => setForm("expiry_date", e.target.value || null)} className="mt-1.5 rounded-xl" data-testid="input-coupon-expiry" />
                    </div>

                    {/* Toggles */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Settings</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { key: "is_active", label: "Live Coupon", desc: "Visible to users",
                            onCls: "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20", textCls: "text-emerald-700 dark:text-emerald-400", trackCls: "bg-emerald-500" },
                          { key: "featured", label: "Top Coupon", desc: "Show in top coupons",
                            onCls: "border-violet-400 bg-violet-50 dark:bg-violet-900/20", textCls: "text-violet-700 dark:text-violet-400", trackCls: "bg-violet-500" },
                        ] as const).map(({ key, label, desc, onCls, textCls, trackCls }) => {
                          const checked = key === "is_active" ? (formData[key] ?? true) : (formData[key] ?? false);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setForm(key, !checked)}
                              data-testid={`toggle-coupon-${key}`}
                              className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${checked ? onCls : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold ${checked ? textCls : "text-gray-500"}`}>{label}</span>
                                <div className={`w-9 h-5 rounded-full transition-colors relative ${checked ? trackCls : "bg-gray-300 dark:bg-gray-600"}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground">{desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSave("coupons")}
                      disabled={saveMutation.isPending || !formData.code || !formData.shop_id}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 h-11 font-semibold"
                      data-testid="button-save-coupon"
                    >
                      {saveMutation.isPending ? "Saving..." : editItem ? "Update Coupon" : "Create Coupon"}
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

          {activeTab === "banners" && <BannersTab toast={toast} allCoupons={coupons} />}

        </main>
      </div>
    </div>
  );
}

function BannersTab({ toast, allCoupons }: { toast: any; allCoupons: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<any>(null);
  const [form, setForm] = useState({ title: "", image_url: "", coupon_id: "", sort_order: "0", is_active: true });
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/banners"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editBanner) return apiRequest("PUT", `/api/admin/banners/${editBanner.id}`, data);
      return apiRequest("POST", "/api/admin/banners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: editBanner ? "Banner updated" : "Banner created" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Banner deleted" });
    },
  });

  const openAdd = () => {
    setEditBanner(null);
    setForm({ title: "", image_url: "", coupon_id: "", sort_order: "0", is_active: true });
    setImageMode("url");
    setDialogOpen(true);
  };

  const openEdit = (b: any) => {
    setEditBanner(b);
    setForm({ title: b.title, image_url: b.image_url, coupon_id: b.coupon_id || "", sort_order: String(b.sort_order), is_active: b.is_active });
    setImageMode("url");
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const token = localStorage.getItem("coupons_hub_token");
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url) setForm(f => ({ ...f, image_url: data.url }));
      else toast({ title: "Upload failed", variant: "destructive" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.image_url.trim()) {
      toast({ title: "Title and image are required", variant: "destructive" }); return;
    }
    saveMutation.mutate({
      title: form.title,
      image_url: form.image_url,
      coupon_id: form.coupon_id || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    });
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Banners</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage homepage coupon banners</p>
        </div>
        <Button onClick={openAdd} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white gap-2" data-testid="button-add-banner">
          <Plus className="w-4 h-4" /> Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No banners yet. Add your first banner!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900" data-testid={`card-banner-${b.id}`}>
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.is_active ? "bg-emerald-500 text-white" : "bg-gray-400 text-white"}`}>
                    {b.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{b.title}</p>
                {b.coupon && (
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5 flex items-center gap-1">
                    <Ticket className="w-3 h-3" /> {b.coupon.code} — {b.coupon.type === "percentage" ? `${b.coupon.value}% OFF` : b.coupon.type === "flat" ? `₹${b.coupon.value} OFF` : "Free Item"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Order: {b.sort_order}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="rounded-xl h-8 flex-1 gap-1.5" data-testid={`button-edit-banner-${b.id}`}>
                    <Edit className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(b.id)} className="rounded-xl h-8 text-red-500 hover:text-red-600 border-red-200" data-testid={`button-delete-banner-${b.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editBanner ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Summer Sale 50% OFF" className="rounded-xl" data-testid="input-banner-title" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Banner Image</Label>
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button onClick={() => setImageMode("url")} className={`flex-1 py-2 text-sm font-medium transition-colors ${imageMode === "url" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"}`} data-testid="button-image-mode-url">
                  URL
                </button>
                <button onClick={() => setImageMode("file")} className={`flex-1 py-2 text-sm font-medium transition-colors ${imageMode === "file" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"}`} data-testid="button-image-mode-file">
                  Upload File
                </button>
              </div>
              {imageMode === "url" ? (
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className="rounded-xl" data-testid="input-banner-image-url" />
              ) : (
                <div className="flex flex-col gap-2">
                  <label className={`flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-400 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`} data-testid="input-banner-file">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload image"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {form.image_url && <p className="text-xs text-emerald-600 truncate">Uploaded: {form.image_url}</p>}
                </div>
              )}
              {form.image_url && (
                <div className="rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Link to Coupon (optional)</Label>
              <Select value={form.coupon_id || "none"} onValueChange={v => setForm(f => ({ ...f, coupon_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="rounded-xl" data-testid="select-banner-coupon">
                  <SelectValue placeholder="No coupon linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No coupon</SelectItem>
                  {allCoupons.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.type === "percentage" ? `${c.value}% OFF` : c.type === "flat" ? `₹${c.value} OFF` : "Free Item"} ({c.shop?.name || "No shop"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="rounded-xl" data-testid="input-banner-sort" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.is_active ? "active" : "hidden"} onValueChange={v => setForm(f => ({ ...f, is_active: v === "active" }))}>
                  <SelectTrigger className="rounded-xl" data-testid="select-banner-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white" data-testid="button-save-banner">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editBanner ? "Save Changes" : "Create Banner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
