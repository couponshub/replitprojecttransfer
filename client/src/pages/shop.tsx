import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Crown, MapPin, Phone, ShoppingCart, Tag, Copy, Check,
  Plus, Minus, Globe, ChevronLeft, ChevronRight, Zap, Package, Clock, Gift, Bookmark, BookmarkCheck, Share2, Store
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Category, Shop, Product, Coupon } from "@shared/schema";

interface CouponProduct {
  id: string;
  coupon_id: string;
  product_id: string;
  custom_price: string;
  product?: Product;
}

function CouponProductsList({ couponId }: { couponId: string }) {
  const { data: cpItems = [], isLoading } = useQuery<CouponProduct[]>({
    queryKey: [`/api/coupons/${couponId}/products`],
  });

  if (isLoading) return <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />;
  if (cpItems.length === 0) return null;

  return (
    <div className="mt-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Included Items</p>
      <div className="flex flex-col gap-1.5">
        {cpItems.map(cp => (
          <div key={cp.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-1.5">
            <Package className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1">{cp.product?.name || "Product"}</span>
            {parseFloat(cp.custom_price) === 0 ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">FREE</span>
            ) : (
              <span className="text-[10px] font-bold text-blue-600">₹{parseFloat(cp.custom_price).toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseBusinessHours(hours: string | null | undefined): { open: number; close: number } | null {
  if (!hours) return null;
  const match = hours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return {
    open: parseInt(match[1]) * 60 + parseInt(match[2]),
    close: parseInt(match[3]) * 60 + parseInt(match[4]),
  };
}

function isShopOpen(hours: string | null | undefined): boolean {
  const parsed = parseBusinessHours(hours);
  if (!parsed) return true;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return currentMins >= parsed.open && currentMins < parsed.close;
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const highlightCouponId = new URLSearchParams(search).get("highlight");
  const { 
    addItem, items, updateQuantity, itemCount, addItems, 
    removeFreeItemsForShop, applyCoupon, removeCoupon, appliedCoupons 
  } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [claimingCoupon, setClaimingCoupon] = useState<string | null>(null);
  const [savedCoupons, setSavedCoupons] = useState<Set<string>>(new Set());
  const [savingCoupon, setSavingCoupon] = useState<string | null>(null);
  const [sharedCoupon, setSharedCoupon] = useState<string | null>(null);
  const [activeSubCat, setActiveSubCat] = useState<string>("All");
  const [pickOneModal, setPickOneModal] = useState(false);
  const [pickOneItems, setPickOneItems] = useState<any[]>([]);
  const [pendingCouponResult, setPendingCouponResult] = useState<any>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightCouponId);
  const couponRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: shop, isLoading: shopLoading } = useQuery<Shop & { category?: Category }>({
    queryKey: [`/api/shops/${id}`],
  });

  useEffect(() => {
    if (id) localStorage.setItem("lastShopId", id);
  }, [id]);

  // Scroll to & highlight the coupon when arriving from map
  useEffect(() => {
    if (!highlightCouponId) return;
    const tryScroll = () => {
      const el = couponRefs.current[highlightCouponId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(highlightCouponId);
        setTimeout(() => setHighlightedId(null), 3000);
      } else {
        setTimeout(tryScroll, 300);
      }
    };
    setTimeout(tryScroll, 600);
  }, [highlightCouponId]);

  const { data: shopProducts = [], isLoading: prodLoading } = useQuery<Product[]>({
    queryKey: [`/api/products?shopId=${id}`],
  });
  const { data: shopCoupons = [] } = useQuery<Coupon[]>({
    queryKey: [`/api/coupons?shopId=${id}`],
  });

  const allBanners: string[] = [];
  if (shop) {
    if (shop.banner_image) allBanners.push(shop.banner_image);
    const extras = (shop as any).banners;
    if (extras && Array.isArray(extras)) extras.forEach((b: string) => { if (b && !allBanners.includes(b)) allBanners.push(b); });
  }

  useEffect(() => {
    if (allBanners.length < 2) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % allBanners.length), 3500);
    return () => clearInterval(t);
  }, [allBanners.length]);

  const prevBanner = () => setBannerIdx(i => (i - 1 + allBanners.length) % allBanners.length);
  const nextBanner = () => setBannerIdx(i => (i + 1) % allBanners.length);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: `Coupon code "${code}" copied!` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const [sharedShop, setSharedShop] = useState(false);

  const shareShop = async () => {
    const shareUrl = `${window.location.origin}/shop/${id}`;
    const shareText = `Check out ${shop?.name || "this shop"} on CouponsHub X — exclusive local deals in Eluru!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shop?.name, text: shareText, url: shareUrl });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(shareUrl);
    setSharedShop(true);
    toast({ title: "Shop link copied!", description: "Share it with friends to let them discover this shop." });
    setTimeout(() => setSharedShop(false), 2000);
  };

  const shareCoupon = async (couponId: string, couponCode: string) => {
    const shopId = id;
    const shareUrl = `${window.location.origin}/shop/${shopId}?highlight=${couponId}`;
    const shareText = `Check out this deal "${couponCode}" at ${shop?.name || "this shop"} on CouponsHub X!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${couponCode} - ${shop?.name}`, text: shareText, url: shareUrl });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(shareUrl);
    setSharedCoupon(couponId);
    toast({ title: "Share link copied!", description: "Paste it anywhere to share this coupon." });
    setTimeout(() => setSharedCoupon(null), 2000);
  };

  const finishCouponClaim = (result: any, chosenFreeItem?: any) => {
    const hasItemsToAdd = result.items_to_add && result.items_to_add.length > 0;
    const hasFreeItems = (result.items_to_add || []).some((i: any) => i.isFreeItem) || !!chosenFreeItem;
    if (hasFreeItems && id) {
      removeFreeItemsForShop(id);
    }
    if (hasItemsToAdd) {
      addItems(result.items_to_add.map((item: any) => ({
        id: item.id, name: item.name, price: item.price,
        shop_id: item.shop_id, shopName: item.shopName,
        isFreeItem: item.isFreeItem ?? false,
        isComboItem: item.isComboItem ?? false,
        couponCode: result.code,
        originalPrice: item.originalPrice,
        sub_category: item.sub_category,
      })));
    }
    if (chosenFreeItem) {
      addItems([{
        id: chosenFreeItem.id, name: chosenFreeItem.name, price: 0,
        shop_id: chosenFreeItem.shop_id, shopName: chosenFreeItem.shopName || shop?.name || "",
        isFreeItem: true, couponCode: result.code,
        originalPrice: chosenFreeItem.price || chosenFreeItem.originalPrice,
      }]);
    }
    const parts: string[] = [];
    if (result.type === "percentage" && parseFloat(result.value) > 0) parts.push(`${result.value}% off`);
    if (result.type === "flat" && parseFloat(result.value) > 0) parts.push(`₹${result.value} off`);
    if (chosenFreeItem) parts.push(`${chosenFreeItem.name} added free`);
    else if (result.items_to_add?.some((i: any) => i.isFreeItem)) parts.push("free item added");
    else if (hasItemsToAdd) parts.push(`${result.items_to_add.length} item${result.items_to_add.length > 1 ? "s" : ""} added`);
    if (id) { applyCoupon(id, { code: result.code, type: result.type, value: result.value, items_to_add: result.items_to_add, restrict_sub_category: result.restrict_sub_category, category_offer_subtype: result.category_offer_subtype, bogo_buy_product_name: result.bogo_buy_product_name, bogo_get_product_name: result.bogo_get_product_name }); }
    toast({ title: `✓ Coupon "${result.code}" applied!`, description: parts.join(" • ") || "Coupon applied to cart" });
    setTimeout(() => navigate("/cart"), 600);
  };

  const handleSaveCoupon = async (coupon: Coupon) => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in to save coupons", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (savedCoupons.has(coupon.id)) {
      navigate("/my-coupons");
      return;
    }
    setSavingCoupon(coupon.id);
    try {
      const result = await apiRequest("POST", "/api/user/save-coupon", { coupon_id: coupon.id });
      setSavedCoupons(prev => new Set([...prev, coupon.id]));
      if (result?.alreadySaved) {
        toast({ title: "Already saved!", description: "This coupon is already in My Coupons" });
      } else {
        toast({ title: "Coupon saved!", description: "Check My Coupons to use it" });
      }
    } catch (err: any) {
      toast({ title: err.message || "Could not save coupon", variant: "destructive" });
    } finally {
      setSavingCoupon(null);
    }
  };

  const handleClaimCoupon = async (coupon: Coupon) => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in to claim coupons", variant: "destructive" });
      navigate("/login");
      return;
    }

    const shopId = id || "";
    const existingForThisShop = appliedCoupons[shopId] || [];
    const storesWithCoupons = Object.keys(appliedCoupons).filter(sid => (appliedCoupons[sid] || []).length > 0);
    const isNewStore = !storesWithCoupons.includes(shopId);

    // Max 5 different stores rule
    if (isNewStore && storesWithCoupons.length >= 5) {
      toast({ 
        title: "Cart limit reached", 
        description: "You can only apply coupons from up to 5 different stores. Remove one first.",
        variant: "destructive" 
      });
      return;
    }

    // For percentage/flat coupons — need items from this store in cart
    const storeItems = items.filter(i => i.shop_id === shopId && !i.couponCode);
    const isDiscountOnly = coupon.type === "percentage" || coupon.type === "flat" || coupon.type === "min_order" || coupon.type === "category_offer";
    if (isDiscountOnly && storeItems.length === 0) {
      toast({ title: "Add items from this store to cart first, then claim the coupon!", variant: "destructive" });
      return;
    }

    setClaimingCoupon(coupon.id);
    try {
      const cartTotal = storeItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const result = await apiRequest("POST", "/api/coupons/validate", { code: coupon.code, shopId, cartTotal: cartTotal.toString() });

      const hasItemsToAdd = result.items_to_add && result.items_to_add.length > 0;
      const hasPickOne = result.pick_one_items && result.pick_one_items.length > 0;

      // If same store already has a coupon, auto-remove it first
      if (existingForThisShop.length > 0) {
        const oldCode = existingForThisShop[0].code;
        removeCoupon(shopId, oldCode);
      }

      if (!hasItemsToAdd && !hasPickOne && storeItems.length === 0) {
        toast({ title: "Add items from this store to cart first!", variant: "destructive" });
        setClaimingCoupon(null);
        return;
      }

      if (hasPickOne) {
        setPendingCouponResult(result);
        setPickOneItems(result.pick_one_items);
        setPickOneModal(true);
        setClaimingCoupon(null);
        return;
      }

      finishCouponClaim(result);
    } catch (err: any) {
      toast({ title: err.message || "Could not claim coupon", variant: "destructive" });
    } finally {
      setClaimingCoupon(null);
    }
  };

  const getItemQuantity = (productId: string) => items.find(i => i.id === productId)?.quantity || 0;

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in to add items to cart", variant: "destructive" });
      navigate("/login");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price as string),
      shop_id: shop?.id || "",
      shopName: shop?.name || "",
      sub_category: (product as any).sub_category || undefined,
    });
    toast({ title: `${product.name} added to cart` });
  };

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <Skeleton className="h-64 w-full rounded-3xl mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!shop) return null;

  const activeCoupons = shopCoupons.filter(c => c.is_active);
  const shopHours = (shop as any).business_hours as string | null | undefined;
  const shopOpen = isShopOpen(shopHours);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {/* Banner Slideshow */}
        <div className="relative h-56 sm:h-72 rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-blue-600 to-violet-700 group">
          {allBanners.length > 0 ? (
            <>
              {allBanners.map((src, idx) => (
                <img
                  key={src}
                  src={src}
                  alt="banner"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${idx === bannerIdx ? "opacity-100" : "opacity-0"}`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
              {allBanners.length > 1 && (
                <>
                  <button onClick={prevBanner} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid="button-prev-banner"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={nextBanner} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid="button-next-banner"><ChevronRight className="w-4 h-4" /></button>
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allBanners.map((_, i) => (
                      <button key={i} onClick={() => setBannerIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === bannerIdx ? "bg-white w-4" : "bg-white/50"}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-violet-700" />
            </>
          )}
        </div>

        {/* Logo + Title Section */}
        <div className="flex flex-col items-center text-center mb-8">
          {shop.logo && (
            <img 
              src={shop.logo} 
              alt={shop.name} 
              className="w-20 h-20 rounded-2xl object-cover border-4 border-gray-200 dark:border-gray-700 shadow-lg mb-4" 
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="flex items-center justify-center gap-2 mb-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{shop.name}</h1>
            <button
              onClick={shareShop}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border transition-colors bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-300 shadow-sm"
              data-testid="button-share-shop"
              title="Share this shop"
            >
              {sharedShop
                ? <Check className="w-4 h-4 text-emerald-500" />
                : <Share2 className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center mb-3">
            {shop.is_premium && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1 border-0">
                <Crown className="w-3.5 h-3.5" /> Premium
              </Badge>
            )}
            {shop.featured && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">Featured</Badge>}
          </div>
          {shop.category && (
            <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-0">
              {shop.category.name}
            </Badge>
          )}
        </div>

        {/* Info + Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-0 shadow-md h-full">
              <CardContent className="p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">About</h2>
                <p className="text-gray-600 dark:text-gray-400">{shop.description || "No description available."}</p>
                {shop.address && (
                  <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{shop.address}</span>
                  </div>
                )}
                {shopHours && (
                  <div className="flex items-center gap-2 mt-3">
                    <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{shopHours}</span>
                    <Badge className={`border-0 text-xs px-2 ${shopOpen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`} data-testid="badge-shop-status">
                      {shopOpen ? "Open Now" : "Closed"}
                    </Badge>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" variant="outline" className="rounded-xl gap-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => window.open(shop.map_link || `https://www.google.com/maps/search/${encodeURIComponent(shop.name + " " + shop.address)}`, "_blank")} data-testid="button-map-link">
                    <MapPin className="w-3.5 h-3.5" /> View on Map
                  </Button>
                  {shop.website_link && (
                    <Button size="sm" variant="outline" className="rounded-xl gap-2 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                      onClick={() => window.open(shop.website_link!, "_blank")} data-testid="button-website-link">
                      <Globe className="w-3.5 h-3.5" /> Visit Website
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {shop.whatsapp_number && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 flex flex-col gap-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">Contact Shop</h2>
                <Button className="bg-green-500 border-0 rounded-xl gap-2 text-white w-full"
                  onClick={() => window.open(`https://wa.me/${shop.whatsapp_number?.replace(/\D/g, "")}`, "_blank")} data-testid="button-whatsapp">
                  <Phone className="w-4 h-4" /> WhatsApp Us
                </Button>
                <p className="text-xs text-muted-foreground text-center">{shop.whatsapp_number}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coupons */}
        {activeCoupons.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Coupons</h2>
              <Badge className="bg-primary/10 text-primary border-0">{activeCoupons.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeCoupons.map(coupon => {
                const typeBg: Record<string, string> = {
                  percentage: "bg-gradient-to-br from-blue-500 to-cyan-500",
                  flat: "bg-gradient-to-br from-emerald-500 to-teal-500",
                  free_item: "bg-gradient-to-br from-violet-500 to-purple-500",
                  flash: "bg-gradient-to-br from-orange-500 to-red-500",
                };
                const typeColors: Record<string, string> = {
                  percentage: "from-blue-500 to-cyan-500",
                  flat: "from-emerald-500 to-teal-500",
                  free_item: "from-violet-500 to-purple-500",
                  flash: "from-orange-500 to-red-500",
                };
                const typeIcons: Record<string, string> = { percentage: "🏷️", flat: "💰", free_item: "🎁", flash: "⚡" };
                const bannerImg = (coupon as any).banner_image || (shop as any)?.banner_image;
                const isHighlighted = highlightedId === coupon.id;
                return (
                  <div
                    key={coupon.id}
                    ref={el => { couponRefs.current[coupon.id] = el; }}
                    className={`relative rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 transition-all duration-700 ${
                      isHighlighted
                        ? "shadow-2xl border-2 border-emerald-400 ring-4 ring-emerald-400/30 scale-[1.02]"
                        : "shadow-lg border border-gray-100 dark:border-gray-800"
                    }`}
                    data-testid={`card-coupon-${coupon.id}`}
                  >
                    {/* Banner — h-44 full width */}
                    <div className="relative w-full h-44 shrink-0 overflow-hidden">
                      {bannerImg ? (
                        <img src={bannerImg} alt={coupon.code} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className={`w-full h-full ${typeBg[coupon.type] || "bg-gradient-to-br from-blue-500 to-violet-500"} flex items-center justify-center`}>
                          <span className="text-6xl opacity-70">{typeIcons[coupon.type]}</span>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                      {/* Type badge */}
                      <div className="absolute top-2 right-2">
                        <Badge className={`bg-gradient-to-r ${typeColors[coupon.type]} text-white border-0 text-[10px] capitalize shadow-md`}>{coupon.type.replace("_", " ")}</Badge>
                      </div>
                      {/* Value label at bottom-left inside banner */}
                      <div className="absolute bottom-2 left-3">
                        <span className="text-white font-black text-lg drop-shadow">
                          {coupon.type === "percentage" ? `${coupon.value}% OFF` : coupon.type === "flat" ? `₹${coupon.value} OFF` : "🎁 FREE ITEM"}
                        </span>
                      </div>
                    </div>

                    {/* Content — compact */}
                    <div className="px-3 pt-2.5 pb-2.5 flex flex-col gap-1.5">
                      {/* Description */}
                      {(coupon as any).description && (
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{(coupon as any).description}</p>
                      )}

                      <CouponProductsList couponId={coupon.id} />

                      {/* Restrict category badge */}
                      {(coupon as any).restrict_sub_category && (
                        <p className="text-[10px] text-orange-500 font-semibold">🎯 For {(coupon as any).restrict_sub_category} only</p>
                      )}

                      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl px-2.5 py-1.5">
                        <code className="font-bold text-xs tracking-widest text-gray-900 dark:text-white">{coupon.code}</code>
                        <button onClick={() => copyCode(coupon.code)} className="text-primary ml-2 shrink-0" data-testid={`button-copy-coupon-${coupon.id}`}>
                          {copiedCode === coupon.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {coupon.expiry_date && (
                        <p className="text-[10px] text-muted-foreground">Valid until {new Date(coupon.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      )}
                      {(coupon as any).usage_limit && (
                        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          {Math.max(0, (coupon as any).usage_limit - ((coupon as any).usage_count ?? 0))} of {(coupon as any).usage_limit} uses remaining
                        </p>
                      )}
                      <div className="flex gap-1.5 mt-0.5">
                        <Button
                          size="sm"
                          onClick={() => handleClaimCoupon(coupon)}
                          disabled={claimingCoupon === coupon.id || ((coupon as any).usage_limit && ((coupon as any).usage_count ?? 0) >= (coupon as any).usage_limit)}
                          className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0 gap-1.5 text-white h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid={`button-claim-coupon-${coupon.id}`}
                        >
                          <Zap className="w-3 h-3" />
                          {claimingCoupon === coupon.id ? "Claiming..." : "Claim Offer"}
                        </Button>
                        <button
                          onClick={() => handleSaveCoupon(coupon)}
                          disabled={savingCoupon === coupon.id}
                          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border transition-colors ${savedCoupons.has(coupon.id) ? "bg-violet-100 dark:bg-violet-900 border-violet-300 dark:border-violet-700" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-violet-50 dark:hover:bg-violet-950"}`}
                          data-testid={`button-save-coupon-${coupon.id}`}
                          title={savedCoupons.has(coupon.id) ? "Go to My Coupons" : "Save to My Coupons"}
                        >
                          {savedCoupons.has(coupon.id)
                            ? <BookmarkCheck className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            : <Bookmark className="w-3.5 h-3.5 text-gray-500" />}
                        </button>
                        <button
                          onClick={() => shareCoupon(coupon.id, coupon.code)}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border transition-colors bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-300"
                          data-testid={`button-share-coupon-${coupon.id}`}
                          title="Share this coupon"
                        >
                          {sharedCoupon === coupon.id
                            ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                            : <Share2 className="w-3.5 h-3.5 text-gray-500" />}
                        </button>
                      </div>
                      <button
                        onClick={() => navigate(`/redeem/${coupon.id}`)}
                        className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        data-testid={`button-use-at-store-${coupon.id}`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        Use at Store
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Products / Services */}
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {(shop as any)?.listing_type === "products" ? "Products" : (shop as any)?.listing_type === "services" ? "Services" : "Products & Services"}
            </h2>
            <Badge className="bg-primary/10 text-primary border-0">{shopProducts.length}</Badge>
            {shopHours && !shopOpen && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1 ml-auto">
                <Clock className="w-3 h-3" /> Ordering paused — Shop is closed
              </Badge>
            )}
          </div>

          {/* Sub-category tabs */}
          {(() => {
            const subCats = Array.from(new Set(shopProducts.map((p: any) => p.sub_category).filter(Boolean))) as string[];
            if (subCats.length < 2) return null;
            const allTabs = ["All", ...subCats];
            return (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide" data-testid="section-subcategory-tabs">
                {allTabs.map(cat => (
                  <button key={cat} type="button" onClick={() => setActiveSubCat(cat)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      activeSubCat === cat
                        ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-transparent shadow-md shadow-blue-500/20"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                    data-testid={`tab-subcategory-${cat.replace(/\s+/g, "-").toLowerCase()}`}>
                    {cat}
                  </button>
                ))}
              </div>
            );
          })()}

          {prodLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : shopProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-muted-foreground">No products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {shopProducts.filter((p: any) => activeSubCat === "All" || p.sub_category === activeSubCat).map(product => {
                const isService = (product as any).type === "service";
                const qty = getItemQuantity(product.id);
                const imgs = (product as any).images;
                const firstImg = (imgs && imgs.length > 0) ? imgs[0] : product.image;
                return (
                  <Card key={product.id} className="rounded-2xl border-0 shadow-md overflow-hidden flex flex-col" data-testid={`card-product-${product.id}`}>
                    <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
                      {firstImg ? (
                        <img src={firstImg} alt={product.name} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl">{product.name[0]}</span>
                        </div>
                      )}
                      {isService && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-blue-500 text-white border-0 text-[10px] px-1.5 py-0.5">Service</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                      {((product as any).grams || (product as any).size || (product as any).quantity || (product as any).duration) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(product as any).grams && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-muted-foreground">{(product as any).grams}</span>}
                          {(product as any).quantity && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-muted-foreground">{(product as any).quantity}</span>}
                          {(product as any).size && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-muted-foreground">{(product as any).size}</span>}
                          {(product as any).duration && <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md text-blue-600 dark:text-blue-400 font-medium">{(product as any).duration}</span>}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-3">
                        {product.price ? (
                          <span className="text-base font-bold text-gray-900 dark:text-white">₹{parseFloat(product.price as string).toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-blue-600 font-semibold">Service</span>
                        )}
                        {!isService && (
                          shopHours && !shopOpen ? (
                            <Button size="sm" disabled className="rounded-xl h-8 px-3 text-xs opacity-50" data-testid={`button-add-cart-${product.id}`}>Closed</Button>
                          ) : qty > 0 ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(product.id, qty - 1)} className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center" data-testid={`button-decrease-${product.id}`}><Minus className="w-3 h-3" /></button>
                              <span className="text-sm font-medium w-4 text-center">{qty}</span>
                              <button onClick={() => handleAddToCart(product)} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center" data-testid={`button-increase-${product.id}`}><Plus className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => handleAddToCart(product)} className="rounded-xl h-8 px-3 text-xs bg-primary" data-testid={`button-add-cart-${product.id}`}>Add</Button>
                          )
                        )}
                        {isService && (
                          shopHours && !shopOpen ? (
                            <Button size="sm" disabled className="rounded-xl h-8 px-3 text-xs opacity-50" data-testid={`button-add-cart-${product.id}`}>Closed</Button>
                          ) : qty > 0 ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(product.id, qty - 1)} className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center" data-testid={`button-decrease-${product.id}`}><Minus className="w-3 h-3" /></button>
                              <span className="text-sm font-medium w-4 text-center">{qty}</span>
                              <button onClick={() => handleAddToCart(product)} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center" data-testid={`button-increase-${product.id}`}><Plus className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => handleAddToCart(product)} className="rounded-xl h-8 px-3 text-xs bg-blue-500 hover:bg-blue-600" data-testid={`button-add-cart-${product.id}`}>Add</Button>
                          )
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

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" data-testid="floating-cart-button">
          <button
            onClick={() => navigate("/cart")}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all hover:scale-105 active:scale-95"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold text-sm">{itemCount} item{itemCount !== 1 ? "s" : ""} in cart</span>
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">View Cart →</span>
          </button>
        </div>
      )}

      {/* Pick One Free Item Modal */}
      <Dialog open={pickOneModal} onOpenChange={v => { if (!v) { setPickOneModal(false); setPendingCouponResult(null); setPickOneItems([]); } }}>
        <DialogContent className="rounded-2xl max-w-sm" data-testid="modal-pick-one">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Gift className="w-5 h-5 text-emerald-500" />
              Pick Your Free Item
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pb-1">
            <p className="text-sm text-muted-foreground">Choose <span className="font-semibold text-emerald-600">one free item</span> from the list below — it will be added to your cart automatically.</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {pickOneItems.map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`pick-one-item-${item.id}`}
                  onClick={() => {
                    if (pendingCouponResult) {
                      finishCouponClaim(pendingCouponResult, item);
                      setPickOneModal(false);
                      setPendingCouponResult(null);
                      setPickOneItems([]);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through mr-1">₹{Number(item.price).toLocaleString()}</span>
                      <span className="text-emerald-600 font-bold">FREE</span>
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Pick</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
