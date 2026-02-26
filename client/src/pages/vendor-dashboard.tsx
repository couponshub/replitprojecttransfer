import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store, Package, Ticket, LogOut, Plus, Edit, Trash2, Save,
  Zap, Tag, Phone, MapPin, Globe, X, Check, ChevronRight
} from "lucide-react";

type VTab = "shop" | "products" | "coupons";

function getVendorToken() {
  return localStorage.getItem("vendor_token");
}

function vendorHeaders() {
  const token = getVendorToken();
  return token ? { "x-vendor-token": token } : {};
}

async function vendorFetch(url: string, options?: RequestInit) {
  const token = getVendorToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-vendor-token": token } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export default function VendorDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<VTab>("shop");
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth check
  useEffect(() => {
    const token = getVendorToken();
    if (!token) { navigate("/login"); return; }
    vendorFetch("/api/vendor/me")
      .then(v => { setVendorInfo(v); setAuthChecked(true); })
      .catch(() => { localStorage.removeItem("vendor_token"); navigate("/login"); });
  }, []);

  // Shop
  const { data: shop, isLoading: shopLoading, refetch: refetchShop } = useQuery<any>({
    queryKey: ["/api/vendor/shop"],
    queryFn: () => vendorFetch("/api/vendor/shop"),
    enabled: authChecked,
  });

  const [shopForm, setShopForm] = useState<any>({});
  const [shopEditing, setShopEditing] = useState(false);

  useEffect(() => {
    if (shop) setShopForm({ ...shop });
  }, [shop]);

  const saveShopMutation = useMutation({
    mutationFn: (data: any) => vendorFetch("/api/vendor/shop", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Shop updated!" }); setShopEditing(false); refetchShop(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  // Products
  const { data: products = [], isLoading: prodsLoading, refetch: refetchProds } = useQuery<any[]>({
    queryKey: ["/api/vendor/products"],
    queryFn: () => vendorFetch("/api/vendor/products"),
    enabled: authChecked,
  });

  const [prodDialog, setProdDialog] = useState(false);
  const [editProd, setEditProd] = useState<any>(null);
  const [prodForm, setProdForm] = useState<any>({ name: "", price: "", description: "", type: "product" });

  const saveProdMutation = useMutation({
    mutationFn: (data: any) => editProd
      ? vendorFetch(`/api/vendor/products/${editProd.id}`, { method: "PATCH", body: JSON.stringify(data) })
      : vendorFetch("/api/vendor/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: editProd ? "Product updated!" : "Product added!" }); setProdDialog(false); setEditProd(null); setProdForm({ name: "", price: "", description: "", type: "product" }); refetchProds(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteProdMutation = useMutation({
    mutationFn: (id: string) => vendorFetch(`/api/vendor/products/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); refetchProds(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  // Coupons
  const { data: coupons = [], isLoading: couponsLoading, refetch: refetchCoupons } = useQuery<any[]>({
    queryKey: ["/api/vendor/coupons"],
    queryFn: () => vendorFetch("/api/vendor/coupons"),
    enabled: authChecked,
  });

  const [couponDialog, setCouponDialog] = useState(false);
  const [editCoupon, setEditCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState<any>({ code: "", type: "percentage", value: "", is_active: true });

  const saveCouponMutation = useMutation({
    mutationFn: (data: any) => editCoupon
      ? vendorFetch(`/api/vendor/coupons/${editCoupon.id}`, { method: "PATCH", body: JSON.stringify(data) })
      : vendorFetch("/api/vendor/coupons", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: editCoupon ? "Coupon updated!" : "Coupon added!" }); setCouponDialog(false); setEditCoupon(null); setCouponForm({ code: "", type: "percentage", value: "", is_active: true }); refetchCoupons(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => vendorFetch(`/api/vendor/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); refetchCoupons(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleLogout = async () => {
    await fetch("/api/vendor/logout", { method: "POST" });
    localStorage.removeItem("vendor_token");
    navigate("/login");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const NAV = [
    { id: "shop" as VTab, label: "My Shop", icon: Store },
    { id: "products" as VTab, label: "Products", icon: Package },
    { id: "coupons" as VTab, label: "Coupons", icon: Ticket },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 py-6 px-4 gap-2">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">Vendor Panel</p>
            <p className="text-[11px] text-muted-foreground truncate">{vendorInfo?.email}</p>
          </div>
        </div>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            data-testid={`vendor-nav-${item.id}`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
        <div className="mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 w-full transition-all" data-testid="vendor-logout">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm flex-1">Vendor Panel</span>
          <div className="flex gap-1">
            {NAV.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`p-2 rounded-lg transition-colors ${tab === item.id ? "bg-emerald-500 text-white" : "text-gray-500"}`}>
                <item.icon className="w-4 h-4" />
              </button>
            ))}
            <button onClick={handleLogout} className="p-2 rounded-lg text-red-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* ── Shop Tab ── */}
          {tab === "shop" && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Shop</h1>
                  <p className="text-sm text-muted-foreground">View and update your shop details</p>
                </div>
                {!shopEditing ? (
                  <Button size="sm" onClick={() => setShopEditing(true)} className="rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 border-0" data-testid="button-edit-shop">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShopEditing(false); setShopForm({ ...shop }); }} className="rounded-xl">Cancel</Button>
                    <Button size="sm" onClick={() => saveShopMutation.mutate(shopForm)} disabled={saveShopMutation.isPending} className="rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 border-0" data-testid="button-save-shop">
                      <Save className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                )}
              </div>

              {shopLoading ? (
                <div className="flex flex-col gap-4">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : shop && (
                <Card className="border-0 shadow-lg rounded-2xl">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {shop.name?.[0]}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white">{shop.name}</h2>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Active Shop</Badge>
                      </div>
                    </div>

                    {shopEditing ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Shop Name</Label>
                            <Input value={shopForm.name || ""} onChange={e => setShopForm((f: any) => ({ ...f, name: e.target.value }))} className="mt-1.5 rounded-xl" data-testid="input-vendor-shop-name" />
                          </div>
                          <div>
                            <Label className="text-sm">WhatsApp Number</Label>
                            <Input value={shopForm.whatsapp_number || ""} onChange={e => setShopForm((f: any) => ({ ...f, whatsapp_number: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="+91..." data-testid="input-vendor-whatsapp" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Description</Label>
                          <Textarea value={shopForm.description || ""} onChange={e => setShopForm((f: any) => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={3} />
                        </div>
                        <div>
                          <Label className="text-sm">Address</Label>
                          <Input value={shopForm.address || ""} onChange={e => setShopForm((f: any) => ({ ...f, address: e.target.value }))} className="mt-1.5 rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Website</Label>
                            <Input value={shopForm.website_link || ""} onChange={e => setShopForm((f: any) => ({ ...f, website_link: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="https://..." />
                          </div>
                          <div>
                            <Label className="text-sm">UPI / Payment ID</Label>
                            <Input value={shopForm.payment_id || ""} onChange={e => setShopForm((f: any) => ({ ...f, payment_id: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="name@upi" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">{shop.description || "No description set"}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {shop.address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span>{shop.address}</span>
                            </div>
                          )}
                          {shop.whatsapp_number && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{shop.whatsapp_number}</span>
                            </div>
                          )}
                          {shop.website_link && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe className="w-4 h-4 shrink-0" />
                              <span>{shop.website_link}</span>
                            </div>
                          )}
                          {shop.payment_id && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Tag className="w-4 h-4 shrink-0" />
                              <span>{shop.payment_id}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-800">
                          {shop.is_premium && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Premium</Badge>}
                          {shop.featured && <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">Featured</Badge>}
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{shop.listing_type === "products" ? "Products" : shop.listing_type === "services" ? "Services" : "Products & Services"}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{shop.commission_percentage}% commission</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Products Tab ── */}
          {tab === "products" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Products</h1>
                  <p className="text-sm text-muted-foreground">{products.length} item{products.length !== 1 ? "s" : ""}</p>
                </div>
                <Button size="sm" onClick={() => { setEditProd(null); setProdForm({ name: "", price: "", description: "", type: "product" }); setProdDialog(true); }} className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 border-0" data-testid="button-add-product">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              {prodsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No products yet. Add your first one!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((prod: any) => (
                    <Card key={prod.id} className="border-0 shadow-md rounded-2xl overflow-hidden" data-testid={`card-product-${prod.id}`}>
                      <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-600" />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {prod.image || (prod.images && prod.images[0]) ? (
                            <img src={prod.image || prod.images[0]} alt={prod.name} className="w-12 h-12 rounded-xl object-cover shrink-0" onError={e => { (e.target as any).style.display = "none"; }} />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center text-xl shrink-0">
                              {prod.name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{prod.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{prod.description}</p>
                            <p className="text-sm font-bold text-emerald-600 mt-1">₹{prod.price}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-0 text-[10px]">{prod.type}</Badge>
                          <div className="ml-auto flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => { setEditProd(prod); setProdForm({ name: prod.name, price: prod.price, description: prod.description || "", type: prod.type || "product" }); setProdDialog(true); }} data-testid={`button-edit-product-${prod.id}`}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => deleteProdMutation.mutate(prod.id)} data-testid={`button-delete-product-${prod.id}`}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Dialog open={prodDialog} onOpenChange={v => { setProdDialog(v); if (!v) { setEditProd(null); setProdForm({ name: "", price: "", description: "", type: "product" }); } }}>
                <DialogContent className="rounded-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editProd ? "Edit Product" : "Add Product"}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">
                    <div>
                      <Label className="text-sm">Name *</Label>
                      <Input value={prodForm.name} onChange={e => setProdForm((f: any) => ({ ...f, name: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Product name" data-testid="input-prod-name" />
                    </div>
                    <div>
                      <Label className="text-sm">Price (₹) *</Label>
                      <Input type="number" value={prodForm.price} onChange={e => setProdForm((f: any) => ({ ...f, price: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="e.g. 299" data-testid="input-prod-price" />
                    </div>
                    <div>
                      <Label className="text-sm">Description</Label>
                      <Textarea value={prodForm.description} onChange={e => setProdForm((f: any) => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={3} />
                    </div>
                    <div>
                      <Label className="text-sm">Type</Label>
                      <Select value={prodForm.type} onValueChange={v => setProdForm((f: any) => ({ ...f, type: v }))}>
                        <SelectTrigger className="mt-1.5 rounded-xl" data-testid="select-prod-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => saveProdMutation.mutate(prodForm)} disabled={saveProdMutation.isPending || !prodForm.name || !prodForm.price} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0" data-testid="button-save-product">
                      {saveProdMutation.isPending ? "Saving..." : editProd ? "Update Product" : "Add Product"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ── Coupons Tab ── */}
          {tab === "coupons" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Coupons</h1>
                  <p className="text-sm text-muted-foreground">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""}</p>
                </div>
                <Button size="sm" onClick={() => { setEditCoupon(null); setCouponForm({ code: "", type: "percentage", value: "", is_active: true }); setCouponDialog(true); }} className="rounded-xl gap-2 bg-gradient-to-r from-pink-500 to-rose-600 border-0" data-testid="button-add-coupon">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              {couponsLoading ? (
                <div className="flex flex-col gap-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Ticket className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No coupons yet. Add your first one!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {coupons.map((coupon: any) => (
                    <Card key={coupon.id} className="border-0 shadow-md rounded-2xl" data-testid={`card-coupon-${coupon.id}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {coupon.type === "percentage" ? "%" : "₹"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900 dark:text-white font-mono">{coupon.code}</p>
                            <Badge className={`border-0 text-[10px] ${coupon.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {coupon.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {coupon.type === "percentage" ? `${coupon.value}% off` : coupon.type === "flat" ? `₹${coupon.value} off` : coupon.type}
                            {coupon.expiry_date && ` · Expires ${new Date(coupon.expiry_date).toLocaleDateString("en-IN")}`}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => { setEditCoupon(coupon); setCouponForm({ code: coupon.code, type: coupon.type, value: coupon.value, is_active: coupon.is_active, expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().split("T")[0] : "" }); setCouponDialog(true); }} data-testid={`button-edit-coupon-${coupon.id}`}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => deleteCouponMutation.mutate(coupon.id)} data-testid={`button-delete-coupon-${coupon.id}`}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Dialog open={couponDialog} onOpenChange={v => { setCouponDialog(v); if (!v) { setEditCoupon(null); setCouponForm({ code: "", type: "percentage", value: "", is_active: true }); } }}>
                <DialogContent className="rounded-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editCoupon ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">
                    <div>
                      <Label className="text-sm">Coupon Code *</Label>
                      <Input value={couponForm.code} onChange={e => setCouponForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} className="mt-1.5 rounded-xl font-mono" placeholder="e.g. SAVE20" data-testid="input-coupon-code" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Type *</Label>
                        <Select value={couponForm.type} onValueChange={v => setCouponForm((f: any) => ({ ...f, type: v }))}>
                          <SelectTrigger className="mt-1.5 rounded-xl" data-testid="select-coupon-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage %</SelectItem>
                            <SelectItem value="flat">Flat ₹</SelectItem>
                            <SelectItem value="free_item">Free Item</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Value</Label>
                        <Input type="number" value={couponForm.value} onChange={e => setCouponForm((f: any) => ({ ...f, value: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="0" data-testid="input-coupon-value" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Expiry Date</Label>
                      <Input type="date" value={couponForm.expiry_date || ""} onChange={e => setCouponForm((f: any) => ({ ...f, expiry_date: e.target.value }))} className="mt-1.5 rounded-xl" />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCouponForm((f: any) => ({ ...f, is_active: !f.is_active }))}
                        className={`w-10 h-6 rounded-full transition-colors flex items-center ${couponForm.is_active ? "bg-emerald-500 justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"}`}
                        data-testid="toggle-coupon-active"
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
                      </button>
                      <Label className="text-sm">Active</Label>
                    </div>
                    <Button onClick={() => saveCouponMutation.mutate(couponForm)} disabled={saveCouponMutation.isPending || !couponForm.code} className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 border-0" data-testid="button-save-coupon">
                      {saveCouponMutation.isPending ? "Saving..." : editCoupon ? "Update Coupon" : "Add Coupon"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
