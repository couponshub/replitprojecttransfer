import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store, Package, Ticket, LogOut, Plus, Edit, Trash2, Save,
  Zap, Tag, Phone, MapPin, Globe, Check, ChevronRight,
  WifiOff, Download, Eye, EyeOff, Upload, Loader2, Image, Link,
  ShoppingBag, User, IndianRupee, Clock, CheckCircle, X, Trophy, Gift, Users, KeyRound
} from "lucide-react";

type VTab = "shop" | "products" | "coupons" | "offline-coupons" | "orders" | "contests";

function getVendorToken() {
  return localStorage.getItem("vendor_token");
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

async function vendorFormFetch(url: string, body: FormData) {
  const token = getVendorToken();
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { "x-vendor-token": token } : {},
    body,
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

  useEffect(() => {
    const token = getVendorToken();
    if (!token) { navigate("/login"); return; }
    vendorFetch("/api/vendor/me")
      .then(v => { setVendorInfo(v); setAuthChecked(true); })
      .catch(() => { localStorage.removeItem("vendor_token"); navigate("/login"); });
  }, []);

  const { data: shop, isLoading: shopLoading, refetch: refetchShop } = useQuery<any>({
    queryKey: ["/api/vendor/shop"],
    queryFn: () => vendorFetch("/api/vendor/shop"),
    enabled: authChecked,
  });

  const { data: vendorOrders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/vendor/orders"],
    queryFn: () => vendorFetch("/api/vendor/orders"),
    enabled: authChecked,
    refetchInterval: tab === "orders" ? 30000 : false,
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [accForm, setAccForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [accPwVisible, setAccPwVisible] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string; password?: string }) =>
      vendorFetch("/api/vendor/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (updated: any) => {
      setVendorInfo((prev: any) => ({ ...prev, name: updated.name, email: updated.email }));
      setAccountOpen(false);
      setAccForm({ name: "", email: "", password: "", confirm: "" });
      toast({ title: "Account updated", description: "Your login details have been saved." });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const handleSaveAccount = () => {
    if (accForm.password && accForm.password !== accForm.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    const payload: any = {};
    if (accForm.name.trim()) payload.name = accForm.name.trim();
    if (accForm.email.trim()) payload.email = accForm.email.trim();
    if (accForm.password) payload.password = accForm.password;
    if (Object.keys(payload).length === 0) { toast({ title: "No changes made" }); return; }
    updateProfileMutation.mutate(payload);
  };

  const [selectedVendorOrder, setSelectedVendorOrder] = useState<any>(null);
  const [vendorOrderSearch, setVendorOrderSearch] = useState("");

  const updateVendorOrderStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      vendorFetch(`/api/vendor/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      setSelectedVendorOrder((prev: any) => prev ? { ...prev, status: updated?.status ?? prev.status } : prev);
      toast({ title: "Order status updated" });
    },
    onError: (e: any) => toast({ title: e.message || "Failed to update status", variant: "destructive" }),
  });

  const { data: vendorContests = [], isLoading: contestsLoading, refetch: refetchContests } = useQuery<any[]>({
    queryKey: ["/api/vendor/contests"],
    queryFn: () => vendorFetch("/api/vendor/contests"),
    enabled: authChecked && tab === "contests",
  });

  const [showContestForm, setShowContestForm] = useState(false);
  const [contestForm, setContestForm] = useState({ title: "", description: "", prize_description: "", banner_image: "", total_slots: 20, attached_coupon_id: "", end_time: "" });
  const [editContest, setEditContest] = useState<any>(null);
  const [editContestForm, setEditContestForm] = useState({ title: "", description: "", prize_description: "", banner_image: "", total_slots: 20, attached_coupon_id: "", end_time: "" });
  const { data: contestCoupons = [] } = useQuery<any[]>({
    queryKey: ["/api/vendor/coupons/contest"],
    queryFn: () => vendorFetch("/api/vendor/coupons/contest"),
    enabled: authChecked && tab === "contests",
  });
  const createContestMutation = useMutation({
    mutationFn: (data: any) => vendorFetch("/api/vendor/contests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vendor/contests"] }); setShowContestForm(false); setContestForm({ title: "", description: "", prize_description: "", banner_image: "", total_slots: 20, attached_coupon_id: "", end_time: "" }); toast({ title: "Contest created!" }); },
    onError: (e: any) => toast({ title: e.message || "Failed to create contest", variant: "destructive" }),
  });
  const updateContestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => vendorFetch(`/api/vendor/contests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vendor/contests"] }); setEditContest(null); toast({ title: "Contest updated!" }); },
    onError: (e: any) => toast({ title: e.message || "Failed to update contest", variant: "destructive" }),
  });
  const toggleContestStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      vendorFetch(`/api/vendor/contests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vendor/contests"] }); toast({ title: "Status updated" }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });
  const drawWinnerMutation = useMutation({
    mutationFn: (id: string) => vendorFetch(`/api/vendor/contests/${id}/draw`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vendor/contests"] }); toast({ title: "🏆 Winner drawn!" }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
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

  const { data: products = [], isLoading: prodsLoading, refetch: refetchProds } = useQuery<any[]>({
    queryKey: ["/api/vendor/products"],
    queryFn: () => vendorFetch("/api/vendor/products"),
    enabled: authChecked,
  });

  const [prodDialog, setProdDialog] = useState(false);
  const [editProd, setEditProd] = useState<any>(null);
  const [prodForm, setProdForm] = useState<any>({ name: "", price: "", description: "", type: "product", sub_category: "" });

  const saveProdMutation = useMutation({
    mutationFn: (data: any) => editProd
      ? vendorFetch(`/api/vendor/products/${editProd.id}`, { method: "PATCH", body: JSON.stringify(data) })
      : vendorFetch("/api/vendor/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: editProd ? "Product updated!" : "Product added!" }); setProdDialog(false); setEditProd(null); setProdForm({ name: "", price: "", description: "", type: "product", sub_category: "" }); refetchProds(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteProdMutation = useMutation({
    mutationFn: (id: string) => vendorFetch(`/api/vendor/products/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); refetchProds(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const { data: coupons = [], isLoading: couponsLoading, refetch: refetchCoupons } = useQuery<any[]>({
    queryKey: ["/api/vendor/coupons"],
    queryFn: () => vendorFetch("/api/vendor/coupons"),
    enabled: authChecked,
  });

  const [couponDialog, setCouponDialog] = useState(false);
  const [editCoupon, setEditCoupon] = useState<any>(null);
  const EMPTY_COUPON_FORM = { code: "", type: "percentage", value: "", is_active: true, featured: false, is_contest_coupon: false, free_item_product_id: null, free_item_qty: 1, free_item_products: [] as string[], bogo_buy_product_id: null as string | null, bogo_buy_qty: 1, bogo_get_product_id: null as string | null, bogo_get_qty: 1, min_order_amount: null, expiry_date: "", description: "", banner_image: "", restrict_sub_category: null };
  const [couponForm, setCouponForm] = useState<any>(EMPTY_COUPON_FORM);
  const [couponProdSearch, setCouponProdSearch] = useState("");
  const [freeItemCatFilter, setFreeItemCatFilter] = useState<string[]>([]);
  const [bundleItems, setBundleItems] = useState<{ product_id: string; name: string; custom_price: string; quantity: number }[]>([]);

  const resetCouponDialog = () => { setCouponDialog(false); setEditCoupon(null); setCouponForm(EMPTY_COUPON_FORM); setCouponProdSearch(""); setFreeItemCatFilter([]); setBundleItems([]); };

  const saveCouponMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, coupon_products: bundleItems.map(i => ({ product_id: i.product_id, custom_price: i.custom_price, quantity: i.quantity || 1 })) };
      return editCoupon
        ? vendorFetch(`/api/vendor/coupons/${editCoupon.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : vendorFetch("/api/vendor/coupons", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => { toast({ title: editCoupon ? "Coupon updated!" : "Coupon added!" }); resetCouponDialog(); refetchCoupons(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => vendorFetch(`/api/vendor/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); refetchCoupons(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleCouponMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      vendorFetch(`/api/vendor/coupons/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
    onSuccess: () => { refetchCoupons(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const { data: offlineCoupons = [], isLoading: ocLoading, refetch: refetchOC } = useQuery<any[]>({
    queryKey: ["/api/vendor/offline-coupons"],
    queryFn: () => vendorFetch("/api/vendor/offline-coupons"),
    enabled: authChecked,
  });

  const [ocDialog, setOCDialog] = useState(false);
  const [ocCodesDialog, setOCCodesDialog] = useState(false);
  const [selectedOCId, setSelectedOCId] = useState<string | null>(null);
  const [ocUploading, setOCUploading] = useState(false);
  const [ocForm, setOCForm] = useState({ title: "", description: "", total_codes: "10", banner_image: "" });
  const [ocBannerFile, setOCBannerFile] = useState<File | null>(null);
  const [ocBannerPreview, setOCBannerPreview] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [prodImgUploading, setProdImgUploading] = useState(false);

  const vendorUploadImage = async (file: File, setter: (url: string) => void, setUploading: (v: boolean) => void) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setter(url);
      toast({ title: "Image uploaded!" });
    } catch (e: any) {
      toast({ title: e.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: selectedCodes = [], isLoading: codesLoading } = useQuery<any[]>({
    queryKey: ["/api/vendor/offline-coupons", selectedOCId, "codes"],
    queryFn: () => vendorFetch(`/api/vendor/offline-coupons/${selectedOCId}/codes`),
    enabled: !!selectedOCId && ocCodesDialog,
  });

  const toggleOCMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      vendorFetch(`/api/vendor/offline-coupons/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
    onSuccess: () => refetchOC(),
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteOCMutation = useMutation({
    mutationFn: (id: string) => vendorFetch(`/api/vendor/offline-coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); refetchOC(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleOCBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOCBannerFile(file);
    setOCBannerPreview(URL.createObjectURL(file));
  };

  const handleCreateOC = async () => {
    if (!ocForm.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!ocBannerFile && !ocForm.banner_image.trim()) { toast({ title: "Banner image is required", variant: "destructive" }); return; }
    setOCUploading(true);
    try {
      const fd = new FormData();
      if (ocBannerFile) fd.append("banner", ocBannerFile);
      fd.append("title", ocForm.title.trim());
      if (ocForm.description.trim()) fd.append("description", ocForm.description.trim());
      fd.append("total_codes", ocForm.total_codes || "10");
      if (!ocBannerFile && ocForm.banner_image) fd.append("banner_image", ocForm.banner_image);
      await vendorFormFetch("/api/vendor/offline-coupons", fd);
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/offline-coupons"] });
      toast({ title: `Created! ${ocForm.total_codes || 10} codes generated.` });
      setOCDialog(false);
      setOCForm({ title: "", description: "", total_codes: "10", banner_image: "" });
      setOCBannerFile(null);
      setOCBannerPreview(null);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setOCUploading(false);
    }
  };

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

  const NAV: { id: VTab; label: string; icon: any }[] = [
    { id: "shop", label: "My Shop", icon: Store },
    { id: "products", label: "Products", icon: Package },
    { id: "coupons", label: "Coupons", icon: Ticket },
    { id: "offline-coupons", label: "Offline Coupons", icon: WifiOff },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "contests", label: "Contests", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Account Settings Modal */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-500" />
              Account Settings
            </DialogTitle>
            <DialogDescription>Update your vendor login email and password.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-name">Name</Label>
              <Input
                id="acc-name"
                value={accForm.name}
                onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                data-testid="input-vendor-acc-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-email">Login Email</Label>
              <Input
                id="acc-email"
                type="email"
                value={accForm.email}
                onChange={e => setAccForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                data-testid="input-vendor-acc-email"
              />
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-3">Change password — leave blank to keep current</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="acc-pw">New Password</Label>
                  <div className="relative">
                    <Input
                      id="acc-pw"
                      type={accPwVisible ? "text" : "password"}
                      value={accForm.password}
                      onChange={e => setAccForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="pr-10"
                      data-testid="input-vendor-acc-password"
                    />
                    <button type="button" onClick={() => setAccPwVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {accPwVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="acc-confirm">Confirm Password</Label>
                  <Input
                    id="acc-confirm"
                    type={accPwVisible ? "text" : "password"}
                    value={accForm.confirm}
                    onChange={e => setAccForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                    data-testid="input-vendor-acc-confirm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAccountOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                onClick={handleSaveAccount}
                disabled={updateProfileMutation.isPending}
                data-testid="button-vendor-save-account"
              >
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 py-6 px-4 gap-2">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{vendorInfo?.name || "Vendor Panel"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{vendorInfo?.email}</p>
          </div>
          <button
            onClick={() => { setAccForm({ name: vendorInfo?.name || "", email: vendorInfo?.email || "", password: "", confirm: "" }); setAccountOpen(true); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all shrink-0"
            title="Edit account"
            data-testid="button-vendor-account-settings"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm flex-1">Vendor Panel</span>
          <div className="flex gap-1">
            {NAV.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`p-2 rounded-lg transition-colors ${tab === item.id ? "bg-emerald-500 text-white" : "text-gray-500"}`} data-testid={`vendor-nav-mobile-${item.id}`}>
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
                      <Save className="w-3.5 h-3.5" /> {saveShopMutation.isPending ? "Saving..." : "Save"}
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
                    {!shopEditing && (
                      <div className="flex items-center gap-4 mb-2">
                        {shop.logo ? (
                          <img src={shop.logo} alt={shop.name} className="w-16 h-16 rounded-2xl object-cover shadow" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {shop.name?.[0]}
                          </div>
                        )}
                        <div>
                          <h2 className="font-bold text-lg text-gray-900 dark:text-white">{shop.name}</h2>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Active Shop</Badge>
                        </div>
                      </div>
                    )}

                    {shopEditing ? (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</p>
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
                          <Input value={shopForm.address || ""} onChange={e => setShopForm((f: any) => ({ ...f, address: e.target.value }))} className="mt-1.5 rounded-xl" data-testid="input-vendor-address" />
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
                        <div>
                          <Label className="text-sm">Google Maps Link</Label>
                          <Input value={shopForm.map_link || ""} onChange={e => setShopForm((f: any) => ({ ...f, map_link: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="https://maps.google.com/..." />
                        </div>

                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-gray-100 dark:border-gray-800">Images</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Logo URL</Label>
                            <div className="flex gap-2 mt-1.5">
                              <Input value={shopForm.logo || ""} onChange={e => setShopForm((f: any) => ({ ...f, logo: e.target.value }))} className="rounded-xl flex-1" placeholder="https://..." data-testid="input-vendor-logo" />
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) vendorUploadImage(f, (url) => setShopForm((sf: any) => ({ ...sf, logo: url })), setLogoUploading); }} data-testid="input-vendor-logo-file" />
                                <Button type="button" variant="outline" size="sm" className="rounded-xl h-10 px-3 shrink-0" disabled={logoUploading} data-testid="button-upload-logo">
                                  {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                </Button>
                              </label>
                            </div>
                            {shopForm.logo && <img src={shopForm.logo} alt="Logo preview" className="mt-2 w-12 h-12 rounded-xl object-cover" />}
                          </div>
                          <div>
                            <Label className="text-sm">Banner Image URL</Label>
                            <div className="flex gap-2 mt-1.5">
                              <Input value={shopForm.banner_image || ""} onChange={e => setShopForm((f: any) => ({ ...f, banner_image: e.target.value }))} className="rounded-xl flex-1" placeholder="https://..." data-testid="input-vendor-banner" />
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) vendorUploadImage(f, (url) => setShopForm((sf: any) => ({ ...sf, banner_image: url })), setBannerUploading); }} data-testid="input-vendor-banner-file" />
                                <Button type="button" variant="outline" size="sm" className="rounded-xl h-10 px-3 shrink-0" disabled={bannerUploading} data-testid="button-upload-banner">
                                  {bannerUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                </Button>
                              </label>
                            </div>
                            {shopForm.banner_image && <img src={shopForm.banner_image} alt="Banner preview" className="mt-2 w-full h-16 rounded-xl object-cover" />}
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-gray-100 dark:border-gray-800">Listing Settings</p>
                        <div>
                          <Label className="text-sm">Listing Type</Label>
                          <Select value={shopForm.listing_type || "both"} onValueChange={v => setShopForm((f: any) => ({ ...f, listing_type: v }))}>
                            <SelectTrigger className="mt-1.5 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="products">Products only</SelectItem>
                              <SelectItem value="services">Services only</SelectItem>
                              <SelectItem value="both">Products & Services</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Business Hours</Label>
                          <Input value={shopForm.business_hours || ""} onChange={e => setShopForm((f: any) => ({ ...f, business_hours: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="e.g. Mon–Sat 9am–9pm" data-testid="input-vendor-hours" />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">{shop.description || "No description set"}</p>
                        {shop.banner_image && <img src={shop.banner_image} alt="Banner" className="w-full h-32 object-cover rounded-xl" />}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {shop.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="w-4 h-4 shrink-0 mt-0.5" /><span>{shop.address}</span></div>}
                          {shop.whatsapp_number && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>{shop.whatsapp_number}</span></div>}
                          {shop.website_link && <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-4 h-4 shrink-0" /><span className="truncate">{shop.website_link}</span></div>}
                          {shop.payment_id && <div className="flex items-center gap-2 text-muted-foreground"><Tag className="w-4 h-4 shrink-0" /><span>{shop.payment_id}</span></div>}
                          {shop.map_link && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 shrink-0 text-blue-500" /><a href={shop.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 truncate">Maps Link</a></div>}
                          {shop.business_hours && <div className="flex items-center gap-2 text-muted-foreground"><Zap className="w-4 h-4 shrink-0" /><span>{shop.business_hours}</span></div>}
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
                <Button size="sm" onClick={() => { setEditProd(null); setProdForm({ name: "", price: "", description: "", type: "product", sub_category: "" }); setProdDialog(true); }} className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-violet-600 border-0" data-testid="button-add-product">
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
                <div className="flex flex-col gap-6">
                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    products.forEach((prod: any) => {
                      const cat = prod.sub_category || "Other";
                      if (!grouped[cat]) grouped[cat] = [];
                      grouped[cat].push(prod);
                    });
                    const cats = Object.keys(grouped).sort((a, b) => a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b));
                    return cats.map(cat => (
                      <div key={cat}>
                        <div className="flex items-center gap-2 mb-3" data-testid={`vendor-cat-header-${cat}`}>
                          <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-violet-200 dark:from-blue-900 dark:to-violet-900" />
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-violet-100 dark:from-blue-950/50 dark:to-violet-950/50 border border-blue-200 dark:border-blue-800">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{cat}</span>
                            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 bg-blue-200 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-full">{grouped[cat].length}</span>
                          </div>
                          <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-violet-200 dark:from-blue-900 dark:to-violet-900" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {grouped[cat].map((prod: any) => (
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
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                          <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-0 text-[10px]">{prod.type}</Badge>
                          {prod.sub_category && <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-0 text-[10px]">{prod.sub_category}</Badge>}
                          <div className="ml-auto flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => { setEditProd(prod); setProdForm({ name: prod.name, price: prod.price, description: prod.description || "", type: prod.type || "product", sub_category: prod.sub_category || "", image: prod.image || "" }); setProdDialog(true); }} data-testid={`button-edit-product-${prod.id}`}>
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
                      </div>
                    ));
                  })()}
                </div>
              )}

              <Dialog open={prodDialog} onOpenChange={v => { setProdDialog(v); if (!v) { setEditProd(null); setProdForm({ name: "", price: "", description: "", type: "product", sub_category: "" }); } }}>
                <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editProd ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4 pb-2">
                    <div><Label className="text-sm">Name *</Label><Input value={prodForm.name} onChange={e => setProdForm((f: any) => ({ ...f, name: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Product name" data-testid="input-prod-name" /></div>
                    <div><Label className="text-sm">Price (₹) *</Label><Input type="number" value={prodForm.price} onChange={e => setProdForm((f: any) => ({ ...f, price: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="e.g. 299" data-testid="input-prod-price" /></div>
                    <div><Label className="text-sm">Description</Label><Textarea value={prodForm.description} onChange={e => setProdForm((f: any) => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={2} /></div>
                    <div>
                      <Label className="text-sm">Image</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input value={prodForm.image || ""} onChange={e => setProdForm((f: any) => ({ ...f, image: e.target.value }))} className="rounded-xl flex-1" placeholder="https://... or upload →" data-testid="input-prod-image" />
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) vendorUploadImage(f, (url) => setProdForm((pf: any) => ({ ...pf, image: url })), setProdImgUploading); }} data-testid="input-prod-image-file" />
                          <Button type="button" variant="outline" size="sm" className="rounded-xl h-10 px-3 shrink-0" disabled={prodImgUploading} data-testid="button-upload-prod-image">
                            {prodImgUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          </Button>
                        </label>
                      </div>
                      {prodForm.image && <img src={prodForm.image} alt="Preview" className="mt-2 w-16 h-16 rounded-xl object-cover" onError={e => { (e.target as any).style.display = "none"; }} />}
                    </div>
                    <div>
                      <Label className="text-sm">Type</Label>
                      <Select value={prodForm.type} onValueChange={v => setProdForm((f: any) => ({ ...f, type: v }))}>
                        <SelectTrigger className="mt-1.5 rounded-xl" data-testid="select-prod-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Sub Category */}
                    {(() => {
                      const catName = (shop as any)?.category?.name || "";
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
                      const existingSubCats = Array.from(new Set(products.map((p: any) => p.sub_category).filter(Boolean))) as string[];
                      const allChips = Array.from(new Set([...existingSubCats, ...suggestions.slice(0, 6)]));
                      return (
                        <div>
                          <Label className="text-sm">Category <span className="text-muted-foreground text-xs font-normal">(groups products by type)</span></Label>
                          <Input value={prodForm.sub_category || ""} onChange={e => setProdForm((f: any) => ({ ...f, sub_category: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Type new category name or pick below..." data-testid="input-prod-subcategory" list="vendor-subcategory-suggestions" />
                          <datalist id="vendor-subcategory-suggestions">{allChips.map(s => <option key={s} value={s} />)}</datalist>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {existingSubCats.length > 0 && existingSubCats.map(s => (
                              <button key={`existing-${s}`} type="button" onClick={() => setProdForm((f: any) => ({ ...f, sub_category: s }))}
                                className={`text-[11px] px-2 py-1 rounded-lg border transition-all font-semibold ${prodForm.sub_category === s ? "bg-blue-500 text-white border-blue-500" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100"}`}
                                data-testid={`chip-existing-${s.replace(/\s+/g, "-").toLowerCase()}`}>
                                ✓ {s}
                              </button>
                            ))}
                            {suggestions.slice(0, 6).filter(s => !existingSubCats.includes(s)).map(s => (
                              <button key={s} type="button" onClick={() => setProdForm((f: any) => ({ ...f, sub_category: s }))}
                                className={`text-[11px] px-2 py-1 rounded-lg border transition-all ${prodForm.sub_category === s ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-blue-300 hover:text-blue-600"}`}
                                data-testid={`chip-subcategory-${s.replace(/\s+/g, "-").toLowerCase()}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5">Input lo type cheyyi to create a new category. Blue chips = already used in this shop.</p>
                        </div>
                      );
                    })()}
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
                <Button size="sm" onClick={() => { resetCouponDialog(); setCouponDialog(true); }} className="rounded-xl gap-2 bg-gradient-to-r from-pink-500 to-rose-600 border-0" data-testid="button-add-coupon">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              {couponsLoading ? (
                <div className="flex flex-col gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${coupon.type === "free_item" ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-pink-500 to-rose-600"}`}>
                          {coupon.type === "percentage" ? "%" : coupon.type === "flat" ? "₹" : "🎁"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-gray-900 dark:text-white font-mono">{coupon.code}</p>
                            {coupon.featured && <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-0 text-[10px] px-1.5">⭐ Top</Badge>}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleCouponMutation.mutate({ id: coupon.id, is_active: true })}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${coupon.is_active ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"}`}
                                data-testid={`button-active-coupon-${coupon.id}`}
                              >Active</button>
                              <button
                                onClick={() => toggleCouponMutation.mutate({ id: coupon.id, is_active: false })}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${!coupon.is_active ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-orange-100 hover:text-orange-700"}`}
                                data-testid={`button-used-coupon-${coupon.id}`}
                              >Used</button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {coupon.type === "percentage" ? `${coupon.value}% off` : coupon.type === "flat" ? `₹${coupon.value} off` : "Free item"}
                            {coupon.expiry_date && ` · Expires ${new Date(coupon.expiry_date).toLocaleDateString("en-IN")}`}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => { resetCouponDialog(); setEditCoupon(coupon); setCouponForm({ code: coupon.code, type: coupon.type, value: coupon.value, is_active: coupon.is_active, featured: coupon.featured || false, is_contest_coupon: coupon.is_contest_coupon || false, free_item_product_id: coupon.free_item_product_id || null, free_item_qty: coupon.free_item_qty || 1, free_item_products: coupon.free_item_products || [], bogo_buy_product_id: coupon.bogo_buy_product_id || null, bogo_buy_qty: coupon.bogo_buy_qty || 1, bogo_get_product_id: coupon.bogo_get_product_id || null, bogo_get_qty: coupon.bogo_get_qty || 1, min_order_amount: coupon.min_order_amount || null, expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().split("T")[0] : "", description: coupon.description || "", banner_image: coupon.banner_image || "", restrict_sub_category: coupon.restrict_sub_category || null }); if (coupon.coupon_products && Array.isArray(coupon.coupon_products)) { setBundleItems(coupon.coupon_products.map((cp: any) => ({ product_id: cp.product_id || cp.id, name: cp.name || "", custom_price: cp.custom_price || "", quantity: cp.quantity || 1 }))); } setCouponDialog(true); }} data-testid={`button-edit-coupon-${coupon.id}`}>
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

              <Dialog open={couponDialog} onOpenChange={v => { if (!v) resetCouponDialog(); else setCouponDialog(true); }}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="text-lg font-bold">{editCoupon ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-5 pb-2">

                    {/* Coupon Type — 4 big buttons */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coupon Type</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {([
                          { value: "percentage", label: "% Discount", desc: "Percentage off", icon: "%" },
                          { value: "flat", label: "₹ Flat Off", desc: "Fixed amount off", icon: "₹" },
                          { value: "free_item", label: "Free Item", desc: "User picks 1 free item", icon: "🎁" },
                          { value: "bogo", label: "Buy 1 Get 1", desc: "Buy item, get free item", icon: "🔄" },
                        ] as const).map(opt => {
                          const active = (couponForm.type || "percentage") === opt.value;
                          return (
                            <button key={opt.value} type="button" onClick={() => setCouponForm((f: any) => ({ ...f, type: opt.value, free_item_product_id: null }))}
                              data-testid={`coupon-type-${opt.value}`}
                              className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 text-left transition-all ${active ? "border-pink-500 bg-pink-50 dark:bg-pink-950/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                              <span className="text-base leading-none mb-1">{opt.icon}</span>
                              <span className={`text-[11px] font-bold ${active ? "text-pink-700 dark:text-pink-400" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                              <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coupon Code */}
                    <div>
                      <Label className="text-xs font-semibold">Coupon Code *</Label>
                      <Input value={couponForm.code} onChange={e => setCouponForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} className="mt-1.5 rounded-xl font-mono uppercase" placeholder="e.g. SAVE20" data-testid="input-coupon-code" />
                    </div>

                    {/* Percentage value */}
                    {(couponForm.type === "percentage" || !couponForm.type) && (
                      <div>
                        <Label className="text-xs font-semibold">Discount Percentage (%)</Label>
                        <div className="relative mt-1.5">
                          <Input type="number" min="1" max="100" value={couponForm.value} onChange={e => setCouponForm((f: any) => ({ ...f, value: e.target.value }))} className="rounded-xl pr-10" placeholder="e.g. 20" data-testid="input-coupon-value" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                        </div>
                      </div>
                    )}

                    {/* Flat value */}
                    {couponForm.type === "flat" && (
                      <div>
                        <Label className="text-xs font-semibold">Discount Amount (₹)</Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                          <Input type="number" min="1" value={couponForm.value} onChange={e => setCouponForm((f: any) => ({ ...f, value: e.target.value }))} className="rounded-xl pl-8" placeholder="e.g. 100" data-testid="input-coupon-value-flat" />
                        </div>
                      </div>
                    )}

                    {/* Free item picker — pick one from list */}
                    {couponForm.type === "free_item" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">🎁 Add Items to "Pick One" List</Label>
                          <span className="text-[10px] text-muted-foreground">{(couponForm.free_item_products || []).length} items added</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground -mt-1">User will pick one item from this list for free when claiming the coupon.</p>
                        {/* Category filter chips */}
                        {Array.from(new Set(products.map((p: any) => p.sub_category).filter(Boolean))).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <button type="button" onClick={() => setFreeItemCatFilter([])}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${freeItemCatFilter.length === 0 ? "bg-emerald-500 text-white border-emerald-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-emerald-400"}`}>
                              All
                            </button>
                            {(Array.from(new Set(products.map((p: any) => p.sub_category).filter(Boolean))) as string[]).map(cat => (
                              <button key={cat} type="button"
                                onClick={() => setFreeItemCatFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${freeItemCatFilter.includes(cat) ? "bg-emerald-500 text-white border-emerald-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-emerald-400"}`}
                                data-testid={`free-item-cat-filter-${cat}`}>
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                        <Input placeholder="Search products..." value={couponProdSearch} onChange={e => setCouponProdSearch(e.target.value)} className="rounded-xl h-8 text-xs" data-testid="input-free-product-search" />
                        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                          {products
                            .filter((p: any) => {
                              const matchesCat = freeItemCatFilter.length === 0 || freeItemCatFilter.includes(p.sub_category);
                              const matchesSearch = !couponProdSearch || (p.name || "").toLowerCase().includes(couponProdSearch.toLowerCase());
                              return matchesCat && matchesSearch;
                            })
                            .map((p: any) => {
                              const freeProds: string[] = couponForm.free_item_products || [];
                              const inList = freeProds.includes(p.id);
                              return (
                                <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${inList ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-gray-700"}`} data-testid={`free-item-product-${p.id}`}>
                                  <div>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                  </div>
                                  {inList ? (
                                    <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, free_item_products: (f.free_item_products || []).filter((id: string) => id !== p.id) }))}
                                      className="text-[10px] px-2 py-1 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 font-semibold" data-testid={`free-item-remove-${p.id}`}>Remove</button>
                                  ) : (
                                    <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, free_item_products: [...(f.free_item_products || []), p.id] }))}
                                      className="text-[10px] px-2 py-1 rounded-lg border border-emerald-400 text-emerald-600 hover:bg-emerald-50 font-semibold" data-testid={`free-item-add-${p.id}`}>+ Add</button>
                                  )}
                                </div>
                              );
                            })}
                          {products.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No products found. Add products first.</p>}
                        </div>
                        {/* Selected items preview */}
                        {(couponForm.free_item_products || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(couponForm.free_item_products || []).map((pid: string) => {
                              const p = (products as any[]).find(x => x.id === pid);
                              return p ? (
                                <span key={pid} className="flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0.5 font-medium">
                                  {p.name}
                                  <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, free_item_products: (f.free_item_products || []).filter((id: string) => id !== pid) }))} className="text-emerald-500 hover:text-red-500 font-bold leading-none">×</button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div>
                          <Label className="text-xs font-semibold">Min Order (₹) <span className="text-muted-foreground font-normal">optional</span></Label>
                          <div className="relative mt-1.5">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                            <Input type="number" min="0" value={couponForm.min_order_amount || ""} onChange={e => setCouponForm((f: any) => ({ ...f, min_order_amount: e.target.value || null }))} className="rounded-xl pl-7 h-9 text-sm" placeholder="e.g. 500" data-testid="input-min-order-amount" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BOGO picker */}
                    {couponForm.type === "bogo" && (
                      <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20">
                        <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400">🔄 Buy One Get One Setup</Label>
                        <p className="text-[10px] text-muted-foreground -mt-1">Customer buys the "Buy" product and gets the "Get Free" product added to cart for free.</p>
                        {/* Buy product selector */}
                        <div>
                          <Label className="text-xs font-semibold mb-1.5 block">Buy Product <span className="text-orange-600">*</span></Label>
                          <Input placeholder="Search buy product..." value={couponProdSearch} onChange={e => setCouponProdSearch(e.target.value)} className="rounded-xl h-8 text-xs mb-1.5" data-testid="input-bogo-buy-search" />
                          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                            {products.filter(p => !couponProdSearch || p.name.toLowerCase().includes(couponProdSearch.toLowerCase())).map((p: any) => {
                              const sel = couponForm.bogo_buy_product_id === p.id;
                              return (
                                <button key={p.id} type="button" onClick={() => setCouponForm((f: any) => ({ ...f, bogo_buy_product_id: sel ? null : p.id }))}
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
                        {/* Get product selector */}
                        <div>
                          <Label className="text-xs font-semibold mb-1.5 block">Get Free Product <span className="text-emerald-600">*</span></Label>
                          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                            {products.map((p: any) => {
                              const sel = couponForm.bogo_get_product_id === p.id;
                              return (
                                <button key={p.id} type="button" onClick={() => setCouponForm((f: any) => ({ ...f, bogo_get_product_id: sel ? null : p.id }))}
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
                        {/* Buy quantity */}
                        {couponForm.bogo_buy_product_id && (
                          <div className="flex items-center gap-3">
                            <Label className="text-xs font-semibold shrink-0">Buy Qty:</Label>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, bogo_buy_qty: Math.max(1, (f.bogo_buy_qty || 1) - 1) }))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-buy-qty-dec">-</button>
                              <span className="w-8 text-center text-sm font-bold tabular-nums" data-testid="text-bogo-buy-qty">{couponForm.bogo_buy_qty || 1}</span>
                              <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, bogo_buy_qty: Math.min(10, (f.bogo_buy_qty || 1) + 1) }))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-buy-qty-inc">+</button>
                            </div>
                          </div>
                        )}
                        {/* Get quantity */}
                        {couponForm.bogo_get_product_id && (
                          <div className="flex items-center gap-3">
                            <Label className="text-xs font-semibold shrink-0">Free Qty:</Label>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, bogo_get_qty: Math.max(1, (f.bogo_get_qty || 1) - 1) }))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-qty-dec">-</button>
                              <span className="w-8 text-center text-sm font-bold tabular-nums" data-testid="text-bogo-qty">{couponForm.bogo_get_qty || 1}</span>
                              <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, bogo_get_qty: Math.min(10, (f.bogo_get_qty || 1) + 1) }))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-bold" data-testid="button-bogo-qty-inc">+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <Label className="text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <textarea
                        value={couponForm.description || ""}
                        onChange={e => setCouponForm((f: any) => ({ ...f, description: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        rows={2}
                        placeholder="e.g. Valid on orders above ₹500. Get 20% off on all items."
                        data-testid="input-vendor-coupon-description"
                      />
                    </div>

                    {/* Category restriction */}
                    {(() => {
                      const subCats = Array.from(new Set(products.filter((p: any) => p.sub_category).map((p: any) => p.sub_category as string)));
                      if (subCats.length === 0) return null;
                      return (
                        <div>
                          <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400">🎯 Restrict to Category <span className="font-normal text-muted-foreground">(optional)</span></Label>
                          <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">If set, discount applies ONLY to items in this category.</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, restrict_sub_category: null }))}
                              className={`text-[11px] px-3 py-1 rounded-full border font-semibold transition-all ${!couponForm.restrict_sub_category ? "bg-blue-500 text-white border-blue-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-blue-400"}`}
                              data-testid="vendor-cat-restrict-all">All items</button>
                            {subCats.map(cat => (
                              <button key={cat} type="button" onClick={() => setCouponForm((f: any) => ({ ...f, restrict_sub_category: cat }))}
                                className={`text-[11px] px-3 py-1 rounded-full border font-semibold transition-all ${couponForm.restrict_sub_category === cat ? "bg-orange-500 text-white border-orange-500" : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-orange-400"}`}
                                data-testid={`vendor-cat-restrict-${cat}`}>{cat}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Banner Image */}
                    <div>
                      <Label className="text-xs font-semibold">Banner Image <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">Wide image shown at top of the coupon card (e.g. 800×320px).</p>
                      <div className="flex gap-2 items-center">
                        <Input value={couponForm.banner_image || ""} onChange={e => setCouponForm((f: any) => ({ ...f, banner_image: e.target.value }))} className="rounded-xl flex-1 text-xs" placeholder="https://..." data-testid="input-vendor-coupon-banner" />
                        <label className="shrink-0 cursor-pointer px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setCouponForm((frm: any) => ({ ...frm, banner_image: ev.target?.result as string })); r.readAsDataURL(f); } }} data-testid="input-vendor-coupon-banner-file" />
                        </label>
                      </div>
                      {couponForm.banner_image && (
                        <div className="relative mt-2">
                          <img src={couponForm.banner_image} alt="Banner preview" className="w-full h-20 object-cover rounded-xl" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <button onClick={() => setCouponForm((f: any) => ({ ...f, banner_image: "" }))} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Expiry date */}
                    <div>
                      <Label className="text-xs font-semibold">Expiry Date</Label>
                      <Input type="date" value={couponForm.expiry_date || ""} onChange={e => setCouponForm((f: any) => ({ ...f, expiry_date: e.target.value || null }))} className="mt-1.5 rounded-xl" data-testid="input-coupon-expiry" />
                    </div>

                    {/* Active + Featured toggles */}
                    <div className="flex flex-col gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Active</p>
                          <p className="text-xs text-muted-foreground">Show coupon on app</p>
                        </div>
                        <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, is_active: !f.is_active }))}
                          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${couponForm.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                          data-testid="toggle-coupon-active">
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${couponForm.is_active ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Top Coupon ⭐</p>
                          <p className="text-xs text-muted-foreground">Feature in top coupons section</p>
                        </div>
                        <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, featured: !f.featured }))}
                          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${couponForm.featured ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"}`}
                          data-testid="toggle-coupon-featured">
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${couponForm.featured ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between border-t pt-3 border-amber-200 dark:border-amber-800/40">
                        <div>
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Contest Coupon 🏆</p>
                          <p className="text-xs text-muted-foreground">Use this coupon as a contest prize</p>
                        </div>
                        <button type="button" onClick={() => setCouponForm((f: any) => ({ ...f, is_contest_coupon: !f.is_contest_coupon }))}
                          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${couponForm.is_contest_coupon ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}
                          data-testid="toggle-contest-coupon">
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${couponForm.is_contest_coupon ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>

                    {/* Attach Products / Services */}
                    <div className="flex flex-col gap-3 p-3 rounded-xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">📦 Attach Products / Services</Label>
                        <span className="text-[10px] text-muted-foreground">{bundleItems.length} added</span>
                      </div>
                      <Input placeholder="Search your products..." value={couponProdSearch} onChange={e => setCouponProdSearch(e.target.value)} className="rounded-xl h-8 text-xs" data-testid="input-bundle-search" />
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {(products as any[])
                          .filter(p => !couponProdSearch || p.name.toLowerCase().includes(couponProdSearch.toLowerCase()))
                          .map(p => {
                            const existingIdx = bundleItems.findIndex(b => b.product_id === p.id);
                            const inBundle = existingIdx !== -1;
                            return (
                              <div key={p.id} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${inBundle ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30" : "border-gray-200 dark:border-gray-700"}`} data-testid={`bundle-item-${p.id}`}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                                  <p className="text-[10px] text-muted-foreground">₹{Number(p.price).toLocaleString()}</p>
                                </div>
                                {inBundle && (
                                  <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => { const n = [...bundleItems]; n[existingIdx].quantity = Math.max(1, (n[existingIdx].quantity || 1) - 1); setBundleItems(n); }} className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-xs flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800" data-testid={`bundle-qty-dec-${p.id}`}>-</button>
                                    <span className="text-xs font-bold w-4 text-center">{bundleItems[existingIdx].quantity || 1}</span>
                                    <button type="button" onClick={() => { const n = [...bundleItems]; n[existingIdx].quantity = (n[existingIdx].quantity || 1) + 1; setBundleItems(n); }} className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-xs flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800" data-testid={`bundle-qty-inc-${p.id}`}>+</button>
                                    <input type="number" placeholder="₹ custom" value={bundleItems[existingIdx].custom_price} onChange={e => { const n = [...bundleItems]; n[existingIdx].custom_price = e.target.value; setBundleItems(n); }} className="w-20 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" data-testid={`bundle-price-${p.id}`} />
                                    <button type="button" onClick={() => setBundleItems(bundleItems.filter((_, i) => i !== existingIdx))} className="w-6 h-6 rounded border border-red-200 text-red-500 text-xs flex items-center justify-center hover:bg-red-50" data-testid={`bundle-remove-${p.id}`}>×</button>
                                  </div>
                                )}
                                {!inBundle && (
                                  <button type="button" onClick={() => setBundleItems([...bundleItems, { product_id: p.id, name: p.name, custom_price: "", quantity: 1 }])} className="text-[10px] px-2 py-1 rounded-lg border border-violet-400 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 font-semibold" data-testid={`bundle-add-${p.id}`}>+ Add</button>
                                )}
                              </div>
                            );
                          })}
                        {(products as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No products found. Add products first.</p>}
                      </div>
                    </div>

                    <Button onClick={() => saveCouponMutation.mutate(couponForm)} disabled={saveCouponMutation.isPending || !couponForm.code} className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 border-0" data-testid="button-save-coupon">
                      {saveCouponMutation.isPending ? "Saving..." : editCoupon ? "Update Coupon" : "Add Coupon"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ── Orders Tab ── */}
          {tab === "orders" && (
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Orders</h2>
                  <p className="text-sm text-muted-foreground">Orders placed from your shop</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-base px-3 py-1">{vendorOrders.length}</Badge>
              </div>

              {/* Search */}
              <div className="relative max-w-sm">
                <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={vendorOrderSearch}
                  onChange={e => setVendorOrderSearch(e.target.value)}
                  placeholder="Search by name, phone or order ID..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                  data-testid="input-vendor-order-search"
                />
              </div>

              {ordersLoading ? (
                <div className="flex flex-col gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
              ) : vendorOrders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No orders yet</h3>
                  <p className="text-muted-foreground text-sm">Orders from customers will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {vendorOrders
                    .filter(o => !vendorOrderSearch ||
                      o.id?.toLowerCase().includes(vendorOrderSearch.toLowerCase()) ||
                      o.user?.name?.toLowerCase().includes(vendorOrderSearch.toLowerCase()) ||
                      o.user?.phone?.includes(vendorOrderSearch)
                    )
                    .map(order => {
                      const statusColor = order.status === "completed" ? "bg-emerald-100 text-emerald-700" : order.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
                      return (
                        <Card
                          key={order.id}
                          className="rounded-2xl border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedVendorOrder(order)}
                          data-testid={`card-vendor-order-${order.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">#{order.id.slice(0, 8).toUpperCase()}</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name || "Customer"}</p>
                                  {order.user?.phone && <p className="text-xs text-muted-foreground">+91 {order.user.phone}</p>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-gray-900 dark:text-white">₹{parseFloat(order.final_amount).toLocaleString()}</p>
                                <Badge className={`${statusColor} border-0 text-[10px] mt-1 capitalize`}>{order.status}</Badge>
                                <p className="text-[10px] text-muted-foreground mt-1">{new Date(order.created_at).toLocaleDateString("en-IN")}</p>
                              </div>
                            </div>
                            {order.items?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length > 1 ? "s" : ""}: {order.items.slice(0, 2).map((i: any) => i.product_name).join(", ")}{order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  }
                </div>
              )}

              {/* Order Detail Dialog */}
              <Dialog open={!!selectedVendorOrder} onOpenChange={open => { if (!open) setSelectedVendorOrder(null); }}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-500" />
                      Order #{selectedVendorOrder?.id?.slice(0, 8).toUpperCase()}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedVendorOrder && (
                    <div className="flex flex-col gap-5 pb-2">
                      {/* Status + Date */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Placed on</p>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {new Date(selectedVendorOrder.created_at).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <Select
                          value={selectedVendorOrder.status}
                          onValueChange={(v) => updateVendorOrderStatus.mutate({ id: selectedVendorOrder.id, status: v })}
                          disabled={updateVendorOrderStatus.isPending}
                        >
                          <SelectTrigger
                            className={`w-32 rounded-xl text-xs border-0 ${
                              selectedVendorOrder.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                              selectedVendorOrder.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                              selectedVendorOrder.status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}
                            data-testid="select-vendor-order-status"
                          >
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

                      {/* Customer */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customer</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-white">{selectedVendorOrder.user?.name || "Unknown"}</span>
                          </div>
                          {selectedVendorOrder.user?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-green-500 shrink-0" />
                              <a href={`tel:+91${selectedVendorOrder.user.phone}`} className="text-blue-600 dark:text-blue-400">+91 {selectedVendorOrder.user.phone}</a>
                            </div>
                          )}
                          {selectedVendorOrder.user?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
                              <span className="text-muted-foreground">{selectedVendorOrder.user.address}</span>
                            </div>
                          )}
                          {selectedVendorOrder.customer_location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                              <a
                                href={`https://maps.google.com/?q=${selectedVendorOrder.customer_location}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                data-testid="link-vendor-customer-location"
                              >
                                📍 Customer GPS Location
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                          Items ({selectedVendorOrder.items?.length || 0})
                        </p>
                        <div className="flex flex-col gap-2">
                          {(selectedVendorOrder.items || []).map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}{item.is_free_item ? " 🎁" : ""}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity} {!item.is_free_item && `× ₹${parseFloat(item.price).toLocaleString()}`}</p>
                              </div>
                              <span className="font-semibold text-sm text-gray-900 dark:text-white shrink-0">
                                {item.is_free_item ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">FREE</Badge> : `₹${(parseFloat(item.price) * item.quantity).toLocaleString()}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-4">
                        <div className="flex flex-col gap-1.5">
                          {parseFloat(selectedVendorOrder.discount_amount) > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                              <span>Discount {selectedVendorOrder.coupon_code && `(${selectedVendorOrder.coupon_code})`}</span>
                              <span>-₹{parseFloat(selectedVendorOrder.discount_amount).toFixed(0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-700">
                            <span>Total Paid</span>
                            <span className="text-lg flex items-center gap-0.5"><IndianRupee className="w-4 h-4" />{parseFloat(selectedVendorOrder.final_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Payment</span>
                            <span className="capitalize">{selectedVendorOrder.payment_status || "unpaid"}</span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp CTA */}
                      {selectedVendorOrder.user?.phone && (
                        <a
                          href={`https://wa.me/91${selectedVendorOrder.user.phone}?text=${encodeURIComponent(`Hi ${selectedVendorOrder.user.name || ""}! Your order #${selectedVendorOrder.id.slice(0, 8).toUpperCase()} from ${shop?.name} is ${selectedVendorOrder.status}. Total: ₹${parseFloat(selectedVendorOrder.final_amount).toLocaleString()}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 transition-colors text-white font-semibold text-sm"
                          data-testid="button-vendor-whatsapp-customer"
                        >
                          <Phone className="w-4 h-4" /> Message Customer on WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {tab === "offline-coupons" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Offline Coupons</h1>
                  <p className="text-sm text-muted-foreground">Create printable banner coupons with unique codes</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => { setOCForm({ title: "", description: "", total_codes: "10", banner_image: "" }); setOCBannerFile(null); setOCBannerPreview(null); setOCDialog(true); }}
                  className="rounded-xl gap-2 bg-gradient-to-r from-violet-500 to-purple-600 border-0"
                  data-testid="button-add-offline-coupon-vendor"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              {ocLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1,2].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
                </div>
              ) : offlineCoupons.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/40 flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="w-7 h-7 text-violet-400" />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">No offline coupons yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a banner coupon to give physical codes to customers</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {offlineCoupons.map((oc: any) => (
                    <div key={oc.id} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900" data-testid={`card-vendor-offline-${oc.id}`}>
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
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${Math.max(5, ((oc.claimed_count || 0) / oc.total_codes) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{oc.claimed_count || 0}/{oc.total_codes} claimed</span>
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedOCId(oc.id); setOCCodesDialog(true); }}
                            className="rounded-xl h-8 gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/20"
                            data-testid={`button-vendor-view-codes-${oc.id}`}
                          >
                            <Download className="w-3 h-3" /> Codes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleOCMutation.mutate({ id: oc.id, is_active: !oc.is_active })}
                            className={`rounded-xl h-8 gap-1.5 ${oc.is_active ? "text-amber-600 border-amber-200" : "text-emerald-600 border-emerald-200"}`}
                            data-testid={`button-vendor-toggle-oc-${oc.id}`}
                          >
                            {oc.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {oc.is_active ? "Hide" : "Show"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { if (confirm("Delete this offline coupon?")) deleteOCMutation.mutate(oc.id); }}
                            className="rounded-xl h-8 text-red-500 hover:text-red-600 border-red-200"
                            data-testid={`button-vendor-delete-oc-${oc.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Dialog open={ocDialog} onOpenChange={setOCDialog}>
                <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><WifiOff className="w-5 h-5 text-violet-500" /> New Offline Coupon</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 mt-2">
                    <div>
                      <Label>Title *</Label>
                      <Input className="mt-1 rounded-xl" placeholder="e.g. Summer Sale — 20% Off" value={ocForm.title} onChange={e => setOCForm(f => ({ ...f, title: e.target.value }))} data-testid="input-vendor-oc-title" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea className="mt-1 rounded-xl resize-none" rows={2} placeholder="Show this coupon at store." value={ocForm.description} onChange={e => setOCForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Number of Codes</Label>
                      <Input type="number" min="1" max="100" className="mt-1 rounded-xl" value={ocForm.total_codes} onChange={e => setOCForm(f => ({ ...f, total_codes: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Banner Image *</Label>
                      <div className="mt-1 flex flex-col gap-2">
                        {(ocBannerPreview || ocForm.banner_image) && (
                          <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                            <img src={ocBannerPreview || ocForm.banner_image} alt="Preview" className="w-full h-full object-cover" />
                            <button onClick={() => { setOCBannerFile(null); setOCBannerPreview(null); setOCForm(f => ({ ...f, banner_image: "" })); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">✕</button>
                          </div>
                        )}
                        <label className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-violet-400 transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload banner image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleOCBannerSelect} />
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-xs text-muted-foreground">or paste URL</span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <Input className="rounded-xl" placeholder="https://example.com/banner.jpg" value={ocForm.banner_image} onChange={e => { setOCForm(f => ({ ...f, banner_image: e.target.value })); setOCBannerFile(null); setOCBannerPreview(null); }} />
                      </div>
                    </div>
                    <Button onClick={handleCreateOC} disabled={ocUploading} className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 border-0 text-white h-11" data-testid="button-vendor-create-oc">
                      {ocUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : `Create & Generate ${ocForm.total_codes || 10} Codes`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={ocCodesDialog} onOpenChange={open => { setOCCodesDialog(open); if (!open) setSelectedOCId(null); }}>
                <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-violet-500" /> Coupon Codes</DialogTitle></DialogHeader>
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
                            code.used_at ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              : code.claimed_by_user_id ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200"
                              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200"
                          }`}
                        >
                          <span className={`font-mono font-bold text-sm tracking-wider ${code.used_at ? "text-gray-400" : code.claimed_by_user_id ? "text-orange-700 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                            {code.code}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            code.used_at ? "bg-gray-100 text-gray-500"
                              : code.claimed_by_user_id ? "bg-orange-100 text-orange-600"
                              : "bg-emerald-100 text-emerald-600"
                          }`}>
                            {code.used_at ? "Used" : code.claimed_by_user_id ? "Claimed" : "Available"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {tab === "contests" && (
            <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contests</h2>
                    <p className="text-xs text-muted-foreground">Create contests for your customers</p>
                  </div>
                </div>
                <Button onClick={() => setShowContestForm(v => !v)}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 border-0 rounded-xl shadow-md shadow-amber-500/25 text-sm"
                  data-testid="button-create-contest">
                  <Plus className="w-4 h-4 mr-1" /> New Contest
                </Button>
              </div>

              {/* Edit contest form */}
              {editContest && (
                <Card className="mb-5 border-blue-200 dark:border-blue-800/50 rounded-2xl overflow-hidden">
                  <CardContent className="p-5 flex flex-col gap-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Edit Contest: {editContest.title}</p>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Contest Title *</Label>
                        <Input value={editContestForm.title} onChange={e => setEditContestForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Diwali Lucky Draw" className="mt-1 rounded-xl" data-testid="input-edit-contest-title" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Description</Label>
                        <Textarea value={editContestForm.description} onChange={e => setEditContestForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="What is this contest about?" className="mt-1 rounded-xl" rows={2} />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Prize Description</Label>
                        <Input value={editContestForm.prize_description} onChange={e => setEditContestForm(f => ({ ...f, prize_description: e.target.value }))}
                          placeholder="e.g. Gift voucher worth ₹500" className="mt-1 rounded-xl" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Attach Contest Coupon (optional)</Label>
                        {contestCoupons.length === 0 ? (
                          <div className="mt-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400">
                            No contest coupons yet. Create a coupon and turn on "Contest Coupon" toggle.
                          </div>
                        ) : (
                          <Select value={editContestForm.attached_coupon_id} onValueChange={v => setEditContestForm(f => ({ ...f, attached_coupon_id: v === "none" ? "" : v }))}>
                            <SelectTrigger className="mt-1 rounded-xl">
                              <SelectValue placeholder="Select a contest coupon..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {contestCoupons.map((cp: any) => (
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
                        <Input type="datetime-local" value={editContestForm.end_time} onChange={e => setEditContestForm(f => ({ ...f, end_time: e.target.value }))}
                          className="mt-1 rounded-xl" />
                        <p className="text-xs text-muted-foreground mt-1">Winner will be auto-drawn at this time</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Total Slots (1-100)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={editContestForm.total_slots}
                          onChange={e => setEditContestForm(f => ({ ...f, total_slots: parseInt(e.target.value) || 20 }))}
                          className="mt-1 rounded-xl"
                          data-testid="input-edit-contest-slots"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Banner Image URL (optional)</Label>
                        <Input value={editContestForm.banner_image} onChange={e => setEditContestForm(f => ({ ...f, banner_image: e.target.value }))}
                          placeholder="https://..." className="mt-1 rounded-xl" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setEditContest(null)} className="rounded-xl">Cancel</Button>
                      <Button onClick={() => updateContestMutation.mutate({ id: editContest.id, data: { ...editContestForm, attached_coupon_id: editContestForm.attached_coupon_id || null, end_time: editContestForm.end_time || null } })}
                        disabled={updateContestMutation.isPending || !editContestForm.title}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 rounded-xl" data-testid="button-edit-contest-submit">
                        {updateContestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Create contest form */}
              {showContestForm && (
                <Card className="mb-5 border-amber-200 dark:border-amber-800/50 rounded-2xl overflow-hidden">
                  <CardContent className="p-5 flex flex-col gap-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Create New Contest</p>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Contest Title *</Label>
                        <Input value={contestForm.title} onChange={e => setContestForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Diwali Lucky Draw" className="mt-1 rounded-xl" data-testid="input-contest-title" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Description</Label>
                        <Textarea value={contestForm.description} onChange={e => setContestForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="What is this contest about?" className="mt-1 rounded-xl" rows={2} data-testid="input-contest-description" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Prize Description 🎁</Label>
                        <Input value={contestForm.prize_description} onChange={e => setContestForm(f => ({ ...f, prize_description: e.target.value }))}
                          placeholder="e.g. Gift voucher worth ₹500" className="mt-1 rounded-xl" data-testid="input-contest-prize" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Attach Contest Coupon 🏆 (optional)</Label>
                        {contestCoupons.length === 0 ? (
                          <div className="mt-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400">
                            No contest coupons yet. Create a coupon and turn on "Contest Coupon" toggle.
                          </div>
                        ) : (
                          <Select value={contestForm.attached_coupon_id} onValueChange={v => setContestForm(f => ({ ...f, attached_coupon_id: v === "none" ? "" : v }))}>
                            <SelectTrigger className="mt-1 rounded-xl" data-testid="select-contest-coupon">
                              <SelectValue placeholder="Select a contest coupon..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {contestCoupons.map((cp: any) => (
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
                        <Input type="datetime-local" value={contestForm.end_time} onChange={e => setContestForm(f => ({ ...f, end_time: e.target.value }))}
                          className="mt-1 rounded-xl" data-testid="input-contest-end-time" />
                        <p className="text-xs text-muted-foreground mt-1">Winner will be auto-drawn at this time</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Banner Image URL (optional)</Label>
                        <Input value={contestForm.banner_image} onChange={e => setContestForm(f => ({ ...f, banner_image: e.target.value }))}
                          placeholder="https://..." className="mt-1 rounded-xl" data-testid="input-contest-banner" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Total Slots (1-100)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={contestForm.total_slots}
                          onChange={e => setContestForm(f => ({ ...f, total_slots: parseInt(e.target.value) || 20 }))}
                          className="mt-1 rounded-xl"
                          data-testid="input-contest-slots-manual"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowContestForm(false)} className="rounded-xl">Cancel</Button>
                      <Button onClick={() => createContestMutation.mutate({ ...contestForm, attached_coupon_id: contestForm.attached_coupon_id || null, end_time: contestForm.end_time || null })} disabled={createContestMutation.isPending || !contestForm.title}
                        className="bg-gradient-to-r from-amber-400 to-orange-500 border-0 rounded-xl" data-testid="button-contest-submit">
                        {createContestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Contest"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contest list */}
              {contestsLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}
                </div>
              ) : vendorContests.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No contests yet. Create your first contest!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {vendorContests.map((c: any) => {
                    const filled = c.slots?.length || 0;
                    const pct = Math.round((filled / c.total_slots) * 100);
                    return (
                      <Card key={c.id} className="rounded-2xl border-0 shadow-md shadow-black/5" data-testid={`contest-card-${c.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-[10px] border-0 ${c.status === "open" ? "bg-emerald-100 text-emerald-700" : c.status === "completed" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                  {c.status === "open" ? "🔥 Open" : c.status === "completed" ? "🏆 Completed" : "⏸️ Closed"}
                                </Badge>
                              </div>
                              <h3 className="font-bold text-gray-900 dark:text-white">{c.title}</h3>
                              {c.prize_description && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">🎁 {c.prize_description}</p>}
                              {c.attached_coupon_id && (
                                <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">🏷️ Coupon attached</p>
                              )}
                              {c.end_time && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">⏰ Auto-draw: {new Date(c.end_time).toLocaleString()}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="text-xl font-black text-gray-900 dark:text-white">{filled}</div>
                              <div className="text-[10px] text-muted-foreground">/{c.total_slots} slots</div>
                            </div>
                          </div>

                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>

                          {c.status === "completed" && c.winner_user_name && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                              <span className="text-lg">🏆</span>
                              <div>
                                <p className="text-xs text-muted-foreground font-semibold">Winner</p>
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{c.winner_user_name} — Slot #{c.winner_slot_number}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => { setEditContest(c); setEditContestForm({ title: c.title || "", description: c.description || "", prize_description: c.prize_description || "", banner_image: c.banner_image || "", total_slots: c.total_slots || 20, attached_coupon_id: c.attached_coupon_id || "", end_time: c.end_time ? new Date(c.end_time).toISOString().slice(0, 16) : "" }); setShowContestForm(false); }}
                              className="rounded-xl text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/20"
                              data-testid={`button-edit-contest-${c.id}`}>
                              Edit
                            </Button>
                            {c.status === "open" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => toggleContestStatusMutation.mutate({ id: c.id, status: "closed" })}
                                  disabled={toggleContestStatusMutation.isPending} className="rounded-xl text-xs h-8">
                                  ⏸️ Close Contest
                                </Button>
                                {filled > 0 && (
                                  <Button size="sm" onClick={() => drawWinnerMutation.mutate(c.id)}
                                    disabled={drawWinnerMutation.isPending}
                                    className="rounded-xl text-xs h-8 bg-gradient-to-r from-amber-400 to-orange-500 border-0"
                                    data-testid={`button-draw-winner-${c.id}`}>
                                    {drawWinnerMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : "🎲"} Draw Winner
                                  </Button>
                                )}
                              </>
                            )}
                            {c.status === "closed" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => toggleContestStatusMutation.mutate({ id: c.id, status: "open" })}
                                  disabled={toggleContestStatusMutation.isPending} className="rounded-xl text-xs h-8">
                                  ▶️ Reopen
                                </Button>
                                {filled > 0 && (
                                  <Button size="sm" onClick={() => drawWinnerMutation.mutate(c.id)}
                                    disabled={drawWinnerMutation.isPending}
                                    className="rounded-xl text-xs h-8 bg-gradient-to-r from-amber-400 to-orange-500 border-0"
                                    data-testid={`button-draw-winner-closed-${c.id}`}>
                                    🎲 Draw Winner
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
