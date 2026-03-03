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
  Globe, MapPin, Wifi, WifiOff, Search, Image, Link, ExternalLink, Upload, Loader2, Eye, EyeOff,
  Download, RefreshCw, ArrowUpAZ, ArrowDownAZ, Settings, MessageCircle, Save, Trophy, Gift
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Shop, Product, Coupon, Order, User, OrderItem } from "@shared/schema";

type Tab = "overview" | "categories" | "shops" | "products" | "coupons" | "orders" | "users" | "vendors" | "top-shops" | "top-coupons" | "banners" | "offline-coupons" | "contests" | "settings";

const NAV_ITEMS: { id: Tab; label: string; icon: any; section?: string }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, section: "Main" },
  { id: "categories", label: "Categories", icon: Tag, section: "Manage" },
  { id: "shops", label: "Shops", icon: Store, section: "Manage" },
  { id: "products", label: "Products", icon: Package, section: "Manage" },
  { id: "coupons", label: "Coupons", icon: Ticket, section: "Manage" },
  { id: "banners", label: "Banners", icon: Image, section: "Manage" },
  { id: "offline-coupons", label: "Offline Coupons", icon: WifiOff, section: "Manage" },
  { id: "contests", label: "Contests", icon: Trophy, section: "Manage" },
  { id: "orders", label: "Orders", icon: ShoppingBag, section: "Manage" },
  { id: "users", label: "Users", icon: Users, section: "People" },
  { id: "vendors", label: "Vendors", icon: Crown, section: "People" },
  { id: "top-shops", label: "Top Shops", icon: Award, section: "Insights" },
  { id: "top-coupons", label: "Top Coupons", icon: Flame, section: "Insights" },
  { id: "settings", label: "Settings", icon: Settings, section: "System" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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
  const [bundleItems, setBundleItems] = useState<{ product_id: string; custom_price: string; name: string; quantity: number }[]>([]);
  const [couponProdSearch, setCouponProdSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [shopSort, setShopSort] = useState<"az" | "za" | "none">("none");
  const [catSort, setCatSort] = useState<"az" | "za" | "none">("none");
  const [productSort, setProductSort] = useState<"az" | "za" | "none">("none");
  const [couponSort, setCouponSort] = useState<"az" | "za" | "none">("none");
  const [prodShopFilter, setProdShopFilter] = useState("");
  const [couponShopFilter, setCouponShopFilter] = useState("");
  const [freeItemShopId, setFreeItemShopId] = useState("");
  const [freeItemShopSearch, setFreeItemShopSearch] = useState("");
  const [freeItemCatFilter, setFreeItemCatFilter] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [productImageUrls, setProductImageUrls] = useState<string[]>([""]);
  const [shopBanners, setShopBanners] = useState<string[]>([""]);
  const [qrUploading, setQrUploading] = useState(false);
  const [imgUploading, setImgUploading] = useState<Record<string, boolean>>({});
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkShopId, setBulkShopId] = useState("");
  const [bulkShopSearch, setBulkShopSearch] = useState("");
  const [bulkMenuText, setBulkMenuText] = useState("");
  const [parsedItems, setParsedItems] = useState<{ name: string; price: string; category: string; type: string }[]>([]);
  const [bulkParsed, setBulkParsed] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

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
          quantity: cp.quantity || 1,
        })));
      }).catch(() => setBundleItems([]));
    } else {
      setBundleItems([]);
    }
    setCouponProdSearch("");
  }, [editItem, dialogOpen, activeTab]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admin-login");
    }
  }, [loading, isAdmin]);

  const isReady = !loading && isAdmin;

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"], enabled: isReady });
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"], enabled: isReady });
  const [dashWhatsapp, setDashWhatsapp] = useState("");
  const [dashWaSaving, setDashWaSaving] = useState(false);
  useEffect(() => { if (siteSettings.admin_whatsapp) setDashWhatsapp(siteSettings.admin_whatsapp); }, [siteSettings]);
  const saveDashWhatsapp = async () => {
    const cleaned = dashWhatsapp.replace(/\D/g, "");
    if (!cleaned) return;
    setDashWaSaving(true);
    try {
      await apiRequest("POST", "/api/admin/settings", { key: "admin_whatsapp", value: cleaned });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Admin WhatsApp saved!" });
    } finally { setDashWaSaving(false); }
  };
  const { data: recentOrders = [] } = useQuery<(Order & { user?: User })[]>({ queryKey: ["/api/admin/recent-orders"], enabled: isReady });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"], enabled: isReady });
  const { data: shops = [] } = useQuery<(Shop & { category?: Category })[]>({ queryKey: ["/api/shops"], enabled: isReady });
  const { data: products = [] } = useQuery<(Product & { shop?: Shop })[]>({ queryKey: ["/api/products"], enabled: isReady });
  const { data: coupons = [] } = useQuery<(Coupon & { shop?: Shop })[]>({ queryKey: ["/api/coupons"], enabled: isReady });
  const { data: orders = [] } = useQuery<(Order & { user?: User })[]>({ queryKey: ["/api/orders"], enabled: isReady });
  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users"], enabled: isReady });
  const { data: topShops = [] } = useQuery<Shop[]>({ queryKey: ["/api/admin/top-shops"], enabled: isReady });
  const { data: topCoupons = [] } = useQuery<(Coupon & { shop?: Shop })[]>({ queryKey: ["/api/admin/top-coupons"], enabled: isReady });
  const { data: vendorAccounts = [], refetch: refetchVendors } = useQuery<any[]>({ queryKey: ["/api/admin/vendors"], enabled: isReady });
  const { data: adminBanners = [] } = useQuery<any[]>({ queryKey: ["/api/admin/banners"], enabled: isReady });
  const { data: selectedOrderDetail, isLoading: orderDetailLoading } = useQuery<Order & { user?: User; items: (OrderItem & { product?: Product })[] }>({
    queryKey: ["/api/admin/orders", selectedOrderId],
    queryFn: () => fetch(`/api/admin/orders/${selectedOrderId}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(r => r.json()),
    enabled: isReady && !!selectedOrderId,
  });

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

  const openCreate = (defaults: any = {}) => { setEditItem(null); setFormData(defaults); setDialogOpen(true); setFreeItemShopId(""); setFreeItemShopSearch(""); setFreeItemCatFilter([]); };
  const openEdit = (item: any) => { setEditItem(item); setFormData({ ...item }); setDialogOpen(true); setFreeItemShopId(""); setFreeItemShopSearch(""); setFreeItemCatFilter([]); };
  const setForm = (key: string, value: any) => setFormData((f: any) => ({ ...f, [key]: value }));

  const parseMenuText = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const items: { name: string; price: string; category: string; type: string }[] = [];
    let currentCategory = "";
    const priceRegex = /₹\s*(\d+(?:\.\d+)?)|Rs\.?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:₹|Rs|INR|only|\/-)?\s*$/i;
    for (const line of lines) {
      const cleaned = line.replace(/^[-•*►▸→·]+\s*/, "").trim();
      if (!cleaned) continue;
      const priceMatch = cleaned.match(priceRegex);
      if (!priceMatch) {
        const noDigit = cleaned.replace(/\d/g, "").trim();
        if (noDigit.length > 2 && cleaned.length < 60) {
          currentCategory = cleaned.replace(/[:：-]+$/, "").trim();
        }
        continue;
      }
      const price = priceMatch[1] || priceMatch[2] || priceMatch[3] || "0";
      let name = cleaned
        .replace(/₹\s*\d+(?:\.\d+)?/g, "")
        .replace(/Rs\.?\s*\d+(?:\.\d+)?/gi, "")
        .replace(/\d+(?:\.\d+)?\s*(?:only|INR|\/-)?$/i, "")
        .replace(/[-–—.…,|]+$/, "")
        .trim();
      if (name.length < 2) continue;
      items.push({ name, price, category: currentCategory, type: "food" });
    }
    return items;
  };

  const uploadImage = async (file: File, onUrl: (url: string) => void, key = "default") => {
    setImgUploading(s => ({ ...s, [key]: true }));
    try {
      const token = localStorage.getItem("coupons_hub_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url) {
        onUrl(data.url);
        toast({ title: "Image uploaded!", description: data.provider === "supabase" ? "Supabase Storage లో save అయింది ✓" : "Locally saved ✓" });
      } else if (data.error === "supabase_bucket_missing") {
        toast({ title: "Supabase bucket missing", description: "Supabase Dashboard → Storage → New Bucket → 'images' (Public) create చేయండి", variant: "destructive" });
      } else {
        toast({ title: "Upload failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Network error", variant: "destructive" });
    } finally {
      setImgUploading(s => ({ ...s, [key]: false }));
    }
  };

  const UploadBtn = ({ fieldKey, onUrl, label = "Upload" }: { fieldKey: string; onUrl: (url: string) => void; label?: string }) => (
    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 cursor-pointer text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all shrink-0 ${imgUploading[fieldKey] ? "opacity-60 pointer-events-none" : ""}`} title="Upload image to Supabase Storage">
      {imgUploading[fieldKey] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
      {imgUploading[fieldKey] ? "Uploading..." : label}
      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, onUrl, fieldKey); e.target.value = ""; }} />
    </label>
  );

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

  const toggleTopCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/categories/${id}/toggle-top`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); toast({ title: "Top category updated!" }); },
  });
  const toggleTopShopMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/shops/${id}/toggle-top`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shops"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/top-shops"] }); toast({ title: "Top shop updated!" }); },
  });

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
      if (data.price) data.price = data.price.toString();
    }

    if (data.price) data.price = data.price.toString();
    if (type === "coupons") {
      data.coupon_products = bundleItems.map(i => ({ product_id: i.product_id, custom_price: i.custom_price, quantity: i.quantity || 1 }));
      if (data.type === "free_item") {
        data.value = "0";
      } else if (data.type === "category_offer") {
        if (data.category_offer_subtype === "free_item") {
          data.value = "0";
        } else {
          data.value = data.value ? data.value.toString() : "0";
        }
        data.category_offer_subtype = data.category_offer_subtype || null;
      } else {
        data.value = data.value ? data.value.toString() : "0";
        data.free_item_product_id = data.free_item_product_id || null;
      }
    } else {
      if (data.value) data.value = data.value.toString();
    }
    saveMutation.mutate({ type, data, id: editItem?.id });
  };

  const applySortAZ = <T extends { name: string }>(arr: T[], sort: "az" | "za" | "none") => {
    if (sort === "az") return [...arr].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") return [...arr].sort((a, b) => b.name.localeCompare(a.name));
    return arr;
  };
  const filteredProducts = applySortAZ(products
    .filter(p => !filterShopId || p.shop_id === filterShopId)
    .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.shop?.name?.toLowerCase().includes(productSearch.toLowerCase())), productSort);
  const filteredCoupons = applySortAZ(coupons.filter(c => {
    const matchesSearch = !couponSearch ||
      c.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
      c.shop?.name?.toLowerCase().includes(couponSearch.toLowerCase());
    const matchesShop = !couponShopFilter || couponShopFilter === "all_shops" || c.shop_id === couponShopFilter;
    return matchesSearch && matchesShop;
  }).map(c => ({ ...c, name: c.code })), couponSort).map(c => ({ ...c }));
  const couponShops = Array.from(new Map(coupons.filter(c => c.shop).map(c => [c.shop_id, c.shop])).entries()).map(([id, shop]) => ({ id, name: (shop as any)?.name || "" })).sort((a, b) => a.name.localeCompare(b.name));
  const filteredShops = applySortAZ(shops
    .filter(s => !filterCategoryId || s.category_id === filterCategoryId)
    .filter(s => !shopSearch || s.name.toLowerCase().includes(shopSearch.toLowerCase())), shopSort);

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
                    {item.id === "banners" && adminBanners.length > 0 && (
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-blue-500 text-white" : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"}`}>
                        {adminBanners.length}
                      </span>
                    )}
                    {item.id !== "banners" && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
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

  if (loading || !isAdmin) return null;

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

              {/* Admin WhatsApp — top of dashboard */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Admin WhatsApp Number</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={dashWhatsapp}
                      onChange={e => setDashWhatsapp(e.target.value)}
                      placeholder="e.g. 919876543210 (with country code)"
                      className="rounded-xl text-sm h-9 flex-1"
                      data-testid="input-dash-admin-whatsapp"
                    />
                    <Button
                      size="sm"
                      onClick={saveDashWhatsapp}
                      disabled={dashWaSaving || !dashWhatsapp}
                      className="rounded-xl bg-[#25D366] hover:bg-[#20b958] text-white border-0 shrink-0 h-9 px-4"
                      data-testid="button-dash-save-whatsapp"
                    >
                      {dashWaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="ml-1.5 hidden sm:inline">Save</span>
                    </Button>
                  </div>
                </div>
                {siteSettings.admin_whatsapp && (
                  <div className="shrink-0 text-right hidden sm:block">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Active</span>
                    <p className="text-xs text-muted-foreground">+{siteSettings.admin_whatsapp}</p>
                  </div>
                )}
              </div>

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
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users by name or email..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-user-search" />
                </div>
                <Button onClick={() => { setUserForm({ name: "", email: "", phone: "", password: "" }); setUserDialogOpen(true); }} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 shrink-0" data-testid="button-create-user">
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
                        {allUsers.filter((u: any) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.phone && u.phone.includes(userSearch))).map((u: any) => (
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Vendor Login Accounts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Each shop can have one vendor login. Click "Set Login" to create or update.</p>
                </div>
                <div className="relative min-w-[200px] max-w-xs w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="Search shops..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-vendor-search" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.filter(s => !vendorSearch || s.name.toLowerCase().includes(vendorSearch.toLowerCase())).map(shop => {
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Top Shops</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Toggle shops to show them in the "Top Shops" section on home screen. <span className="text-amber-600 font-semibold">{topShops.length} selected</span></p>
                </div>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {shops.map((shop: any) => (
                      <div key={shop.id} className="flex items-center justify-between px-5 py-3.5 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-top-shop-${shop.id}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {shop.logo ? (
                            <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-xl object-cover shrink-0" onError={e => { (e.target as any).style.display = "none"; }} />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {shop.name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{shop.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{shop.category?.name || "—"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleTopShopMutation.mutate(shop.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${shop.is_top ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-amber-300"}`}
                          data-testid={`button-toggle-top-shop-${shop.id}`}
                        >
                          <Star className={`w-3.5 h-3.5 ${shop.is_top ? "fill-amber-500 text-amber-500" : ""}`} />
                          {shop.is_top ? "Top Shop ✓" : "Add to Top"}
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search categories..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-category-search" />
                </div>
                <Button onClick={() => openCreate()} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 shrink-0" data-testid="button-create-category">
                  <Plus className="w-4 h-4" /> Add Category
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sort:</span>
                <button onClick={() => setCatSort(catSort === "az" ? "none" : "az")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${catSort === "az" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`} data-testid="button-cat-sort-az"><ArrowUpAZ className="w-3 h-3" /> A→Z</button>
                <button onClick={() => setCatSort(catSort === "za" ? "none" : "za")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${catSort === "za" ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400"}`} data-testid="button-cat-sort-za"><ArrowDownAZ className="w-3 h-3" /> Z→A</button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {applySortAZ(categories.filter(c => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase())), catSort).map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-category-${cat.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                            {(cat as any).image && ((cat as any).image.startsWith("http") || (cat as any).image.startsWith("data:")) ? (
                              <img src={(cat as any).image} alt={cat.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <Tag className="w-4 h-4 text-violet-500" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleTopCategoryMutation.mutate(cat.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${(cat as any).is_top ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-amber-300"}`}
                            data-testid={`button-toggle-top-category-${cat.id}`}
                          >
                            <Star className={`w-3 h-3 ${(cat as any).is_top ? "fill-amber-500 text-amber-500" : ""}`} />
                            {(cat as any).is_top ? "Top" : "Top?"}
                          </button>
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
                    <div>
                      <Label>Icon Image</Label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">PNG/GIF with transparent background recommended (shows circular on site)</p>
                      <div className="flex gap-2">
                        <Input value={formData.image || ""} onChange={e => setForm("image", e.target.value)} className="rounded-xl flex-1" placeholder="https://... or upload below" data-testid="input-category-icon" />
                        <UploadBtn fieldKey="cat-icon" onUrl={url => setForm("image", url)} />
                      </div>
                      {formData.image && (
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center shadow-md">
                            <img src={formData.image} alt="Icon preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                          <p className="text-xs text-muted-foreground">Site lo circle lo ila kanipisthundi</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Banner Image</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input value={(formData as any).banner || ""} onChange={e => setForm("banner", e.target.value)} className="rounded-xl flex-1" placeholder="https://... (wide 1200×400px) or upload ↑" data-testid="input-category-banner" />
                        <UploadBtn fieldKey="cat-banner" onUrl={url => setForm("banner", url)} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Category page header lo show avutuundi</p>
                      {(formData as any).banner && (
                        <img src={(formData as any).banner} alt="Banner preview" className="mt-2 w-full h-20 object-cover rounded-xl border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
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

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sort:</span>
                <button onClick={() => setShopSort(shopSort === "az" ? "none" : "az")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${shopSort === "az" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`} data-testid="button-shop-sort-az"><ArrowUpAZ className="w-3 h-3" /> A→Z</button>
                <button onClick={() => setShopSort(shopSort === "za" ? "none" : "za")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${shopSort === "za" ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400"}`} data-testid="button-shop-sort-za"><ArrowDownAZ className="w-3 h-3" /> Z→A</button>
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
                      <div>
                        <Label className="text-sm">Business Hours</Label>
                        <Input value={(formData as any).business_hours || ""} onChange={e => setForm("business_hours", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. 09:00-22:00 or Mon-Sat 10:00-21:00" data-testid="input-shop-business-hours" />
                        <p className="text-[11px] text-muted-foreground mt-1">Orders outside hours will be blocked. Format: HH:MM-HH:MM</p>
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
                          <Input value={formData.map_link || ""} onChange={e => setForm("map_link", e.target.value)} className="rounded-xl flex-1" placeholder="https://maps.google.com/maps/place/ShopName/@16.71,81.09,17z" data-testid="input-shop-map" />
                          {formData.map_link && (
                            <button type="button" onClick={() => window.open(formData.map_link, "_blank")} className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="Open map" data-testid="button-open-map">
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                          Map radar lo show avvadam ki URL lo <span className="font-semibold text-blue-600">@lat,lng</span> format use cheyyandi (e.g. <span className="font-mono">@16.7100,81.0966</span>). Save cheste coordinates auto-extract avutayi.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Latitude (Manual)</Label>
                          <Input value={formData.latitude || ""} onChange={e => setForm("latitude", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. 16.7100" data-testid="input-shop-latitude" />
                        </div>
                        <div>
                          <Label className="text-sm flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Longitude (Manual)</Label>
                          <Input value={formData.longitude || ""} onChange={e => setForm("longitude", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. 81.0966" data-testid="input-shop-longitude" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Map Radar Settings</p>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        <div>
                          <p className="text-sm font-medium">Show on Radar Map</p>
                          <p className="text-[11px] text-muted-foreground">Toggle off to hide this shop from the nearby map</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm("show_on_radar", (formData as any).show_on_radar === false ? true : false)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${(formData as any).show_on_radar === false ? "bg-gray-300 dark:bg-gray-600" : "bg-emerald-500"}`}
                          data-testid="toggle-shop-radar"
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(formData as any).show_on_radar === false ? "" : "translate-x-5"}`} />
                        </button>
                      </div>
                      <div>
                        <Label className="text-sm">Marker Color</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#6366f1","#8b5cf6","#ec4899","#14b8a6","#f43f5e","#84cc16"].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setForm("marker_color", (formData as any).marker_color === c ? "" : c)}
                              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${(formData as any).marker_color === c ? "border-white ring-2 ring-offset-1 ring-blue-500 scale-110" : "border-transparent"}`}
                              style={{ background: c }}
                              data-testid={`color-picker-${c}`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">Select a custom color for the map marker. Leave blank for auto-color.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media</p>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Logo</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input value={formData.logo || ""} onChange={e => setForm("logo", e.target.value)} className="rounded-xl flex-1" placeholder="https://..." data-testid="input-shop-logo" />
                          <UploadBtn fieldKey="shop-logo" onUrl={url => setForm("logo", url)} />
                        </div>
                        {formData.logo && <img src={formData.logo} alt="Logo preview" className="mt-2 w-12 h-12 object-cover rounded-xl border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      </div>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Main Banner</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input value={formData.banner_image || ""} onChange={e => setForm("banner_image", e.target.value)} className="rounded-xl flex-1" placeholder="https://..." data-testid="input-shop-banner" />
                          <UploadBtn fieldKey="shop-banner" onUrl={url => setForm("banner_image", url)} />
                        </div>
                        {formData.banner_image && <img src={formData.banner_image} alt="Banner preview" className="mt-2 w-full h-16 object-cover rounded-xl border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
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
                              <UploadBtn fieldKey={`shop-xbanner-${idx}`} onUrl={url2 => setShopBanners(b => b.map((v, i) => i === idx ? url2 : v))} label="" />
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
                <div className="flex items-center gap-2 shrink-0">
                  <Button onClick={() => openCreate({ type: "product" })} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25" data-testid="button-create-product">
                    <Plus className="w-4 h-4" /> Add Item
                  </Button>
                  <Button onClick={() => { setBulkDialogOpen(true); setBulkParsed(false); setBulkMenuText(""); setParsedItems([]); setBulkShopId(filterShopId || ""); }} size="sm" variant="outline" className="rounded-xl gap-2 border-violet-300 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30" data-testid="button-bulk-upload-text">
                    <Upload className="w-4 h-4" /> Upload Text
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sort:</span>
                <button onClick={() => setProductSort(productSort === "az" ? "none" : "az")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${productSort === "az" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`} data-testid="button-product-sort-az"><ArrowUpAZ className="w-3 h-3" /> A→Z</button>
                <button onClick={() => setProductSort(productSort === "za" ? "none" : "za")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${productSort === "za" ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400"}`} data-testid="button-product-sort-za"><ArrowDownAZ className="w-3 h-3" /> Z→A</button>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  {(() => {
                    const renderProdRow = (prod: any) => {
                      const isService = prod.type === "service";
                      const firstImg = prod.images?.[0] || prod.image;
                      return (
                        <div key={prod.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-product-${prod.id}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0 ${isService ? "bg-gradient-to-br from-blue-400 to-cyan-500" : "bg-gradient-to-br from-orange-400 to-red-500"}`}>
                              {firstImg ? <img src={firstImg} className="w-full h-full object-cover rounded-xl" alt="" onError={e => { (e.target as any).style.display = "none"; }} /> : prod.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{prod.name}</p>
                                <Badge className={`border-0 text-[10px] px-1.5 py-0 shrink-0 ${isService ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>{isService ? "Service" : "Product"}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{prod.shop?.name}{prod.price ? ` · ₹${parseFloat(prod.price as string).toLocaleString()}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => saveMutation.mutate({ type: "products", data: { is_active: !prod.is_active }, id: prod.id })} className={`relative rounded-full transition-colors shrink-0 focus:outline-none ${prod.is_active !== false ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} title={prod.is_active !== false ? "Active" : "Inactive"} data-testid={`toggle-product-active-${prod.id}`} style={{ minWidth: 36, height: 22 }}>
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${prod.is_active !== false ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                            </button>
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => openEdit(prod)} data-testid={`button-edit-product-${prod.id}`}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" onClick={() => deleteMutation.mutate({ type: "products", id: prod.id })} data-testid={`button-delete-product-${prod.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </div>
                      );
                    };

                    if (filterShopId) {
                      const grouped: Record<string, any[]> = {};
                      filteredProducts.forEach(prod => {
                        const cat = (prod as any).sub_category || "Other";
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(prod);
                      });
                      const cats = Object.keys(grouped).sort((a, b) => a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b));
                      return (
                        <div className="flex flex-col">
                          {cats.map(cat => (
                            <div key={cat}>
                              <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/20 border-y border-blue-100 dark:border-blue-900/50 flex items-center gap-2 sticky top-0 z-10" data-testid={`category-header-${cat}`}>
                                <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                                  <Tag className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{cat}</span>
                                <span className="text-[10px] text-blue-500 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full">{grouped[cat].length}</span>
                              </div>
                              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                                {grouped[cat].map(prod => renderProdRow(prod))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">{filteredProducts.map(prod => renderProdRow(prod))}</div>;
                  })()}
                </CardContent>
              </Card>
              {/* Bulk Upload from Text Dialog */}
              <Dialog open={bulkDialogOpen} onOpenChange={v => { setBulkDialogOpen(v); if (!v) { setBulkParsed(false); setParsedItems([]); setBulkMenuText(""); } }}>
                <DialogContent className="rounded-2xl max-w-2xl max-h-[92vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <Upload className="w-5 h-5 text-violet-500" /> Bulk Upload Products from Text
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">
                    {/* Shop Select */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Select Shop</Label>
                      <div className="relative mb-1.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input value={bulkShopSearch} onChange={e => setBulkShopSearch(e.target.value)} placeholder="Search shop..." className="pl-8 rounded-xl h-9 text-sm" />
                      </div>
                      <Select value={bulkShopId} onValueChange={setBulkShopId}>
                        <SelectTrigger className="rounded-xl" data-testid="select-bulk-shop"><SelectValue placeholder="Choose shop..." /></SelectTrigger>
                        <SelectContent>
                          {shops.filter(s => !bulkShopSearch || s.name.toLowerCase().includes(bulkShopSearch.toLowerCase())).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <p className="font-semibold">Menu text paste చేయండి:</p>
                      <p>• Category name (price లేకుండా) → ఆ తర్వాత items ఆ category లో వెళతాయి</p>
                      <p>• Item name + price (₹120 లేదా 120 format) → product గా add అవుతుంది</p>
                      <p>• Example: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Burger ₹120</code> లేదా <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Margherita Pizza - 180</code></p>
                    </div>

                    {/* Text Area */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Menu Text</Label>
                      <Textarea
                        value={bulkMenuText}
                        onChange={e => { setBulkMenuText(e.target.value); setBulkParsed(false); }}
                        placeholder={"Paste menu text here...\n\nExample:\nBurgers\nAloo Tikki Burger ₹90\nPaneer Steak Burger ₹150\n\nPizzas\nMargherita Pizza ₹180\nDouble Cheese Pizza ₹250"}
                        className="rounded-xl min-h-[160px] font-mono text-xs resize-y"
                        data-testid="textarea-bulk-menu"
                      />
                    </div>

                    {/* Parse Button */}
                    {!bulkParsed && (
                      <Button
                        onClick={() => {
                          if (!bulkMenuText.trim()) { toast({ title: "Menu text paste చేయండి", variant: "destructive" }); return; }
                          const items = parseMenuText(bulkMenuText);
                          if (items.length === 0) { toast({ title: "Products parse కాలేదు", description: "₹ లేదా price తో menu text paste చేయండి", variant: "destructive" }); return; }
                          setParsedItems(items);
                          setBulkParsed(true);
                        }}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 gap-2"
                        data-testid="button-parse-menu"
                      >
                        <RefreshCw className="w-4 h-4" /> Analyse & Preview ({bulkMenuText ? bulkMenuText.split("\n").filter(Boolean).length : 0} lines)
                      </Button>
                    )}

                    {/* Parsed Preview */}
                    {bulkParsed && parsedItems.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{parsedItems.length} products found — edit చేయవచ్చు:</p>
                          <button onClick={() => { setBulkParsed(false); }} className="text-xs text-blue-500 hover:underline">Re-parse</button>
                        </div>
                        <div className="border rounded-xl overflow-hidden">
                          <div className="grid grid-cols-[2fr_1fr_1.5fr_auto] text-[11px] font-semibold text-muted-foreground bg-gray-50 dark:bg-gray-800 px-3 py-2 gap-2">
                            <span>Product Name</span><span>Price (₹)</span><span>Category</span><span></span>
                          </div>
                          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[280px] overflow-y-auto">
                            {parsedItems.map((item, i) => (
                              <div key={i} className="grid grid-cols-[2fr_1fr_1.5fr_auto] gap-2 px-3 py-2 items-center" data-testid={`row-parsed-${i}`}>
                                <Input value={item.name} onChange={e => setParsedItems(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="h-7 text-xs rounded-lg px-2" data-testid={`input-parsed-name-${i}`} />
                                <Input value={item.price} onChange={e => setParsedItems(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} className="h-7 text-xs rounded-lg px-2" data-testid={`input-parsed-price-${i}`} />
                                <Input value={item.category} onChange={e => setParsedItems(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))} placeholder="Category" className="h-7 text-xs rounded-lg px-2" data-testid={`input-parsed-category-${i}`} />
                                <button onClick={() => setParsedItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1" data-testid={`button-remove-parsed-${i}`}><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            disabled={!bulkShopId || bulkSaving}
                            onClick={async () => {
                              if (!bulkShopId) { toast({ title: "Shop select చేయండి", variant: "destructive" }); return; }
                              const validItems = parsedItems.filter(i => i.name.trim());
                              if (validItems.length === 0) { toast({ title: "Minimum 1 product ఉండాలి", variant: "destructive" }); return; }
                              setBulkSaving(true);
                              try {
                                const token = localStorage.getItem("coupons_hub_token");
                                const res = await fetch("/api/products/bulk", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ shop_id: bulkShopId, items: validItems.map(i => ({ name: i.name, price: parseFloat(i.price) || 0, sub_category: i.category, type: i.type })) }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Save failed");
                                queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                                toast({ title: `✅ ${data.count} products saved!`, description: "Products tab లో కనిపిస్తాయి. Details తర్వాత edit చేయవచ్చు." });
                                setBulkDialogOpen(false);
                                setBulkParsed(false);
                                setParsedItems([]);
                                setBulkMenuText("");
                              } catch (e: any) {
                                toast({ title: "Save failed", description: e.message, variant: "destructive" });
                              } finally {
                                setBulkSaving(false);
                              }
                            }}
                            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 gap-2"
                            data-testid="button-save-bulk-products"
                          >
                            {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Save {parsedItems.length} Products
                          </Button>
                          <Button variant="outline" onClick={() => setBulkDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

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

                    {/* Sub Category */}
                    {(() => {
                      const selectedShop = shops.find(s => s.id === formData.shop_id);
                      const catName = (selectedShop as any)?.category?.name || "";
                      const subCatMap: Record<string, string[]> = {
                        "Food & Dining": ["Starters", "Soups", "Biryanis", "Main Course", "Breads", "Desserts", "Beverages", "Rice Items", "Combos", "Non-Veg", "Veg"],
                        "Biryani": ["Veg Biryanis", "Non-Veg Biryanis", "Starters", "Soups", "Rotis", "Desserts", "Beverages", "Combos"],
                        "Restaurants": ["Starters", "Soups", "Main Course", "Biryanis", "Breads", "Desserts", "Beverages", "Combos", "Tiffins", "Thalis"],
                        "Bakery": ["Cakes", "Pastries", "Cookies", "Breads", "Savories", "Beverages", "Sweets", "Desserts"],
                        "Beauty & Wellness": ["Hair", "Facials", "Spa", "Waxing", "Makeup", "Nail Art", "Massage", "Body Treatments", "Threading", "Skin Care"],
                        "Electronics": ["Mobiles", "Laptops", "Tablets", "Accessories", "Audio", "Smart Home", "Gaming", "Cameras", "TVs", "Cables & Chargers"],
                        "Fashion": ["Men", "Women", "Kids", "Footwear", "Accessories", "Traditional Wear", "Casual Wear", "Sportswear", "Innerwear"],
                        "Jewelry": ["Gold Jewelry", "Diamond Jewelry", "Silver Jewelry", "Chains", "Rings", "Bangles", "Pendants", "Earrings", "Bracelets"],
                        "Groceries": ["Fruits & Vegetables", "Dairy", "Grains & Pulses", "Snacks", "Beverages", "Personal Care", "Cleaning", "Frozen Foods"],
                        "Pharmacy & Health": ["Medicines", "Health Supplements", "Baby Care", "Vitamins", "Medical Devices", "Skin Care", "Personal Hygiene"],
                        "Education": ["Courses", "Study Materials", "Books", "Stationery", "Test Prep", "Coaching"],
                        "Sports & Fitness": ["Footwear", "Clothing", "Equipment", "Accessories", "Nutrition", "Cricket", "Football", "Badminton", "Yoga"],
                        "Entertainment": ["Movie Tickets", "Snacks & Beverages", "Merchandise", "Combo Deals"],
                        "Travel": ["Rooms", "Dining", "Spa", "Events", "Meeting Halls", "Packages"],
                        "Home & Living": ["Furniture", "Decor", "Kitchen", "Bedding", "Lighting", "Storage", "Bath"],
                      };
                      const suggestions = subCatMap[catName] || ["General", "Special", "Featured", "New Arrivals", "Best Sellers", "Seasonal"];
                      const shopProducts = products.filter((p: any) => p.shop_id === formData.shop_id);
                      const existingSubCats = Array.from(new Set(shopProducts.map((p: any) => p.sub_category).filter(Boolean))) as string[];
                      const allChips = Array.from(new Set([...existingSubCats, ...suggestions.slice(0, 6)]));
                      return (
                        <div>
                          <Label className="text-xs font-semibold">Category <span className="text-muted-foreground font-normal">(group products by type)</span></Label>
                          <Input value={formData.sub_category || ""} onChange={e => setForm("sub_category", e.target.value)} className="mt-1.5 rounded-xl" placeholder="Type new category name or pick below..." data-testid="input-product-subcategory" list="subcategory-suggestions" />
                          <datalist id="subcategory-suggestions">{allChips.map(s => <option key={s} value={s} />)}</datalist>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {existingSubCats.map(s => (
                              <button key={`ex-${s}`} type="button" onClick={() => setForm("sub_category", s)}
                                className={`text-[11px] px-2 py-1 rounded-lg border transition-all font-semibold ${formData.sub_category === s ? "bg-blue-500 text-white border-blue-500" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100"}`}
                                data-testid={`chip-existing-${s.replace(/\s+/g, "-").toLowerCase()}`}>
                                ✓ {s}
                              </button>
                            ))}
                            {suggestions.slice(0, 6).filter(s => !existingSubCats.includes(s)).map(s => (
                              <button key={s} type="button" onClick={() => setForm("sub_category", s)}
                                className={`text-[11px] px-2 py-1 rounded-lg border transition-all ${formData.sub_category === s ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-blue-300 hover:text-blue-600"}`}
                                data-testid={`chip-subcategory-${s.replace(/\s+/g, "-").toLowerCase()}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5">Input lo type cheyyi to create new. Blue chips ✓ = this shop lo already use avutunnayi.</p>
                        </div>
                      );
                    })()}

                    {/* Description */}
                    <div>
                      <Label className="text-xs font-semibold">Description</Label>
                      <Textarea value={formData.description || ""} onChange={e => setForm("description", e.target.value)} className="mt-1.5 rounded-xl resize-none" rows={2} placeholder="Brief description..." data-testid="input-product-description" />
                    </div>

                    {/* Price */}
                    <div>
                      <Label className="text-xs font-semibold">{formData.type === "service" ? "Service Fee" : "Price"} (₹)</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                        <Input type="number" min="0" value={formData.price || ""} onChange={e => setForm("price", e.target.value)} className="rounded-xl pl-8" placeholder="e.g. 299" data-testid="input-product-price" />
                      </div>
                    </div>

                    {/* Duration — services only */}
                    {formData.type === "service" && (
                      <div>
                        <Label className="text-xs font-semibold">Service Duration (Optional)</Label>
                        <Input value={formData.duration || ""} onChange={e => setForm("duration", e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. 30 mins, 1 hour" data-testid="input-product-duration" />
                      </div>
                    )}


                    {/* Shop */}
                    <div>
                      <Label className="text-xs font-semibold">Shop</Label>
                      <Select value={formData.shop_id || ""} onValueChange={v => setForm("shop_id", v)}>
                        <SelectTrigger className="mt-1.5 rounded-xl" data-testid="select-product-shop"><SelectValue placeholder="Select shop" /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                            <input
                              placeholder="Search shops..."
                              value={prodShopFilter}
                              onChange={e => setProdShopFilter(e.target.value)}
                              onKeyDown={e => e.stopPropagation()}
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30"
                              data-testid="input-prod-shop-search"
                            />
                          </div>
                          {shops.filter(s => !prodShopFilter || s.name.toLowerCase().includes(prodShopFilter.toLowerCase())).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          {shops.filter(s => !prodShopFilter || s.name.toLowerCase().includes(prodShopFilter.toLowerCase())).length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No shops found</div>}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Image URLs — multiple */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-semibold">Images</Label>
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
                                placeholder="https://example.com/image.jpg or upload ↑"
                                data-testid={`input-image-url-${idx}`}
                              />
                            </div>
                            <UploadBtn fieldKey={`prod-img-${idx}`} onUrl={url2 => setProductImageUrls(u => u.map((v, i) => i === idx ? url2 : v))} label="" />
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
                <div className="flex flex-col gap-3 flex-1 min-w-[280px]">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={couponSearch} onChange={e => setCouponSearch(e.target.value)} placeholder="Search by code or value..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-coupon-search" />
                  </div>
                  <div className="relative max-w-xs">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Select value={couponShopFilter} onValueChange={setCouponShopFilter}>
                      <SelectTrigger className="pl-8 rounded-xl h-9 text-sm bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800" data-testid="select-coupon-shop">
                        <SelectValue placeholder="Filter by Shop" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all_shops">All Shops</SelectItem>
                        {couponShops.map(shop => (
                          <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => openCreate({ is_active: true, type: "percentage" })} size="sm" className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25 shrink-0" data-testid="button-create-coupon">
                  <Plus className="w-4 h-4" /> Add Coupon
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sort:</span>
                <button onClick={() => setCouponSort(couponSort === "az" ? "none" : "az")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${couponSort === "az" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`} data-testid="button-coupon-sort-az"><ArrowUpAZ className="w-3 h-3" /> A→Z</button>
                <button onClick={() => setCouponSort(couponSort === "za" ? "none" : "za")} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${couponSort === "za" ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400"}`} data-testid="button-coupon-sort-za"><ArrowDownAZ className="w-3 h-3" /> Z→A</button>
                {(couponSearch || couponShopFilter) && (
                  <button onClick={() => { setCouponSearch(""); setCouponShopFilter(""); }} className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all" data-testid="button-coupon-clear-filter">
                    Clear filters
                  </button>
                )}
              </div>
              {couponShopFilter && (
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800/30">
                  <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">Showing coupons for: <strong>{couponShops.find(s => s.id === couponShopFilter)?.name}</strong></span>
                  <span className="ml-auto text-xs text-muted-foreground">{filteredCoupons.length} coupon{filteredCoupons.length !== 1 ? "s" : ""}</span>
                </div>
              )}
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
                        bogo: "Buy 1 Get 1",
                        category_offer: `🏷️ Category Offer`,
                      };
                      return (
                        <div key={coupon.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" data-testid={`row-coupon-${coupon.id}`}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="font-bold text-sm bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">{coupon.code}</code>
                              <Badge variant="outline" className="text-[10px] h-5 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                                {coupon.shop?.name || "Global"}
                              </Badge>
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
                              {(coupon as any).usage_limit && (
                                <span className={`ml-2 font-medium ${((coupon as any).usage_count ?? 0) >= (coupon as any).usage_limit ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
                                  · {Math.max(0, (coupon as any).usage_limit - ((coupon as any).usage_count ?? 0))} / {(coupon as any).usage_limit} left
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => saveMutation.mutate({ type: "coupons", data: { is_active: !coupon.is_active }, id: coupon.id })}
                                className={`relative rounded-full transition-colors focus:outline-none ${coupon.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                                title={coupon.is_active ? "Live — click to pause" : "Paused — click to activate"}
                                data-testid={`toggle-coupon-live-${coupon.id}`}
                                style={{ minWidth: 36, height: 22 }}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${coupon.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                              </button>
                              <span className="text-[9px] text-muted-foreground">{coupon.is_active ? "Live" : "Off"}</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => saveMutation.mutate({ type: "coupons", data: { featured: !(coupon as any).featured }, id: coupon.id })}
                                className={`relative rounded-full transition-colors focus:outline-none ${(coupon as any).featured ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"}`}
                                title={(coupon as any).featured ? "Top — click to unfeature" : "Not featured — click to feature"}
                                data-testid={`toggle-coupon-featured-${coupon.id}`}
                                style={{ minWidth: 36, height: 22 }}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${(coupon as any).featured ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                              </button>
                              <span className="text-[9px] text-muted-foreground">Top</span>
                            </div>
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

                    {/* Coupon Type Selector — 4 types */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coupon Type</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {([
                          { value: "percentage", label: "% Discount", desc: "Percentage off", icon: "%" },
                          { value: "flat", label: "₹ Flat Off", desc: "Fixed amount off", icon: "₹" },
                          { value: "free_item", label: "Free Item", desc: "User picks 1 free item", icon: "🎁" },
                          { value: "bogo", label: "Buy 1 Get 1", desc: "Buy item, get free item", icon: "🔄" },
                          { value: "category_offer", label: "Category Offer", desc: "Offer on selected categories", icon: "🏷️" },
                          { value: "min_order", label: "Spend & Save", desc: "Min cart value → get discount", icon: "🛒" },
                          { value: "combo", label: "Combo Offer", desc: "Bundle items at combo price", icon: "📦" },
                        ] as const).map(opt => {
                          const active = (formData.type || "percentage") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setForm("type", opt.value); if (opt.value === "min_order") setForm("category_offer_subtype", formData.category_offer_subtype || "percentage"); }}
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
                        <Select value={formData.shop_id || ""} onValueChange={v => { setForm("shop_id", v); setBundleItems([]); setCouponProdSearch(""); setCouponShopFilter(""); }}>
                          <SelectTrigger className="mt-1.5 rounded-xl" data-testid="select-coupon-shop"><SelectValue placeholder="Select shop" /></SelectTrigger>
                          <SelectContent>
                            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                              <input
                                placeholder="Search shops..."
                                value={couponShopFilter}
                                onChange={e => setCouponShopFilter(e.target.value)}
                                onKeyDown={e => e.stopPropagation()}
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30"
                                data-testid="input-coupon-shop-search"
                              />
                            </div>
                            {shops.filter(s => !couponShopFilter || s.name.toLowerCase().includes(couponShopFilter.toLowerCase())).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            {shops.filter(s => !couponShopFilter || s.name.toLowerCase().includes(couponShopFilter.toLowerCase())).length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No shops found</div>}
                          </SelectContent>
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

                    {/* Free item picker — pick one from list (admin) */}
                    {formData.type === "free_item" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">🎁 Add Items to "Pick One" List</Label>
                          <span className="text-[10px] text-muted-foreground">{(formData.free_item_products || []).length} items added</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground -mt-1">User picks one item from this list for free when claiming the coupon.</p>
                        {/* Shop filter */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] text-muted-foreground">Filter by Shop</Label>
                          <div className="relative">
                            <input placeholder="Search shop name..." value={freeItemShopSearch}
                              onChange={e => { setFreeItemShopSearch(e.target.value); setFreeItemShopId(""); }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/30"
                              data-testid="input-free-item-shop-search" />
                          </div>
                          {freeItemShopSearch && (
                            <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                              {shops.filter(s => s.name.toLowerCase().includes(freeItemShopSearch.toLowerCase())).slice(0, 8).map(s => (
                                <button key={s.id} type="button" onClick={() => { setFreeItemShopId(s.id); setFreeItemShopSearch(s.name); }}
                                  className={`text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${freeItemShopId === s.id ? "text-emerald-600 font-semibold" : "text-gray-700 dark:text-gray-300"}`}
                                  data-testid={`free-item-shop-${s.id}`}>{s.name}</button>
                              ))}
                              {shops.filter(s => s.name.toLowerCase().includes(freeItemShopSearch.toLowerCase())).length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No shops found</p>}
                            </div>
                          )}
                        </div>
                        {!(freeItemShopId || formData.shop_id) ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">Select a shop above to see products</p>
                        ) : (
                          <>
                            {/* Category filter chips */}
                            {(() => {
                              const shopProds = products.filter(p => p.shop_id === (freeItemShopId || formData.shop_id));
                              const cats = Array.from(new Set(shopProds.map((p: any) => p.sub_category).filter(Boolean))) as string[];
                              return cats.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  <button type="button" onClick={() => setFreeItemCatFilter([])}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${freeItemCatFilter.length === 0 ? "bg-emerald-500 text-white border-emerald-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-emerald-400"}`}>All</button>
                                  {cats.map(cat => (
                                    <button key={cat} type="button"
                                      onClick={() => setFreeItemCatFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${freeItemCatFilter.includes(cat) ? "bg-emerald-500 text-white border-emerald-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-emerald-400"}`}
                                      data-testid={`admin-free-item-cat-filter-${cat}`}>{cat}</button>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                            <Input placeholder="Search products..." value={couponProdSearch} onChange={e => setCouponProdSearch(e.target.value)} className="rounded-xl h-8 text-xs" data-testid="input-free-product-search" />
                            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                              {products
                                .filter((p: any) => {
                                  const matchShop = p.shop_id === (freeItemShopId || formData.shop_id);
                                  const matchCat = freeItemCatFilter.length === 0 || freeItemCatFilter.includes(p.sub_category);
                                  const matchSearch = !couponProdSearch || p.name.toLowerCase().includes(couponProdSearch.toLowerCase());
                                  return matchShop && matchCat && matchSearch;
                                })
                                .map(p => {
                                  const freeProds: string[] = formData.free_item_products || [];
                                  const inList = freeProds.includes(p.id);
                                  return (
                                    <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${inList ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-gray-700"}`} data-testid={`free-item-product-${p.id}`}>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                      </div>
                                      {inList ? (
                                        <button type="button" onClick={() => setForm("free_item_products", (formData.free_item_products || []).filter((id: string) => id !== p.id))}
                                          className="text-[10px] px-2 py-1 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 font-semibold" data-testid={`free-item-remove-${p.id}`}>Remove</button>
                                      ) : (
                                        <button type="button" onClick={() => setForm("free_item_products", [...(formData.free_item_products || []), p.id])}
                                          className="text-[10px] px-2 py-1 rounded-lg border border-emerald-400 text-emerald-600 hover:bg-emerald-50 font-semibold" data-testid={`free-item-add-${p.id}`}>+ Add</button>
                                      )}
                                    </div>
                                  );
                                })}
                              {products.filter(p => p.shop_id === (freeItemShopId || formData.shop_id)).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No products in this shop</p>}
                            </div>
                            {/* Selected items preview */}
                            {(formData.free_item_products || []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {(formData.free_item_products || []).map((pid: string) => {
                                  const p = (products as any[]).find(x => x.id === pid);
                                  return p ? (
                                    <span key={pid} className="flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0.5 font-medium">
                                      {p.name}
                                      <button type="button" onClick={() => setForm("free_item_products", (formData.free_item_products || []).filter((id: string) => id !== pid))} className="text-emerald-500 hover:text-red-500 font-bold leading-none">×</button>
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                            <div>
                              <Label className="text-xs font-semibold">Min Order (₹) <span className="text-muted-foreground font-normal">optional</span></Label>
                              <div className="relative mt-1.5">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                                <Input type="number" min="0" value={formData.min_order_amount || ""} onChange={e => setForm("min_order_amount", e.target.value || null)} className="rounded-xl pl-7 h-9 text-sm" placeholder="e.g. 500" data-testid="input-min-order-amount" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* BOGO picker (admin) */}
                    {formData.type === "bogo" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20">
                        <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400">🔄 Buy One Get One Setup</Label>
                        <p className="text-[10px] text-muted-foreground -mt-1">Customer buys the "Buy" product and gets the "Get Free" product added to cart for free.</p>
                        {/* Shop filter for BOGO */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] text-muted-foreground">Filter by Shop</Label>
                          <div className="relative">
                            <input placeholder="Search shop name..." value={freeItemShopSearch}
                              onChange={e => { setFreeItemShopSearch(e.target.value); setFreeItemShopId(""); }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-orange-500/30"
                              data-testid="input-bogo-shop-search" />
                          </div>
                          {freeItemShopSearch && (
                            <div className="flex flex-col gap-0.5 max-h-20 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                              {shops.filter(s => s.name.toLowerCase().includes(freeItemShopSearch.toLowerCase())).slice(0, 6).map(s => (
                                <button key={s.id} type="button" onClick={() => { setFreeItemShopId(s.id); setFreeItemShopSearch(s.name); }}
                                  className={`text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 ${freeItemShopId === s.id ? "text-orange-600 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>{s.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        {(freeItemShopId || formData.shop_id) && (
                          <>
                            {/* Buy product */}
                            <div>
                              <Label className="text-xs font-semibold mb-1.5 block">Buy Product <span className="text-orange-600">*</span></Label>
                              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                                {products.filter(p => p.shop_id === (freeItemShopId || formData.shop_id)).map(p => {
                                  const sel = formData.bogo_buy_product_id === p.id;
                                  return (
                                    <button key={p.id} type="button" onClick={() => setForm("bogo_buy_product_id", sel ? null : p.id)}
                                      className={`flex items-center justify-between p-2 rounded-lg border-2 text-left w-full ${sel ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30" : "border-gray-200 dark:border-gray-700 hover:border-orange-300"}`}
                                      data-testid={`bogo-buy-product-${p.id}`}>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                      </div>
                                      {sel && <Badge className="bg-orange-500 text-white border-0 text-[10px]">BUY ✓</Badge>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Get product */}
                            <div>
                              <Label className="text-xs font-semibold mb-1.5 block">Get Free Product <span className="text-emerald-600">*</span></Label>
                              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                                {products.filter(p => p.shop_id === (freeItemShopId || formData.shop_id)).map(p => {
                                  const sel = formData.bogo_get_product_id === p.id;
                                  return (
                                    <button key={p.id} type="button" onClick={() => setForm("bogo_get_product_id", sel ? null : p.id)}
                                      className={`flex items-center justify-between p-2 rounded-lg border-2 text-left w-full ${sel ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-gray-700 hover:border-emerald-300"}`}
                                      data-testid={`bogo-get-product-${p.id}`}>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                      </div>
                                      {sel && <Badge className="bg-emerald-500 text-white border-0 text-[10px]">FREE ✓</Badge>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Buy qty */}
                            {formData.bogo_buy_product_id && (
                              <div className="flex items-center gap-3">
                                <Label className="text-xs font-semibold shrink-0">Buy Qty:</Label>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => setForm("bogo_buy_qty", Math.max(1, (formData.bogo_buy_qty || 1) - 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-buy-qty-dec">-</button>
                                  <span className="w-8 text-center text-sm font-bold tabular-nums" data-testid="text-bogo-buy-qty">{formData.bogo_buy_qty || 1}</span>
                                  <button type="button" onClick={() => setForm("bogo_buy_qty", Math.min(10, (formData.bogo_buy_qty || 1) + 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-buy-qty-inc">+</button>
                                </div>
                              </div>
                            )}
                            {/* Get qty */}
                            {formData.bogo_get_product_id && (
                              <div className="flex items-center gap-3">
                                <Label className="text-xs font-semibold shrink-0">Free Qty:</Label>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => setForm("bogo_get_qty", Math.max(1, (formData.bogo_get_qty || 1) - 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-qty-dec">-</button>
                                  <span className="w-8 text-center text-sm font-bold tabular-nums" data-testid="text-bogo-qty">{formData.bogo_get_qty || 1}</span>
                                  <button type="button" onClick={() => setForm("bogo_get_qty", Math.min(10, (formData.bogo_get_qty || 1) + 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-qty-inc">+</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {!(freeItemShopId || formData.shop_id) && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">Select a shop above to see products</p>
                        )}
                      </div>
                    )}

                    {/* Category Offer UI */}
                    {formData.type === "category_offer" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">
                        <Label className="text-xs font-semibold text-violet-700 dark:text-violet-400">🏷️ Category Offer Setup</Label>
                        <p className="text-[10px] text-muted-foreground -mt-1">Select categories from this shop. Discount applies only to items in those categories. At least 1 category required.</p>

                        {/* Category Selector */}
                        {formData.shop_id ? (() => {
                          const shopSubCats = Array.from(new Set(
                            products.filter(p => p.shop_id === formData.shop_id && (p as any).sub_category).map(p => (p as any).sub_category as string)
                          ));
                          if (shopSubCats.length === 0) return (
                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">No category-tagged products found in this shop. Add sub-categories to products first.</p>
                          );
                          return (
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold">Select Categories <span className="text-red-500">*</span></Label>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {shopSubCats.map((cat: string) => {
                                  const selected = Array.isArray(formData.restrict_sub_category) && formData.restrict_sub_category.includes(cat);
                                  return (
                                    <button key={cat} type="button" onClick={() => {
                                      const current: string[] = Array.isArray(formData.restrict_sub_category) ? formData.restrict_sub_category : [];
                                      setForm("restrict_sub_category", selected ? current.filter((c: string) => c !== cat) : [...current, cat]);
                                    }}
                                      className={`text-[11px] px-3 py-1.5 rounded-full border-2 font-semibold transition-all ${selected ? "bg-violet-500 text-white border-violet-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-violet-400"}`}
                                      data-testid={`cat-offer-${cat}`}>{cat}</button>
                                  );
                                })}
                              </div>
                              {(!formData.restrict_sub_category || formData.restrict_sub_category.length === 0) && (
                                <p className="text-[10px] text-red-500 mt-1">Please select at least 1 category</p>
                              )}
                            </div>
                          );
                        })() : (
                          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">Select a shop first to see categories</p>
                        )}

                        {/* Offer Sub-type selector */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-semibold">Offer Type <span className="text-red-500">*</span></Label>
                          <div className="flex gap-2 mt-1.5">
                            {([
                              { value: "percentage", label: "% Off", icon: "%" },
                              { value: "flat", label: "₹ Flat Off", icon: "₹" },
                              { value: "free_item", label: "Free Item", icon: "🎁" },
                            ] as const).map(sub => {
                              const active = formData.category_offer_subtype === sub.value;
                              return (
                                <button key={sub.value} type="button" onClick={() => setForm("category_offer_subtype", sub.value)}
                                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 font-semibold transition-all text-[11px] ${active ? "border-violet-500 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" : "border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-violet-300"}`}
                                  data-testid={`cat-offer-subtype-${sub.value}`}>
                                  <span className="text-sm">{sub.icon}</span>
                                  {sub.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Value input based on sub-type */}
                        {formData.category_offer_subtype === "percentage" && (
                          <div>
                            <Label className="text-[10px] text-muted-foreground font-semibold">Discount %</Label>
                            <div className="relative mt-1">
                              <Input type="number" min="1" max="100" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className="rounded-xl pr-8 h-9 text-sm" placeholder="e.g. 20" data-testid="input-cat-offer-percent" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                            </div>
                          </div>
                        )}
                        {formData.category_offer_subtype === "flat" && (
                          <div>
                            <Label className="text-[10px] text-muted-foreground font-semibold">Flat Discount (₹)</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                              <Input type="number" min="1" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className="rounded-xl pl-7 h-9 text-sm" placeholder="e.g. 300" data-testid="input-cat-offer-flat" />
                            </div>
                          </div>
                        )}
                        {formData.category_offer_subtype === "free_item" && (
                          <p className="text-[10px] text-muted-foreground bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">Free item will be added to cart automatically. Use "Attach Products" section below to select the free item.</p>
                        )}

                        {/* Min Order */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-semibold">Min Order Amount (₹) <span className="font-normal text-muted-foreground">optional</span></Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                            <Input type="number" min="0" value={formData.min_order_amount || ""} onChange={e => setForm("min_order_amount", e.target.value || null)} className="rounded-xl pl-7 h-9 text-sm" placeholder="e.g. 500" data-testid="input-cat-offer-min-order" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Min Order / Spend & Save form */}
                    {formData.type === "min_order" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20">
                        <Label className="text-xs font-semibold text-teal-700 dark:text-teal-400">🛒 Spend & Save Setup</Label>
                        <p className="text-[10px] text-muted-foreground -mt-1">Customer needs to spend a minimum amount to get a discount. Cart lo savings clearly chupistundi.</p>
                        {/* Min order amount */}
                        <div>
                          <Label className="text-xs font-semibold">Minimum Cart Value (₹) <span className="text-red-500">*</span></Label>
                          <div className="relative mt-1.5">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                            <Input type="number" min="1" value={formData.min_order_amount || ""} onChange={e => setForm("min_order_amount", e.target.value || null)} className="rounded-xl pl-8" placeholder="e.g. 5000" data-testid="input-min-order-amount-admin" />
                          </div>
                        </div>
                        {/* Discount type */}
                        <div>
                          <Label className="text-xs font-semibold">Discount Type</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            {[{ v: "percentage", label: "% Percentage" }, { v: "flat", label: "₹ Flat Amount" }].map(opt => (
                              <button key={opt.v} type="button" onClick={() => setForm("category_offer_subtype", opt.v)}
                                className={`p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${(formData.category_offer_subtype || "percentage") === opt.v ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400" : "border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-teal-300"}`}
                                data-testid={`admin-min-order-subtype-${opt.v}`}>{opt.label}</button>
                            ))}
                          </div>
                        </div>
                        {/* Discount value */}
                        <div>
                          <Label className="text-xs font-semibold">{(formData.category_offer_subtype || "percentage") === "percentage" ? "Discount (%)" : "Discount (₹)"}</Label>
                          <div className="relative mt-1.5">
                            {(formData.category_offer_subtype || "percentage") === "flat" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>}
                            <Input type="number" min="1" value={formData.value || ""} onChange={e => setForm("value", e.target.value)} className={`rounded-xl ${(formData.category_offer_subtype || "percentage") === "flat" ? "pl-8" : "pr-8"}`} placeholder={(formData.category_offer_subtype || "percentage") === "percentage" ? "e.g. 10" : "e.g. 500"} data-testid="input-min-order-value-admin" />
                            {(formData.category_offer_subtype || "percentage") === "percentage" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>}
                          </div>
                        </div>
                        {/* Preview */}
                        {formData.min_order_amount && formData.value && (
                          <div className="bg-teal-100 dark:bg-teal-900/30 rounded-xl p-3 text-center">
                            <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                              ₹{Number(formData.min_order_amount).toLocaleString()} spend chesinappudu →{" "}
                              {(formData.category_offer_subtype || "percentage") === "percentage"
                                ? `${formData.value}% off (save ₹${Math.round(Number(formData.min_order_amount) * Number(formData.value) / 100).toLocaleString()}+)`
                                : `₹${Number(formData.value).toLocaleString()} off`}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <Label className="text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <textarea
                        value={formData.description || ""}
                        onChange={e => setForm("description", e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        rows={2}
                        placeholder="e.g. Buy 1kg cake & get ₹100 off. Valid on all flavors."
                        data-testid="input-coupon-description"
                      />
                    </div>

                    {/* Combo Offer form — admin */}
                    {formData.type === "combo" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20">
                        <p className="text-xs font-bold text-orange-700 dark:text-orange-400">📦 Combo Offer Setup</p>
                        <p className="text-[10px] text-muted-foreground -mt-1">Products select cheyyi, combo price set cheyyi. Customer claim chestunte anni items cart lo add avutayi.</p>
                        {!formData.shop_id && <p className="text-xs text-muted-foreground italic">Select a shop above to add combo products</p>}
                        {formData.shop_id && (
                          <>
                            <Input placeholder="Search products..." value={couponProdSearch} onChange={e => setCouponProdSearch(e.target.value)} className="rounded-xl h-8 text-xs" data-testid="input-admin-combo-search" />
                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {products.filter(p => p.shop_id === formData.shop_id && (!couponProdSearch || p.name.toLowerCase().includes(couponProdSearch.toLowerCase()))).map(p => {
                                const existingIdx = bundleItems.findIndex(b => b.product_id === p.id);
                                const inCombo = existingIdx !== -1;
                                const comboItem = inCombo ? bundleItems[existingIdx] : null;
                                return (
                                  <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${inCombo ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30" : "border-gray-200 dark:border-gray-700"}`} data-testid={`admin-combo-item-${p.id}`}>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                                      <p className="text-[10px] text-muted-foreground">MRP: ₹{Number(p.price).toLocaleString()}</p>
                                    </div>
                                    {inCombo && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button type="button" onClick={() => setBundleItems(prev => prev.map((b, i) => i === existingIdx ? { ...b, quantity: Math.max(1, (b.quantity || 1) - 1) } : b))}
                                          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-xs flex items-center justify-center" data-testid={`admin-combo-qty-dec-${p.id}`}>-</button>
                                        <span className="text-xs font-bold w-5 text-center">{comboItem!.quantity || 1}</span>
                                        <button type="button" onClick={() => setBundleItems(prev => prev.map((b, i) => i === existingIdx ? { ...b, quantity: (b.quantity || 1) + 1 } : b))}
                                          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-xs flex items-center justify-center" data-testid={`admin-combo-qty-inc-${p.id}`}>+</button>
                                      </div>
                                    )}
                                    {!inCombo ? (
                                      <button type="button" onClick={() => setBundleItems(prev => [...prev, { product_id: p.id, custom_price: String(p.price || "0"), name: p.name, quantity: 1 }])}
                                        className="text-[10px] px-2.5 py-1 rounded-lg border border-orange-400 text-orange-600 hover:bg-orange-100 font-semibold shrink-0" data-testid={`admin-combo-add-${p.id}`}>+ Add</button>
                                    ) : (
                                      <button type="button" onClick={() => setBundleItems(prev => prev.filter(b => b.product_id !== p.id))}
                                        className="text-[10px] px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-semibold shrink-0" data-testid={`admin-combo-remove-${p.id}`}>Remove</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Single Combo Price field */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400">Total Combo Price (₹)</Label>
                              <p className="text-[10px] text-muted-foreground -mt-1">Anni items kalisi yentha ki isthunnam</p>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                                <Input type="number" min="0" placeholder="e.g. 299" value={formData.value || ""}
                                  onChange={e => setForm("value", e.target.value)}
                                  className="rounded-xl pl-8 font-semibold" data-testid="input-admin-combo-total-price" />
                              </div>
                            </div>
                            {bundleItems.length > 0 && formData.value && (
                              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-3">
                                {(() => {
                                  const totalMRP = bundleItems.reduce((s, b) => {
                                    const prod = products.find(p => p.id === b.product_id);
                                    return s + (parseFloat(String(prod?.price || "0")) * (b.quantity || 1));
                                  }, 0);
                                  const comboPrice = parseFloat(formData.value || "0");
                                  const saved = totalMRP - comboPrice;
                                  return (
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-[10px] text-orange-700 dark:text-orange-300 font-semibold">{bundleItems.reduce((s, b) => s + (b.quantity || 1), 0)} items in combo</p>
                                        <p className="text-[10px] text-muted-foreground">Total MRP: <span className="line-through">₹{totalMRP.toLocaleString()}</span></p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-black text-orange-700 dark:text-orange-300">Combo: ₹{comboPrice.toLocaleString()}</p>
                                        {saved > 0 && <p className="text-[10px] text-emerald-600 font-bold">Customer saves ₹{saved.toLocaleString()}</p>}
                                        {saved < 0 && <p className="text-[10px] text-red-500 font-bold">Price exceeds MRP!</p>}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Optional Products Section — available for non-combo coupon types */}
                    {formData.type !== "combo" && (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">📦 Attach Products / Services <span className="text-[10px] font-normal text-muted-foreground ml-1">Optional</span></p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">When user claims this coupon, selected products auto-add to cart. If none selected, normal offer applies.</p>
                        </div>
                      </div>
                      {/* Restrict to category — hidden for category_offer (has its own dedicated UI) */}
                      {formData.shop_id && formData.type !== "category_offer" && (() => {
                        const shopSubCats = Array.from(new Set(
                          products.filter(p => p.shop_id === formData.shop_id && (p as any).sub_category).map(p => (p as any).sub_category as string)
                        ));
                        if (shopSubCats.length === 0) return null;
                        return (
                          <div>
                            <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400">🎯 Restrict to Categories <span className="font-normal text-muted-foreground">(optional — select multiple)</span></Label>
                            <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">If set, discount applies ONLY to items in selected categories. Leave blank for entire order.</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => setForm("restrict_sub_category", [])}
                                className={`text-[11px] px-3 py-1 rounded-full border font-semibold transition-all ${!formData.restrict_sub_category || formData.restrict_sub_category.length === 0 ? "bg-blue-500 text-white border-blue-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-blue-400"}`}
                                data-testid="cat-restrict-all">All items</button>
                              {shopSubCats.map((cat: string) => {
                                const selected = Array.isArray(formData.restrict_sub_category) && formData.restrict_sub_category.includes(cat);
                                return (
                                  <button key={cat} type="button" onClick={() => {
                                    const current: string[] = Array.isArray(formData.restrict_sub_category) ? formData.restrict_sub_category : [];
                                    setForm("restrict_sub_category", selected ? current.filter((c: string) => c !== cat) : [...current, cat]);
                                  }}
                                    className={`text-[11px] px-3 py-1 rounded-full border font-semibold transition-all ${selected ? "bg-orange-500 text-white border-orange-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-orange-400"}`}
                                    data-testid={`cat-restrict-${cat}`}>{cat}</button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
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
                                      <button type="button" onClick={() => setBundleItems(prev => [...prev, { product_id: p.id, custom_price: p.price ? p.price.toString() : "0", name: p.name, quantity: 1 }])} className="text-[11px] text-blue-600 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20">Add</button>
                                    )}
                                  </div>
                                );
                              })}
                            {products.filter(p => p.shop_id === formData.shop_id).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No products in this shop</p>}
                          </div>
                          {bundleItems.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <p className="text-[11px] font-semibold text-muted-foreground">Attached ({bundleItems.length}) — set offer prices & quantity:</p>
                              {bundleItems.map((item, idx) => (
                                <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border border-blue-200 dark:border-blue-800">
                                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex-1 truncate min-w-0">{item.name}</span>
                                  <div className="relative w-20 shrink-0">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                                    <Input type="number" value={item.custom_price} onChange={e => setBundleItems(prev => prev.map((b, i) => i === idx ? { ...b, custom_price: e.target.value } : b))} className="h-7 text-xs rounded-lg pl-5 pr-1" data-testid={`input-attach-price-${item.product_id}`} />
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button type="button" onClick={() => setBundleItems(prev => prev.map((b, i) => i === idx ? { ...b, quantity: Math.max(1, (b.quantity || 1) - 1) } : b))} className="w-6 h-6 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800" data-testid={`button-qty-dec-${item.product_id}`}>-</button>
                                    <span className="w-5 text-center text-xs font-bold" data-testid={`text-qty-${item.product_id}`}>{item.quantity || 1}</span>
                                    <button type="button" onClick={() => setBundleItems(prev => prev.map((b, i) => i === idx ? { ...b, quantity: Math.min(99, (b.quantity || 1) + 1) } : b))} className="w-6 h-6 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800" data-testid={`button-qty-inc-${item.product_id}`}>+</button>
                                  </div>
                                  <button type="button" onClick={() => setBundleItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-0.5 shrink-0" data-testid={`button-remove-bundle-${item.product_id}`}><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    )}

                    {/* Expiry Date */}
                    <div>
                      <Label className="text-xs font-semibold">Expiry Date (optional)</Label>
                      <Input type="date" value={formData.expiry_date ? new Date(formData.expiry_date).toISOString().split("T")[0] : ""} onChange={e => setForm("expiry_date", e.target.value || null)} className="mt-1.5 rounded-xl" data-testid="input-coupon-expiry" />
                    </div>

                    {/* Usage Limit */}
                    <div>
                      <Label className="text-xs font-semibold">Usage Limit (optional)</Label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">Max number of times this coupon can be claimed. Leave blank for unlimited.</p>
                      <Input type="number" min="1" value={formData.usage_limit || ""} onChange={e => setForm("usage_limit", e.target.value ? parseInt(e.target.value) : null)} className="mt-1.5 rounded-xl" placeholder="e.g. 10 (unlimited if blank)" data-testid="input-coupon-usage-limit" />
                      {formData.usage_limit && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                          Only {formData.usage_limit} customers can use this coupon
                          {formData.usage_count > 0 && ` · ${formData.usage_count} used so far`}
                        </p>
                      )}
                    </div>

                    {/* Banner Image */}
                    <div>
                      <Label className="text-xs font-semibold">Banner Image (optional)</Label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">Shown at top of coupon card. Use a wide image (e.g. 800×320px).</p>
                      <div className="flex gap-2 items-center mt-1.5">
                        <Input
                          value={formData.banner_image || ""}
                          onChange={e => setForm("banner_image", e.target.value)}
                          className="rounded-xl flex-1 text-sm"
                          placeholder="https://... or upload a file →"
                          data-testid="input-coupon-banner"
                        />
                        <UploadBtn fieldKey="coupon-banner" onUrl={url => setForm("banner_image", url)} />
                      </div>
                      {formData.banner_image && (
                        <div className="mt-2 relative">
                          <img src={formData.banner_image} alt="Banner preview" className="w-full h-24 object-cover rounded-xl border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <button type="button" onClick={() => setForm("banner_image", "")} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-red-500/80 transition-colors">✕</button>
                        </div>
                      )}
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
                          { key: "is_contest_coupon", label: "Contest Coupon", desc: "Use as contest prize",
                            onCls: "border-amber-400 bg-amber-50 dark:bg-amber-900/20", textCls: "text-amber-700 dark:text-amber-400", trackCls: "bg-amber-500" },
                        ] as const).map(({ key, label, desc, onCls, textCls, trackCls }) => {
                          const checked = key === "is_active" ? (formData[key as keyof typeof formData] ?? true) : (formData[key as keyof typeof formData] ?? false);
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
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search by customer name, phone or order ID..." className="pl-8 rounded-xl h-9 text-sm" data-testid="input-order-search" />
                </div>
              </div>
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Order</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Customer</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Phone</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Shop</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Amount</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Date</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {orders.filter(order => !orderSearch || order.id.toLowerCase().includes(orderSearch.toLowerCase()) || (order as any).user?.name?.toLowerCase().includes(orderSearch.toLowerCase()) || (order as any).user?.phone?.includes(orderSearch) || (order as any).shop_name?.toLowerCase().includes(orderSearch.toLowerCase())).map(order => (
                          <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer" data-testid={`row-order-${order.id}`} onClick={() => setSelectedOrderId(order.id)}>
                            <td className="px-5 py-3.5">
                              <button className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline" data-testid={`button-order-detail-${order.id}`}>#{order.id.slice(0, 8).toUpperCase()}</button>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{(order as any).user?.name || "Unknown"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {(order as any).user?.phone ? (
                                <a href={`tel:+91${(order as any).user.phone}`} className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()} data-testid={`link-order-phone-${order.id}`}>
                                  <Phone className="w-3 h-3" />+91 {(order as any).user.phone}
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{order.shop_name || "—"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">₹{parseFloat(order.final_amount as string).toLocaleString()}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
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
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
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

              {/* Order Detail Dialog */}
              <Dialog open={!!selectedOrderId} onOpenChange={open => { if (!open) setSelectedOrderId(null); }}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      Order Details
                    </DialogTitle>
                  </DialogHeader>
                  {orderDetailLoading ? (
                    <div className="flex flex-col gap-3 py-4">
                      {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-8 rounded-xl" />)}
                    </div>
                  ) : selectedOrderDetail ? (
                    <div className="flex flex-col gap-5 pb-2">
                      {/* Order ID + Status */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Order ID</p>
                          <p className="font-mono font-bold text-gray-900 dark:text-white">#{selectedOrderDetail.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(selectedOrderDetail.created_at).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-right">
                          <Select
                            value={selectedOrderDetail.status}
                            onValueChange={v => { updateOrderStatus.mutate({ id: selectedOrderDetail.id, status: v }); queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", selectedOrderId] }); }}
                          >
                            <SelectTrigger className={`rounded-xl text-xs ${STATUS_COLORS[selectedOrderDetail.status] || ""} border-0`} data-testid="select-detail-order-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customer</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-white">{selectedOrderDetail.user?.name || "Unknown"}</span>
                          </div>
                          {selectedOrderDetail.user?.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">{selectedOrderDetail.user.email}</span>
                            </div>
                          )}
                          {(selectedOrderDetail.user as any)?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-green-500 shrink-0" />
                              <a href={`tel:+91${(selectedOrderDetail.user as any).phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">+91 {(selectedOrderDetail.user as any).phone}</a>
                            </div>
                          )}
                          {(selectedOrderDetail.user as any)?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
                              <span className="text-muted-foreground">{(selectedOrderDetail.user as any).address}</span>
                            </div>
                          )}
                          {(selectedOrderDetail as any)?.customer_location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                              <a
                                href={`https://maps.google.com/?q=${(selectedOrderDetail as any).customer_location}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                                data-testid="link-admin-customer-location"
                              >
                                📍 Customer Location (GPS)
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shop */}
                      {selectedOrderDetail.shop_name && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shop</p>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{selectedOrderDetail.shop_name}</p>
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Order Items ({selectedOrderDetail.items?.length || 0})</p>
                        <div className="flex flex-col gap-2">
                          {(selectedOrderDetail.items || []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}{item.is_free_item ? " 🎁" : ""}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <span className="font-semibold text-sm text-gray-900 dark:text-white shrink-0">
                                {item.is_free_item ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">FREE</Badge> : `₹${(parseFloat(item.price as string) * item.quantity).toLocaleString()}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 rounded-2xl p-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>₹{parseFloat(selectedOrderDetail.total_amount as string).toLocaleString()}</span>
                          </div>
                          {parseFloat(selectedOrderDetail.discount_amount as string) > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                              <span>Discount {selectedOrderDetail.coupon_code && `(${selectedOrderDetail.coupon_code})`}</span>
                              <span>-₹{parseFloat(selectedOrderDetail.discount_amount as string).toFixed(0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-700">
                            <span>Total</span>
                            <span className="text-lg">₹{parseFloat(selectedOrderDetail.final_amount as string).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Payment</span>
                            <span className="capitalize">{selectedOrderDetail.payment_status || "unpaid"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "banners" && <BannersTab toast={toast} allCoupons={coupons} />}

          {activeTab === "offline-coupons" && <OfflineCouponsTab toast={toast} />}

          {activeTab === "contests" && <AdminContestsTab toast={toast} />}

          {activeTab === "settings" && <SiteSettingsTab toast={toast} />}

        </main>
      </div>
    </div>
  );
}

function SiteSettingsTab({ toast }: { toast: any }) {
  const { data: settings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.admin_whatsapp) setAdminWhatsapp(settings.admin_whatsapp);
  }, [settings]);

  const handleSave = async () => {
    const cleaned = adminWhatsapp.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast({ title: "Enter a valid WhatsApp number (min 10 digits)", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/admin/settings", { key: "admin_whatsapp", value: cleaned });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved!", description: "Admin WhatsApp number updated." });
    } catch (err: any) {
      toast({ title: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Site Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage global settings for CouponsHub X</p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Admin WhatsApp</h3>
              <p className="text-xs text-muted-foreground">Users can optionally send all orders to this number</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-whatsapp">WhatsApp Number (with country code)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">+</span>
              <Input
                id="admin-whatsapp"
                type="tel"
                inputMode="numeric"
                placeholder="919876543210"
                value={adminWhatsapp}
                onChange={e => setAdminWhatsapp(e.target.value.replace(/[^\d+]/g, ""))}
                className="h-12 rounded-xl pl-8 font-mono"
                data-testid="input-admin-whatsapp"
              />
            </div>
            <p className="text-xs text-muted-foreground">Example: 919876543210 (91 = India code + 10-digit number)</p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 border-0 font-semibold w-full"
            data-testid="button-save-settings"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
          </Button>
        </CardContent>
      </Card>
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Banners</h2>
            {banners.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {banners.length} added
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage homepage coupon banners · slides every 3 sec</p>
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

function OfflineCouponsTab({ toast }: { toast: any }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codesDialogOpen, setCodesDialogOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    shop_id: "",
    title: "",
    description: "",
    total_codes: "10",
    banner_image: "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const { data: offlineCoupons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/offline-coupons"],
  });

  const { data: shops = [] } = useQuery<any[]>({ queryKey: ["/api/shops"] });

  const { data: selectedCodes = [], isLoading: codesLoading } = useQuery<any[]>({
    queryKey: ["/api/offline-coupons", selectedCouponId, "codes"],
    queryFn: async () => {
      if (!selectedCouponId) return [];
      const token = localStorage.getItem("coupons_hub_token");
      const res = await fetch(`/api/offline-coupons/${selectedCouponId}/codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!selectedCouponId && codesDialogOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/offline-coupons/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/offline-coupons"] }); toast({ title: "Deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => apiRequest("PATCH", `/api/offline-coupons/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/offline-coupons"] }),
  });

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!bannerFile && !form.banner_image.trim()) { toast({ title: "Banner image is required", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const token = localStorage.getItem("coupons_hub_token");
      const fd = new FormData();
      if (bannerFile) fd.append("banner", bannerFile);
      fd.append("title", form.title.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (form.shop_id) fd.append("shop_id", form.shop_id);
      fd.append("total_codes", form.total_codes || "10");
      if (!bannerFile && form.banner_image) fd.append("banner_image", form.banner_image);
      const res = await fetch("/api/offline-coupons", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offline-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offline-coupons"] });
      toast({ title: `Created! ${form.total_codes || 10} codes auto-generated.` });
      setDialogOpen(false);
      setForm({ shop_id: "", title: "", description: "", total_codes: "10", banner_image: "" });
      setBannerFile(null);
      setBannerPreview(null);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Offline Coupons</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload banners — auto-generate unique printable coupon codes</p>
        </div>
        <Button
          onClick={() => { setDialogOpen(true); setForm({ shop_id: "", title: "", description: "", total_codes: "10", banner_image: "" }); setBannerFile(null); setBannerPreview(null); }}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white gap-2"
          data-testid="button-add-offline-coupon"
        >
          <Plus className="w-4 h-4" /> Add Offline Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : offlineCoupons.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-950/40 dark:to-violet-950/40 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-blue-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">No offline coupons yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first offline coupon banner</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offlineCoupons.map((oc: any) => (
            <div key={oc.id} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900" data-testid={`card-offline-coupon-${oc.id}`}>
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img src={oc.banner_image} alt={oc.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${oc.is_active ? "bg-emerald-500 text-white" : "bg-gray-400 text-white"}`}>
                    {oc.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{oc.title}</p>
                {oc.shop && <p className="text-xs text-muted-foreground mt-0.5 truncate">{oc.shop.name}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                      style={{ width: `${Math.max(5, (oc.claimed_count / oc.total_codes) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{oc.claimed_count}/{oc.total_codes} claimed</span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedCouponId(oc.id); setCodesDialogOpen(true); }}
                    className="rounded-xl h-8 gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/20"
                    data-testid={`button-view-codes-${oc.id}`}
                  >
                    <Download className="w-3 h-3" /> Codes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: oc.id, is_active: !oc.is_active })}
                    className={`rounded-xl h-8 gap-1.5 ${oc.is_active ? "text-amber-600 border-amber-200" : "text-emerald-600 border-emerald-200"}`}
                    data-testid={`button-toggle-offline-coupon-${oc.id}`}
                  >
                    {oc.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {oc.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (confirm("Delete this offline coupon?")) deleteMutation.mutate(oc.id); }}
                    className="rounded-xl h-8 text-red-500 hover:text-red-600 border-red-200"
                    data-testid={`button-delete-offline-coupon-${oc.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-violet-500" /> New Offline Coupon
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <Label>Shop (optional)</Label>
              <Select value={form.shop_id} onValueChange={v => setForm(f => ({ ...f, shop_id: v }))}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                className="mt-1 rounded-xl"
                placeholder="e.g. Festive Sale — 20% Off"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                data-testid="input-offline-coupon-title"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1 rounded-xl resize-none"
                rows={2}
                placeholder="Valid on all items. Show at store."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Number of Codes (default 10)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                className="mt-1 rounded-xl"
                value={form.total_codes}
                onChange={e => setForm(f => ({ ...f, total_codes: e.target.value }))}
              />
            </div>

            <div>
              <Label>Banner Image *</Label>
              <div className="mt-1 flex flex-col gap-2">
                {bannerPreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                    <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                    >✕</button>
                  </div>
                ) : form.banner_image ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                    <img src={form.banner_image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, banner_image: "" }))}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                    >✕</button>
                  </div>
                ) : null}

                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-violet-400 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload banner image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} data-testid="input-offline-coupon-banner" />
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-muted-foreground">or paste URL</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
                <Input
                  className="rounded-xl"
                  placeholder="https://example.com/banner.jpg"
                  value={form.banner_image}
                  onChange={e => { setForm(f => ({ ...f, banner_image: e.target.value })); setBannerFile(null); setBannerPreview(null); }}
                />
              </div>
            </div>

            <div className="mt-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                {form.total_codes || 10} unique coupon codes will be auto-generated when you create this banner.
                Each user can claim only 1 code. Codes include the shop name prefix for easy identification.
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={uploading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white h-11"
              data-testid="button-create-offline-coupon"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : `Create & Generate ${form.total_codes || 10} Codes`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Codes Dialog */}
      <Dialog open={codesDialogOpen} onOpenChange={open => { setCodesDialogOpen(open); if (!open) setSelectedCouponId(null); }}>
        <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-violet-500" /> Coupon Codes
            </DialogTitle>
          </DialogHeader>
          {codesLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{selectedCodes.filter((c: any) => c.claimed_by_user_id).length} claimed / {selectedCodes.length} total</span>
                <span className="text-emerald-600 font-semibold">{selectedCodes.filter((c: any) => !c.claimed_by_user_id).length} remaining</span>
              </div>
              {selectedCodes.map((code: any) => (
                <div
                  key={code.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                    code.claimed_by_user_id
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30"
                      : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
                  }`}
                  data-testid={`code-row-${code.id}`}
                >
                  <span className={`font-mono font-bold text-sm tracking-wider ${code.claimed_by_user_id ? "text-orange-700 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {code.code}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    code.claimed_by_user_id
                      ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {code.claimed_by_user_id ? "Claimed" : "Available"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminContestsTab({ toast }: { toast: any }) {
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ shop_id: "", title: "", description: "", prize_description: "", banner_image: "", total_slots: 20, attached_coupon_id: "", end_time: "" });
  const [editContest, setEditContest] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", prize_description: "", banner_image: "", total_slots: 20, attached_coupon_id: "", end_time: "" });

  const { data: allContests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/contests"],
  });

  const { data: allShops = [] } = useQuery<any[]>({ queryKey: ["/api/shops"] });

  const { data: shopContestCoupons = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/shops", createForm.shop_id, "contest-coupons"],
    queryFn: () => apiRequest("GET", `/api/admin/shops/${createForm.shop_id}/contest-coupons`),
    enabled: !!createForm.shop_id,
  });

  const createContestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/contests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      setShowCreateForm(false);
      setCreateForm({ shop_id: "", title: "", description: "", prize_description: "", banner_image: "", total_slots: 20, attached_coupon_id: "", end_time: "" });
      toast({ title: "Contest created!" });
    },
    onError: (e: any) => toast({ title: e.message || "Failed", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/contests/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] }); toast({ title: "Status updated" }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const drawWinnerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/contests/${id}/draw`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] }); toast({ title: "Winner drawn!" }); setSelectedContest(null); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteContestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/contests/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] }); toast({ title: "Contest deleted" }); setSelectedContest(null); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const editContestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/contests/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] }); setEditContest(null); toast({ title: "Contest updated!" }); },
    onError: (e: any) => toast({ title: e.message || "Failed", variant: "destructive" }),
  });

  const { data: editShopCoupons = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/shops", editContest?.shop_id, "contest-coupons"],
    queryFn: () => apiRequest("GET", `/api/admin/shops/${editContest?.shop_id}/contest-coupons`),
    enabled: !!editContest?.shop_id,
  });

  const filtered = statusFilter === "all" ? allContests : allContests.filter((c: any) => c.status === statusFilter);

  const stats = {
    total: allContests.length,
    open: allContests.filter((c: any) => c.status === "open").length,
    completed: allContests.filter((c: any) => c.status === "completed").length,
    participants: allContests.reduce((sum: number, c: any) => sum + (c.slots?.length || 0), 0),
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Contests</h2>
            <p className="text-xs text-muted-foreground">View and manage all shop contests</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(v => !v)}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 border-0 shadow-md shadow-amber-500/25 text-white"
          data-testid="button-admin-create-contest">
          <Plus className="w-4 h-4 mr-1" /> New Contest
        </Button>
      </div>

      {/* Create Contest Form */}
      {showCreateForm && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800/50 rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Create New Contest</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Select Shop *</Label>
                <Select value={createForm.shop_id} onValueChange={v => setCreateForm(f => ({ ...f, shop_id: v, attached_coupon_id: "" }))}>
                  <SelectTrigger className="mt-1 rounded-xl" data-testid="select-admin-contest-shop">
                    <SelectValue placeholder="Choose a shop..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(allShops as any[]).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Contest Title *</Label>
                <Input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Diwali Lucky Draw" className="mt-1 rounded-xl" data-testid="input-admin-contest-title" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Description</Label>
                <Input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this contest about?" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Prize Description 🎁</Label>
                <Input value={createForm.prize_description} onChange={e => setCreateForm(f => ({ ...f, prize_description: e.target.value }))}
                  placeholder="e.g. Gift voucher worth ₹500" className="mt-1 rounded-xl" data-testid="input-admin-contest-prize" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Attach Contest Coupon 🏆 (optional)</Label>
                {!createForm.shop_id ? (
                  <div className="mt-1 p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-muted-foreground border">Select a shop first</div>
                ) : shopContestCoupons.length === 0 ? (
                  <div className="mt-1 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 border border-amber-200">No contest coupons for this shop</div>
                ) : (
                  <Select value={createForm.attached_coupon_id} onValueChange={v => setCreateForm(f => ({ ...f, attached_coupon_id: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1 rounded-xl" data-testid="select-admin-contest-coupon">
                      <SelectValue placeholder="Select coupon..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(shopContestCoupons as any[]).map((cp: any) => (
                        <SelectItem key={cp.id} value={cp.id}>
                          {cp.code} — {cp.type === "percentage" ? `${cp.value}% off` : cp.type === "flat" ? `₹${cp.value} off` : cp.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Auto-Draw End Time (optional)</Label>
                <Input type="datetime-local" value={createForm.end_time} onChange={e => setCreateForm(f => ({ ...f, end_time: e.target.value }))}
                  className="mt-1 rounded-xl" data-testid="input-admin-contest-end-time" />
                <p className="text-xs text-muted-foreground mt-1">Winner auto-drawn at this time</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Banner Image URL (optional)</Label>
                <Input value={createForm.banner_image} onChange={e => setCreateForm(f => ({ ...f, banner_image: e.target.value }))}
                  placeholder="https://..." className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Total Slots</Label>
                <Select value={String(createForm.total_slots)} onValueChange={v => setCreateForm(f => ({ ...f, total_slots: Number(v) }))}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 Slots</SelectItem>
                    <SelectItem value="30">30 Slots</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={() => createContestMutation.mutate({ ...createForm, attached_coupon_id: createForm.attached_coupon_id || null, end_time: createForm.end_time || null })}
                disabled={createContestMutation.isPending || !createForm.title || !createForm.shop_id}
                className="bg-gradient-to-r from-amber-400 to-orange-500 border-0 rounded-xl"
                data-testid="button-admin-contest-submit">
                {createContestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Contest"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Contest Form */}
      {editContest && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800/50 rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Edit Contest: {editContest.title}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Contest Title *</Label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Diwali Lucky Draw" className="mt-1 rounded-xl" data-testid="input-admin-edit-contest-title" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Description</Label>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this contest about?" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Prize Description</Label>
                <Input value={editForm.prize_description} onChange={e => setEditForm(f => ({ ...f, prize_description: e.target.value }))}
                  placeholder="e.g. Gift voucher worth ₹500" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Attach Contest Coupon (optional)</Label>
                {editShopCoupons.length === 0 ? (
                  <div className="mt-1 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 border border-amber-200">No contest coupons for this shop</div>
                ) : (
                  <Select value={editForm.attached_coupon_id} onValueChange={v => setEditForm(f => ({ ...f, attached_coupon_id: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select coupon..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(editShopCoupons as any[]).map((cp: any) => (
                        <SelectItem key={cp.id} value={cp.id}>
                          {cp.code} — {cp.type === "percentage" ? `${cp.value}% off` : cp.type === "flat" ? `₹${cp.value} off` : cp.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Auto-Draw End Time (optional)</Label>
                <Input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                  className="mt-1 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Winner auto-drawn at this time</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Total Slots (1-100)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={editForm.total_slots}
                  onChange={e => setEditForm(f => ({ ...f, total_slots: parseInt(e.target.value) || 20 }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Banner Image URL (optional)</Label>
                <Input value={editForm.banner_image} onChange={e => setEditForm(f => ({ ...f, banner_image: e.target.value }))}
                  placeholder="https://..." className="mt-1 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setEditContest(null)} className="rounded-xl">Cancel</Button>
              <Button onClick={() => editContestMutation.mutate({ id: editContest.id, data: { ...editForm, attached_coupon_id: editForm.attached_coupon_id || null, end_time: editForm.end_time || null } })}
                disabled={editContestMutation.isPending || !editForm.title}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 rounded-xl"
                data-testid="button-admin-edit-contest-submit">
                {editContestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Contests", value: stats.total, icon: Trophy, color: "from-amber-400 to-orange-500" },
          { label: "Open", value: stats.open, icon: Zap, color: "from-emerald-400 to-teal-500" },
          { label: "Completed", value: stats.completed, icon: Star, color: "from-violet-400 to-purple-500" },
          { label: "Total Participants", value: stats.participants, icon: Users, color: "from-blue-400 to-cyan-500" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-md rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-black text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-[11px] text-muted-foreground font-medium">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "open", "closed", "completed"].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} data-testid={`filter-contest-${f}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === f
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300"
            }`}>
            {f === "all" ? "All" : f === "open" ? "🔥 Open" : f === "closed" ? "⏸️ Closed" : "🏆 Completed"}
          </button>
        ))}
      </div>

      {/* Contest list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No contests found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c: any) => {
            const filled = c.slots?.length || 0;
            const pct = c.total_slots > 0 ? Math.round((filled / c.total_slots) * 100) : 0;
            return (
              <Card key={c.id} className="border-0 shadow-md rounded-2xl overflow-hidden" data-testid={`admin-contest-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`text-[10px] border-0 font-bold ${
                          c.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          c.status === "completed" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {c.status === "open" ? "🔥 Open" : c.status === "completed" ? "🏆 Completed" : "⏸️ Closed"}
                        </Badge>
                        {c.shop && (
                          <span className="text-xs text-muted-foreground font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            🏪 {c.shop.name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{c.title}</h3>
                      {c.prize_description && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">🎁 {c.prize_description}</p>
                      )}
                      {c.end_time && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">⏰ Auto-draw: {new Date(c.end_time).toLocaleString()}</p>
                      )}
                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                          <span>{filled} / {c.total_slots} slots filled</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {c.status === "completed" && c.winner_user_name && (
                        <div className="mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
                          <span className="text-base">🏆</span>
                          <div>
                            <span className="text-xs text-muted-foreground">Winner: </span>
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{c.winner_user_name}</span>
                            <span className="text-xs text-muted-foreground ml-1">(Slot #{c.winner_slot_number})</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => { setEditContest(c); setEditForm({ title: c.title || "", description: c.description || "", prize_description: c.prize_description || "", banner_image: c.banner_image || "", total_slots: c.total_slots || 20, attached_coupon_id: c.attached_coupon_id || "", end_time: c.end_time ? new Date(c.end_time).toISOString().slice(0, 16) : "" }); setShowCreateForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="rounded-xl text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/20"
                        data-testid={`button-admin-edit-contest-${c.id}`}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedContest(selectedContest?.id === c.id ? null : c)}
                        className="rounded-xl text-xs h-8" data-testid={`button-admin-view-contest-${c.id}`}>
                        {selectedContest?.id === c.id ? "Hide" : "Participants"}
                      </Button>
                      {c.status !== "completed" && filled > 0 && (
                        <Button size="sm" onClick={() => drawWinnerMutation.mutate(c.id)} disabled={drawWinnerMutation.isPending}
                          className="rounded-xl text-xs h-8 bg-gradient-to-r from-amber-400 to-orange-500 border-0"
                          data-testid={`button-admin-draw-${c.id}`}>
                          {drawWinnerMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "🎲 Draw Winner"}
                        </Button>
                      )}
                      {c.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: c.id, status: "closed" })}
                          disabled={updateStatusMutation.isPending} className="rounded-xl text-xs h-8 text-gray-500">
                          ⏸️ Close
                        </Button>
                      )}
                      {c.status === "closed" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: c.id, status: "open" })}
                          disabled={updateStatusMutation.isPending} className="rounded-xl text-xs h-8 text-emerald-600">
                          Reopen
                        </Button>
                      )}
                      <Button size="sm" variant="outline"
                        onClick={() => { if (window.confirm(`Delete "${c.title}"? This cannot be undone.`)) deleteContestMutation.mutate(c.id); }}
                        disabled={deleteContestMutation.isPending}
                        className="rounded-xl text-xs h-8 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                        data-testid={`button-admin-delete-contest-${c.id}`}>
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Participants expanded */}
                  {selectedContest?.id === c.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Participants ({filled})
                      </p>
                      {filled === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No participants yet</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {(c.slots || []).map((slot: any) => (
                            <div key={slot.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                c.winner_slot_number === slot.slot_number
                                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400 ring-offset-1"
                                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              }`}
                              data-testid={`admin-participant-${slot.slot_number}`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                                {slot.slot_number}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {c.winner_slot_number === slot.slot_number ? "🏆 " : ""}{slot.user_name}
                                </p>
                                {slot.user_email && (
                                  <p className="text-[10px] text-muted-foreground truncate">{slot.user_email}</p>
                                )}
                                <p className="text-[9px] text-muted-foreground">{new Date(slot.joined_at).toLocaleDateString("en-IN")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
