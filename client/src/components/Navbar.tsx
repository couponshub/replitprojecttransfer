import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Search, Menu, X, Tag, Zap, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

type SearchResult = {
  shops: any[];
  products: any[];
  coupons: any[];
};

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", debouncedQuery],
    enabled: debouncedQuery.trim().length >= 2,
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`).then(r => r.json()),
  });

  const total = results ? results.shops.length + results.products.length + results.coupons.length : 0;
  const hasResults = total > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs hidden sm:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder="Search shops, products, coupons..."
          className="pl-9 pr-8 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-1 focus-visible:ring-blue-400 text-sm h-9"
          data-testid="input-global-search"
        />
        {query && (
          <button onClick={() => { setQuery(""); setDebouncedQuery(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-global-search-clear">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && debouncedQuery.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 max-h-[70vh] overflow-y-auto min-w-[340px]">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground mt-2">Searching...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different keyword</p>
            </div>
          ) : (
            <div>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground">{total} result{total !== 1 ? "s" : ""} for "<span className="text-blue-500">{debouncedQuery}</span>"</p>
              </div>

              {results!.shops.length > 0 && (
                <div className="p-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">🏪 Shops</p>
                  {results!.shops.slice(0, 4).map((shop: any) => (
                    <button key={shop.id} onClick={() => { navigate(`/shop/${shop.id}`); setOpen(false); setQuery(""); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left" data-testid={`nav-search-shop-${shop.id}`}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">{shop.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">{shop.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{shop.category?.name}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {results!.products.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">🛍️ Products & Services</p>
                  {results!.products.slice(0, 4).map((product: any) => (
                    <button key={product.id} onClick={() => { navigate(`/shop/${product.shop_id}`); setOpen(false); setQuery(""); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left" data-testid={`nav-search-product-${product.id}`}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm shrink-0">🛍️</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.shop?.name} · <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₹{product.price}</span></p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results!.coupons.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">🏷️ Coupons</p>
                  {results!.coupons.slice(0, 4).map((coupon: any) => (
                    <button key={coupon.id} onClick={() => {
                      navigator.clipboard.writeText(coupon.code).catch(() => {});
                      toast({ title: `"${coupon.code}" copied!`, description: coupon.shop ? `Apply at ${coupon.shop.name}` : "Apply at checkout" });
                      if (coupon.shop_id) navigate(`/shop/${coupon.shop_id}`);
                      setOpen(false); setQuery("");
                    }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left" data-testid={`nav-search-coupon-${coupon.id}`}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm shrink-0">🏷️</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 dark:text-white font-mono">{coupon.code}</p>
                        <p className="text-[10px] text-muted-foreground">{coupon.shop?.name}</p>
                      </div>
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 shrink-0">{coupon.type === "percentage" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2 pt-0 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { navigate("/home"); setOpen(false); }} className="w-full text-center text-[10px] font-semibold text-blue-500 hover:text-blue-600 py-2" data-testid="button-see-all-results">
                  See all results on home page →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast({ title: "Logged out successfully" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/home">
            <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" data-testid="link-home-logo">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
                Coupons<span className="text-blue-500">Hub X</span>
              </span>
            </div>
          </Link>

          {onSearch ? (
            <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search shops, products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  data-testid="input-search"
                />
              </div>
            </form>
          ) : (
            <GlobalSearch />
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin-dashboard")} data-testid="link-admin-dashboard">
                    <Tag className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
                <Link href="/cart">
                  <Button variant="ghost" size="icon" className="relative" data-testid="link-cart">
                    <ShoppingCart className="w-5 h-5" />
                    {itemCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-blue-500 text-white">
                        {itemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                        {user.name[0].toUpperCase()}
                      </div>
                      <span className="hidden sm:inline max-w-24 truncate">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="link-profile">
                      <User className="w-4 h-4 mr-2" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-orders")} data-testid="link-my-orders">
                      <Package className="w-4 h-4 mr-2" /> My Orders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="button-logout">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => navigate("/login")} size="sm" className="rounded-xl" data-testid="button-login-nav">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
