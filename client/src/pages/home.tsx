import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, ChevronRight, Star, MapPin, Percent, ChevronLeft, Search, Mic, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Category, Shop, Coupon, Banner, Product } from "@shared/schema";

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

type SearchResults = {
  shops: (Shop & { category?: Category })[];
  products: (Product & { shop?: Shop })[];
  coupons: (Coupon & { shop?: Shop })[];
};

const SHOP_ICON_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#ec4899", "#14b8a6",
  "#8b5cf6", "#f59e0b",
];

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function SearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 380);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: results, isLoading: searching } = useQuery<SearchResults>({
    queryKey: ["/api/search", debouncedQuery],
    enabled: debouncedQuery.trim().length >= 2,
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`).then(r => r.json()),
  });

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice search not supported", description: "Try typing your search instead." });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      setOpen(true);
      inputRef.current?.focus();
    };
    recognition.onerror = () => { setIsListening(false); };
    recognition.start();
  };

  const hasResults = results && (results.shops.length > 0 || results.products.length > 0 || results.coupons.length > 0);
  const totalResults = results ? results.shops.length + results.products.length + results.coupons.length : 0;

  return (
    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 z-30">
      <div ref={containerRef} className="relative">

        {/* Frosted glass search bar */}
        <div className="relative flex items-center bg-white/88 dark:bg-gray-900/88 backdrop-blur-3xl rounded-2xl shadow-2xl border border-white/60 dark:border-white/10 ring-1 ring-blue-200/60 dark:ring-blue-700/30 transition-all focus-within:ring-2 focus-within:ring-blue-400/50 focus-within:shadow-blue-200/30">
          <Search className="absolute left-4 w-5 h-5 text-blue-400 dark:text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) setOpen(true); else setOpen(false); }}
            onFocus={() => { if (query.length >= 2) setOpen(true); }}
            placeholder="Search shops, products, coupons..."
            className="w-full pl-12 pr-[4.5rem] py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl focus:outline-none text-base font-medium"
            data-testid="input-search-bar"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setDebouncedQuery(""); setOpen(false); }}
              className="absolute right-14 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              data-testid="button-search-clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={startVoice}
            className={`absolute right-3 w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-md ${
              isListening
                ? "bg-red-500 text-white animate-pulse shadow-red-300"
                : "bg-gradient-to-br from-blue-500 to-violet-600 text-white hover:opacity-90 shadow-blue-300/50"
            }`}
            data-testid="button-voice-search"
            title={isListening ? "Listening..." : "Voice search"}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Search hint label */}
        {!open && !query && (
          <p className="text-center text-xs text-white/60 mt-2 font-medium">
            Search any store, product, service, or coupon code
          </p>
        )}

        {/* Results dropdown */}
        {open && debouncedQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/96 dark:bg-gray-950/96 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 max-h-[72vh] overflow-y-auto">
            {searching ? (
              <div className="p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-3">Searching across shops, products & coupons…</p>
              </div>
            ) : !hasResults ? (
              <div className="p-8 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm text-muted-foreground mt-2">No results for "<strong>{debouncedQuery}</strong>"</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different keyword or browse categories below</p>
              </div>
            ) : (
              <div>
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{totalResults} result{totalResults !== 1 ? "s" : ""} for "<span className="text-blue-500">{debouncedQuery}</span>"</p>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {results!.shops.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[9px]">🏪</span>
                        Shops
                      </p>
                      {results!.shops.map(shop => (
                        <button
                          key={shop.id}
                          onClick={() => { navigate(`/shop/${shop.id}`); setOpen(false); setQuery(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left group"
                          data-testid={`search-result-shop-${shop.id}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                            {shop.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{shop.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{shop.category?.name}{shop.description ? ` · ${shop.description.slice(0, 35)}` : ""}</p>
                          </div>
                          {shop.is_premium && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {results!.products.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[9px]">🛍️</span>
                        Products & Services
                      </p>
                      {results!.products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => { navigate(`/shop/${product.shop_id}`); setOpen(false); setQuery(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left group"
                          data-testid={`search-result-product-${product.id}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg shrink-0 shadow-md">
                            🛍️
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.shop?.name} · <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{product.price}</span></p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {results!.coupons.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-400 text-[9px]">🏷️</span>
                        Coupons
                      </p>
                      {results!.coupons.map(coupon => (
                        <button
                          key={coupon.id}
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code).catch(() => {});
                            toast({
                              title: `🎉 "${coupon.code}" copied!`,
                              description: coupon.shop ? `Apply at ${coupon.shop.name}` : "Apply at checkout",
                            });
                            if (coupon.shop_id) navigate(`/shop/${coupon.shop_id}`);
                            setOpen(false);
                            setQuery("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left group"
                          data-testid={`search-result-coupon-${coupon.id}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                            🏷️
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-white tracking-widest font-mono">{coupon.code}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {coupon.shop?.name} · {coupon.type === "percentage" ? `${coupon.value}% OFF` : coupon.type === "flat" ? `₹${coupon.value} OFF` : "Free Item"}
                            </p>
                          </div>
                          <span className="text-xs text-primary font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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

function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  if (!url || url.length < 10 || url === "L") return null;
  const patterns = [
    /@(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /place\/(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /center=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }
  }
  return null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

let _leafletLoaded = false;
let _leafletPromise: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if (_leafletLoaded) return Promise.resolve();
  if (_leafletPromise) return _leafletPromise;
  _leafletPromise = new Promise((resolve) => {
    if (!(document.querySelector('link[href*="leaflet"]'))) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => { _leafletLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
  return _leafletPromise;
}

function NearbyMapPanel({
  isOpen,
  onClose,
  shops,
}: {
  isOpen: boolean;
  onClose: () => void;
  shops: (Shop & { category?: Category })[];
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const shopMarkersRef = useRef<any[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const mapReadyRef = useRef(false);

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});

  const mappableShops = useMemo(() =>
    shops.map((s, i) => {
      const coords = parseGoogleMapsCoords(s.map_link || "");
      if (!coords) return null;
      return { ...s, coords, color: SHOP_ICON_COLORS[i % SHOP_ICON_COLORS.length] };
    }).filter(Boolean) as (Shop & { category?: Category; coords: { lat: number; lng: number }; color: string })[],
    [shops]
  );

  const linkedShops = useMemo(() =>
    shops.map((s, i) => ({
      ...s,
      color: SHOP_ICON_COLORS[i % SHOP_ICON_COLORS.length],
      hasCoords: !!parseGoogleMapsCoords(s.map_link || ""),
    })).filter(s => s.map_link && s.map_link !== "L" && s.map_link.length > 5),
    [shops]
  );

  const recalcDistances = useCallback((lat: number, lng: number) => {
    const d: Record<string, number> = {};
    mappableShops.forEach(s => { d[s.id] = haversineDistance(lat, lng, s.coords.lat, s.coords.lng); });
    setDistances(d);
  }, [mappableShops]);

  useEffect(() => {
    if (!isOpen) {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      return;
    }

    loadLeaflet().then(() => {
      if (!mapContainerRef.current || mapReadyRef.current) return;
      const L = (window as any).L;
      const initialCenter = userPos ? [userPos.lat, userPos.lng] : [17.0025, 81.0028];
      const map = L.map(mapContainerRef.current, { zoom: 15, center: initialCenter, zoomControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);
      mapRef.current = map;
      mapReadyRef.current = true;

      mappableShops.forEach((shop) => {
        const icon = L.divIcon({
          html: `<div style="background:${shop.color};box-shadow:0 0 10px ${shop.color}99;border:1.5px solid rgba(255,255,255,0.4);border-radius:6px;padding:2px 6px;color:white;font-size:9px;font-weight:900;white-space:nowrap;cursor:pointer;position:relative">
            <div style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);width:8px;height:8px;background:rgba(0,0,0,0.4);border-radius:50%"></div>
            <div style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:8px;height:8px;background:rgba(0,0,0,0.4);border-radius:50%"></div>
            ${shop.name.slice(0, 8)}
          </div>`,
          className: "",
          iconSize: [80, 24],
          iconAnchor: [40, 12],
        });
        const m = L.marker([shop.coords.lat, shop.coords.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${shop.name}</b><br>Tap to navigate`)
          .on("click", () => { window.open(shop.map_link!, "_blank"); });
        shopMarkersRef.current.push(m);
      });
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        recalcDistances(lat, lng);

        if (mapRef.current) {
          const L = (window as any).L;
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
          } else if (L) {
            const icon = L.divIcon({
              html: `<div style="width:18px;height:18px;background:radial-gradient(circle at 35% 30%,#ff6b6b,#dc2626);border:2.5px solid white;border-radius:50%;box-shadow:0 0 14px rgba(239,68,68,0.9)"></div>`,
              className: "",
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
            userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
          }
          if (!mapReadyRef.current) mapRef.current.setView([lat, lng], 15);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    };
  }, [isOpen, mappableShops, recalcDistances]);

  const sortedShops = [...mappableShops].sort((a, b) => (distances[a.id] ?? Infinity) - (distances[b.id] ?? Infinity));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Panel — slides up from bottom */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
      >
        <div
          className="mx-auto max-w-lg w-full rounded-t-3xl flex flex-col"
          style={{
            background: "rgba(6,12,36,0.98)",
            boxShadow: "0 -8px 60px rgba(0,100,255,0.25), 0 -2px 0 rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            maxHeight: "92dvh",
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/25" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 shrink-0">
            <div>
              <h3 className="text-white font-bold text-base">Nearby Shops</h3>
              <p className="text-white/50 text-xs">
                {linkedShops.length === 0
                  ? "Add Google Maps links to shops in admin panel"
                  : `${linkedShops.length} shop${linkedShops.length !== 1 ? "s" : ""} nearby · tap to navigate`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              data-testid="button-map-close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Leaflet Map area */}
          <div
            ref={mapContainerRef}
            className="w-full shrink-0"
            style={{ height: "55vw", maxHeight: "360px", minHeight: "240px" }}
          />

          {/* Empty state — no map links at all */}
          {linkedShops.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 px-4 shrink-0">
              <span className="text-3xl mb-2">🗺️</span>
              <p className="text-white/50 text-sm text-center">
                No shops with Google Maps links yet.<br />
                Go to <strong className="text-white/70">Admin → Shops → Edit</strong> and paste a Google Maps URL to show shops here.
              </p>
            </div>
          )}

          {/* Shops list — linked shops (sorted: parseable-coord ones by real distance first, then others) */}
          {linkedShops.length > 0 && (
            <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-2 pt-2">
              {[
                ...sortedShops.map(s => ({ ...s, hasCoords: true })),
                ...linkedShops.filter(s => !s.hasCoords),
              ].map((shop) => {
                const dist = distances[shop.id];
                return (
                  <button
                    key={shop.id}
                    onClick={() => { window.open(shop.map_link!, "_blank"); }}
                    data-testid={`button-map-shop-${shop.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                    style={{ border: `1px solid ${shop.color}33` }}
                  >
                    {/* Colored coupon icon */}
                    <div
                      className="shrink-0 flex items-center justify-center w-10 h-7 rounded-md border border-white/20 relative"
                      style={{ background: shop.color, boxShadow: `0 0 10px ${shop.color}66` }}
                    >
                      <div className="absolute -left-1 w-2 h-2 rounded-full bg-black/50" />
                      <div className="absolute -right-1 w-2 h-2 rounded-full bg-black/50" />
                      <span className="text-white text-[9px] font-black">
                        {(shop as any).category?.name?.slice(0, 3).toUpperCase() || "MAP"}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{shop.name}</p>
                      <p className="text-white/40 text-xs truncate">{shop.address}</p>
                    </div>
                    {/* Live distance or navigate icon */}
                    <div className="shrink-0 text-right">
                      {shop.hasCoords && dist != null ? (
                        <>
                          <span className="text-sm font-bold" style={{ color: shop.color }}>{formatDist(dist)}</span>
                          <p className="text-white/30 text-[9px]">away</p>
                        </>
                      ) : (
                        <span className="text-white/30 text-xs">Navigate →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="shrink-0 pb-safe pb-2 pt-1 flex justify-center">
            <p className="text-white/20 text-[10px]">Tap a shop to open in Google Maps</p>
          </div>
        </div>
      </div>
    </>
  );
}

function RadarMap({ lat, lng, onClick }: { lat: number | null; lng: number | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid="button-radar-map"
      className="relative w-24 h-24 rounded-full cursor-pointer group transition-transform hover:scale-105 active:scale-95"
      style={{
        background: "radial-gradient(circle at 40% 35%, rgba(0,30,60,0.97) 0%, rgba(0,10,30,0.99) 100%)",
        boxShadow: "0 0 32px rgba(0,220,200,0.22), 0 0 72px rgba(0,100,220,0.14), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)",
        border: "1.5px solid rgba(0,220,200,0.28)",
      }}
    >
      {/* Concentric rings */}
      {[0.88, 0.64, 0.4].map((scale, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px solid rgba(0,220,200,${0.12 + i * 0.07})`,
            transform: `scale(${scale})`,
          }}
        />
      ))}
      {/* Cross hair lines */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-full h-px" style={{ background: "rgba(0,220,200,0.12)" }} />
        <div className="absolute h-full w-px" style={{ background: "rgba(0,220,200,0.12)" }} />
      </div>
      {/* Sweeping radar beam */}
      <div
        className="absolute inset-0 rounded-full radar-sweep overflow-hidden"
        style={{
          background: "conic-gradient(from 0deg at 50% 50%, transparent 310deg, rgba(0,255,200,0.08) 330deg, rgba(0,255,200,0.35) 360deg)",
        }}
      />
      {/* Center dot + ping */}
      <div className="absolute inset-0 flex items-center justify-center">
        {lat && (
          <div
            className="absolute w-4 h-4 rounded-full radar-ping"
            style={{ background: "rgba(0,255,200,0.25)" }}
          />
        )}
        <div
          className="w-3 h-3 rounded-full z-10"
          style={{
            background: "radial-gradient(circle at 35% 30%, #5fffda, #00c8aa)",
            boxShadow: "0 0 10px rgba(0,255,200,0.9), 0 0 20px rgba(0,255,200,0.4)",
          }}
        />
      </div>
      {/* 3D gloss highlight */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 35% 28%, rgba(255,255,255,0.14) 0%, transparent 60%)",
        }}
      />
    </button>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "";
          const state = data.address?.state || "";
          const address = [city, state].filter(Boolean).join(", ");
          setUserLocation({ lat, lng, address: address || "Your Location" });
        } catch {
          setUserLocation({ lat, lng, address: "Your Location" });
        }
      },
      () => {}
    );
  }, []);

  const openMap = () => setMapOpen(true);

  const { data: categories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: featuredShops = [], isLoading: shopLoading } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops/featured"],
  });

  const { data: activeCoupons = [], isLoading: couponLoading } = useQuery<(Coupon & { shop?: Shop })[]>({
    queryKey: ["/api/coupons/active"],
  });

  const { data: homeBanners = [] } = useQuery<BannerWithCoupon[]>({
    queryKey: ["/api/banners"],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NearbyMapPanel
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        shops={featuredShops}
      />
      <Navbar />

      {/* Search bar hero — compact gradient with floating coupons */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative pt-8 pb-8">
          <SearchBar />

          {/* Location label */}
          <div className="flex items-center justify-center gap-1.5 mt-3 mb-5">
            <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            {userLocation ? (
              <span className="text-white/80 text-xs font-medium" data-testid="text-user-location">
                {userLocation.address}
              </span>
            ) : (
              <span className="text-white/45 text-xs">Detecting your location…</span>
            )}
          </div>

          {/* 3D Radar — click to open map */}
          <div className="flex justify-center pb-2">
            <RadarMap
              lat={userLocation?.lat ?? null}
              lng={userLocation?.lng ?? null}
              onClick={openMap}
            />
          </div>
        </div>
      </div>

      {/* Banner slider */}
      {homeBanners.length > 0 && <BannerSlider banners={homeBanners} />}

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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

      {/* Featured Shops */}
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

      {/* Active Coupons */}
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
