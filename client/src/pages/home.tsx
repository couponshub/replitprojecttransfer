import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Tag, ChevronRight, Star, MapPin, Zap, Percent, Flame, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Category, Shop, Coupon, Banner } from "@shared/schema";

type BannerWithCoupon = Banner & { coupon?: Coupon & { shop?: Shop } };

function BannerSlider({ banners }: { banners: BannerWithCoupon[] }) {
  const [current, setCurrent] = useState(0);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % banners.length);
    }, 4000);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length > 1) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, startTimer]);

  const go = (dir: number) => {
    setCurrent(c => (c + dir + banners.length) % banners.length);
    startTimer();
  };

  const handleClick = (banner: BannerWithCoupon) => {
    if (banner.coupon) {
      navigator.clipboard.writeText(banner.coupon.code).catch(() => {});
      toast({
        title: `🎉 Coupon "${banner.coupon.code}" claimed!`,
        description: banner.coupon.shop
          ? `Visit ${banner.coupon.shop.name} to use it`
          : "Use this code at checkout",
      });
      if (banner.coupon.shop) navigate(`/shop/${banner.coupon.shop.id}`);
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className="w-full bg-black" data-testid="section-banners">
      <div className="relative max-w-7xl mx-auto overflow-hidden" style={{ aspectRatio: "16/6.5" }}>
        {/* Slides */}
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)`, width: `${banners.length * 100}%` }}
        >
          {banners.map((b, i) => (
            <div
              key={b.id}
              className="relative h-full cursor-pointer"
              style={{ width: `${100 / banners.length}%` }}
              onClick={() => handleClick(b)}
              data-testid={`banner-slide-${b.id}`}
            >
              <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <p className="text-white font-bold text-base sm:text-xl drop-shadow-lg">{b.title}</p>
                {b.coupon && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full border border-white/30">
                      {b.coupon.code}
                    </span>
                    <span className="text-white/80 text-xs sm:text-sm">
                      {b.coupon.type === "percentage" ? `${b.coupon.value}% OFF` : b.coupon.type === "flat" ? `₹${b.coupon.value} OFF` : "Free Item"}
                    </span>
                    <span className="text-emerald-300 text-xs font-semibold animate-pulse">Tap to claim →</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Prev/Next arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); go(-1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
              data-testid="button-banner-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); go(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
              data-testid="button-banner-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setCurrent(i); startTimer(); }}
                className={`rounded-full transition-all ${i === current ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
                data-testid={`button-banner-dot-${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_COLORS = [
  "from-orange-400 to-red-500",
  "from-pink-400 to-rose-500",
  "from-blue-400 to-cyan-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-yellow-400 to-orange-500",
  "from-indigo-400 to-blue-600",
  "from-red-400 to-pink-500",
  "from-teal-400 to-emerald-500",
  "from-amber-400 to-yellow-500",
];

const CATEGORY_ICONS = ["🍔", "👗", "📱", "💄", "✈️", "🥦", "🏋️", "🎬", "🛋️", "📚"];

function CategoryCard({ category, index }: { category: Category; index: number }) {
  const [, navigate] = useLocation();
  return (
    <div
      onClick={() => navigate(`/category/${category.id}`)}
      className="flex flex-col items-center gap-2 cursor-pointer group shrink-0"
      data-testid={`card-category-${category.id}`}
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} flex items-center justify-center text-2xl shadow-md transition-transform group-hover:scale-105`}>
        {CATEGORY_ICONS[index % CATEGORY_ICONS.length]}
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-16 leading-tight">{category.name}</span>
    </div>
  );
}

function ShopCard({ shop }: { shop: Shop & { category?: Category } }) {
  const [, navigate] = useLocation();
  return (
    <Card
      className="rounded-2xl border-0 shadow-md cursor-pointer hover-elevate transition-all overflow-visible"
      onClick={() => navigate(`/shop/${shop.id}`)}
      data-testid={`card-shop-${shop.id}`}
    >
      <div className="h-28 rounded-t-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
        {shop.banner_image ? (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 to-violet-600/40" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 opacity-60" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">{shop.name[0]}</span>
        </div>
        {shop.is_premium && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-400 text-amber-900 text-xs gap-1 border-0 px-2">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </div>
        )}
        {shop.featured && !shop.is_premium && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-500 text-white text-xs border-0 px-2">Featured</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{shop.name}</h3>
            {shop.category && (
              <span className="text-xs text-muted-foreground">{shop.category.name}</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
        {shop.address && (
          <div className="flex items-center gap-1 mt-2">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{shop.address}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CouponCard({ coupon }: { coupon: Coupon & { shop?: Shop } }) {
  const typeColors: Record<string, string> = {
    percentage: "from-blue-500 to-cyan-500",
    flat: "from-emerald-500 to-teal-500",
    free_item: "from-violet-500 to-purple-500",
    flash: "from-orange-500 to-red-500",
  };
  const typeIcons: Record<string, string> = { percentage: "🏷️", flat: "💰", free_item: "🎁", flash: "⚡" };

  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${typeColors[coupon.type] || "from-blue-500 to-violet-500"} p-0.5 shadow-lg`} data-testid={`card-coupon-${coupon.id}`}>
      <div className="rounded-[calc(1rem-2px)] bg-white dark:bg-gray-900 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{typeIcons[coupon.type]}</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {coupon.type === "percentage" ? `${coupon.value}% OFF` : coupon.type === "flat" ? `₹${coupon.value} OFF` : "FREE ITEM"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{coupon.shop?.name || "All Shops"}</p>
          </div>
          <Badge className={`bg-gradient-to-r ${typeColors[coupon.type]} text-white border-0 text-xs capitalize`}>
            {coupon.type}
          </Badge>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
          <code className="text-sm font-bold text-gray-900 dark:text-white tracking-wider">{coupon.code}</code>
          <button
            onClick={() => navigator.clipboard.writeText(coupon.code)}
            className="text-xs text-primary font-medium"
          >
            Copy
          </button>
        </div>
        {coupon.expiry_date && (
          <p className="text-xs text-muted-foreground mt-2">
            Expires {new Date(coupon.expiry_date).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: featuredShops = [], isLoading: shopLoading } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops/featured"],
  });

  const { data: activeCoupons = [], isLoading: couponLoading } = useQuery<(Coupon & { shop?: Shop })[]>({
    queryKey: ["/api/coupons/active"],
  });

  const { data: allShops = [] } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops"],
  });

  const { data: homeBanners = [] } = useQuery<BannerWithCoupon[]>({
    queryKey: ["/api/banners"],
  });

  const filteredShops = searchQuery
    ? allShops.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar onSearch={setSearchQuery} />

      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-300" />
            <span className="text-sm font-medium text-white/80">Hot deals today</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            Unbeatable Coupons &<br />
            <span className="text-yellow-300">Exclusive Deals</span>
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-lg">
            Explore thousands of shops and save big with the best coupons in India.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("/login")}
              className="bg-white text-blue-600 border-0 rounded-xl font-semibold h-12 px-6"
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Button
              variant="ghost"
              onClick={() => document.getElementById("shops-section")?.scrollIntoView({ behavior: "smooth" })}
              className="text-white border border-white/30 rounded-xl h-12 px-6 bg-white/10"
            >
              Browse Shops
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-12 max-w-sm">
            {[["10K+", "Shops"], ["50K+", "Coupons"], ["98%", "Savings Rate"]].map(([n, l], i) => (
              <div key={i}>
                <div className="text-2xl font-bold">{n}</div>
                <div className="text-white/60 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {homeBanners.length > 0 && <BannerSlider banners={homeBanners} />}

      {searchQuery && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Search results for "{searchQuery}"
          </h2>
          {filteredShops.length === 0 ? (
            <p className="text-muted-foreground">No shops found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredShops.map(shop => <ShopCard key={shop.id} shop={shop} />)}
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shop by Category</h2>
          <button onClick={() => navigate("/shops")} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline" data-testid="button-view-all-shops">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
          {catLoading
            ? Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                  <Skeleton className="w-16 h-16 rounded-2xl" />
                  <Skeleton className="w-14 h-3 rounded" />
                </div>
              ))
            : categories.map((cat, i) => <CategoryCard key={cat.id} category={cat} index={i} />)
          }
        </div>
      </div>

      <div id="shops-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Featured Shops</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/home")} className="text-primary">
            View all <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {shopLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="h-28 w-full" />
                <div className="p-4 bg-white dark:bg-gray-900">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {featuredShops.map(shop => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <Percent className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Coupons</h2>
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 ml-1">
            {activeCoupons.length} live
          </Badge>
        </div>
        {couponLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeCoupons.map(coupon => <CouponCard key={coupon.id} coupon={coupon} />)}
          </div>
        )}
      </div>
    </div>
  );
}
