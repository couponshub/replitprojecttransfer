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
  Zap, Star, Check, X, Menu
} from "lucide-react";
import type { Category, Shop, Product, Coupon, Order, User } from "@shared/schema";

type Tab = "overview" | "categories" | "shops" | "products" | "coupons" | "orders";

const NAV_ITEMS = [
  { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
  { id: "categories" as Tab, label: "Categories", icon: Tag },
  { id: "shops" as Tab, label: "Shops", icon: Store },
  { id: "products" as Tab, label: "Products", icon: Package },
  { id: "coupons" as Tab, label: "Coupons", icon: Ticket },
  { id: "orders" as Tab, label: "Orders", icon: ShoppingBag },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

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

  const { data: stats } = useQuery<{ users: number; categories: number; shops: number; products: number; orders: number }>({
    queryKey: ["/api/admin/stats"],
  });
  const { data: recentOrders = [] } = useQuery<(Order & { user?: User })[]>({
    queryKey: ["/api/admin/recent-orders"],
  });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: shops = [] } = useQuery<(Shop & { category?: Category })[]>({ queryKey: ["/api/shops"] });
  const { data: products = [] } = useQuery<(Product & { shop?: Shop })[]>({ queryKey: ["/api/products"] });
  const { data: coupons = [] } = useQuery<(Coupon & { shop?: Shop })[]>({ queryKey: ["/api/coupons"] });
  const { data: orders = [] } = useQuery<(Order & { user?: User })[]>({ queryKey: ["/api/orders"] });

  const openCreate = (defaults: any = {}) => {
    setEditItem(null);
    setFormData(defaults);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormData({ ...item });
    setDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      apiRequest("DELETE", `/api/${type}/${id}`),
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
      setDialogOpen(false);
      toast({ title: editItem ? "Updated successfully" : "Created successfully" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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

  const setForm = (key: string, value: any) => setFormData((f: any) => ({ ...f, [key]: value }));

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-white leading-none">CouponsHub X</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-400"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => { await logout(); navigate("/login"); }}
          className="w-full gap-2 text-muted-foreground justify-start"
          data-testid="button-admin-logout"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/home")}
          className="w-full gap-2 text-muted-foreground justify-start"
        >
          <ChevronRight className="w-4 h-4" /> View Marketplace
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-4 shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 bg-white dark:bg-gray-900 p-4 flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" data-testid="button-mobile-menu">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-gray-900 dark:text-white capitalize">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-0 hidden sm:flex">Admin</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Users", value: stats?.users, icon: Users, color: "from-blue-500 to-cyan-500" },
                  { label: "Categories", value: stats?.categories, icon: Tag, color: "from-violet-500 to-purple-500" },
                  { label: "Shops", value: stats?.shops, icon: Store, color: "from-emerald-500 to-teal-500" },
                  { label: "Products", value: stats?.products, icon: Package, color: "from-orange-500 to-red-500" },
                  { label: "Orders", value: stats?.orders, icon: ShoppingBag, color: "from-pink-500 to-rose-500" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={i} className="rounded-2xl border-0 shadow-md" data-testid={`stat-${stat.label.toLowerCase()}`}>
                      <CardContent className="p-4">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stat.value ?? <Skeleton className="h-8 w-12" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader className="pb-4 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {recentOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between py-3 gap-4" data-testid={`row-order-${order.id}`}>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{order.user?.name || "Unknown"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${STATUS_COLORS[order.status]} border-0 text-xs capitalize`}>{order.status}</Badge>
                          <span className="font-bold text-sm text-gray-900 dark:text-white">₹{parseFloat(order.final_amount as string).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {recentOrders.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No orders yet</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2" data-testid="button-create-category">
                  <Plus className="w-4 h-4" /> Add Category
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-5 py-4 gap-4" data-testid={`row-category-${cat.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-lg">
                            📁
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ type: "categories", id: cat.id })} data-testid={`button-delete-category-${cat.id}`}>
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
                    <div><Label>Name</Label><Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1" data-testid="input-category-name" /></div>
                    <div><Label>Image URL</Label><Input value={formData.image || ""} onChange={e => setForm("image", e.target.value)} className="mt-1" /></div>
                    <Button onClick={() => handleSave("categories")} disabled={saveMutation.isPending} className="rounded-xl" data-testid="button-save-category">
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
                  <SelectTrigger className="w-44 rounded-xl" data-testid="select-filter-category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2" data-testid="button-create-shop">
                  <Plus className="w-4 h-4" /> Add Shop
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredShops.map(shop => (
                      <div key={shop.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap" data-testid={`row-shop-${shop.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold">
                            {shop.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 dark:text-white">{shop.name}</span>
                              {shop.is_premium && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs gap-1"><Crown className="w-3 h-3" /> Premium</Badge>}
                              {shop.featured && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Featured</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{shop.category?.name || "No category"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePremium(shop)}
                            className={`rounded-xl text-xs gap-1 ${shop.is_premium ? "border-amber-300 text-amber-600" : ""}`}
                            data-testid={`button-premium-${shop.id}`}
                          >
                            <Crown className="w-3 h-3" /> {shop.is_premium ? "Remove Premium" : "Make Premium"}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(shop)} data-testid={`button-edit-shop-${shop.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ type: "shops", id: shop.id })} data-testid={`button-delete-shop-${shop.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                    <div className="col-span-2"><Label>Name</Label><Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1" data-testid="input-shop-name" /></div>
                    <div className="col-span-2"><Label>Description</Label><Input value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1" /></div>
                    <div><Label>Address</Label><Input value={formData.address || ""} onChange={e => setForm("address", e.target.value)} className="mt-1" /></div>
                    <div><Label>WhatsApp</Label><Input value={formData.whatsapp_number || ""} onChange={e => setForm("whatsapp_number", e.target.value)} className="mt-1" /></div>
                    <div><Label>Category</Label>
                      <Select value={formData.category_id || ""} onValueChange={v => setForm("category_id", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Commission %</Label><Input type="number" value={formData.commission_percentage || ""} onChange={e => setForm("commission_percentage", e.target.value)} className="mt-1" /></div>
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" id="featured" checked={formData.featured || false} onChange={e => setForm("featured", e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" id="is_premium" checked={formData.is_premium || false} onChange={e => setForm("is_premium", e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="is_premium">Premium</Label>
                    </div>
                  </div>
                  <Button onClick={() => handleSave("shops")} disabled={saveMutation.isPending} className="rounded-xl mt-2" data-testid="button-save-shop">
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
                  <SelectTrigger className="w-44 rounded-xl" data-testid="select-filter-shop">
                    <SelectValue placeholder="All shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Shops</SelectItem>
                    {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2" data-testid="button-create-product">
                  <Plus className="w-4 h-4" /> Add Product
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredProducts.map(prod => (
                      <div key={prod.id} className="flex items-center justify-between px-5 py-4 gap-4" data-testid={`row-product-${prod.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg">{prod.name[0]}</div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{prod.name}</p>
                            <p className="text-xs text-muted-foreground">{prod.shop?.name} • ₹{parseFloat(prod.price as string).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(prod)} data-testid={`button-edit-product-${prod.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ type: "products", id: prod.id })} data-testid={`button-delete-product-${prod.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                    <div><Label>Name</Label><Input value={formData.name || ""} onChange={e => setForm("name", e.target.value)} className="mt-1" data-testid="input-product-name" /></div>
                    <div><Label>Description</Label><Input value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1" /></div>
                    <div><Label>Price (₹)</Label><Input type="number" value={formData.price || ""} onChange={e => setForm("price", e.target.value)} className="mt-1" /></div>
                    <div><Label>Shop</Label>
                      <Select value={formData.shop_id || ""} onValueChange={v => setForm("shop_id", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select shop" /></SelectTrigger>
                        <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => handleSave("products")} disabled={saveMutation.isPending} className="rounded-xl" data-testid="button-save-product">
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
                <Button onClick={() => openCreate({ is_active: true, type: "percentage" })} size="sm" className="rounded-xl gap-2" data-testid="button-create-coupon">
                  <Plus className="w-4 h-4" /> Add Coupon
                </Button>
              </div>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {coupons.map(coupon => (
                      <div key={coupon.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap" data-testid={`row-coupon-${coupon.id}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="font-bold text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{coupon.code}</code>
                            <Badge className={`border-0 text-xs capitalize ${coupon.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                              {coupon.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`} • {coupon.shop?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(coupon)} data-testid={`button-edit-coupon-${coupon.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ type: "coupons", id: coupon.id })} data-testid={`button-delete-coupon-${coupon.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                    <div><Label>Code</Label><Input value={formData.code || ""} onChange={e => setForm("code", e.target.value.toUpperCase())} className="mt-1 font-mono" data-testid="input-coupon-code" /></div>
                    <div><Label>Type</Label>
                      <Select value={formData.type || "percentage"} onValueChange={v => setForm("type", v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="free_item">Free Item</SelectItem>
                          <SelectItem value="flash">Flash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Value</Label><Input type="number" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className="mt-1" /></div>
                    <div><Label>Shop</Label>
                      <Select value={formData.shop_id || ""} onValueChange={v => setForm("shop_id", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select shop" /></SelectTrigger>
                        <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_active" checked={formData.is_active ?? true} onChange={e => setForm("is_active", e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <Button onClick={() => handleSave("coupons")} disabled={saveMutation.isPending} className="rounded-xl" data-testid="button-save-coupon">
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="flex flex-col gap-4">
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {orders.map(order => (
                      <div key={order.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap" data-testid={`row-order-${order.id}`}>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{order.user?.name || "Unknown"} • {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">₹{parseFloat(order.final_amount as string).toLocaleString()}</span>
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
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No orders yet</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
