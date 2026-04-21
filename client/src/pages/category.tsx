import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ArrowLeft, Crown, MapPin, ArrowUpAZ, ArrowDownAZ, Search, X, ShoppingBag, Store } from "lucide-react";
import type { Category, Shop, Product } from "@shared/schema";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [sortAZ, setSortAZ] = useState<"az" | "za" | "none">("none");
  const [activeTab, setActiveTab] = useState<"shops" | "products">("shops");
  const [productSearch, setProductSearch] = useState("");

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const categoryData = allCategories.find(c => c.id === id);

  const { data: allShopsData = [], isLoading: shopsLoading } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops"],
  });
  const rawShops = allShopsData.filter(s => s.category_id === id);

  const shopIds = useMemo(() => new Set(rawShops.map(s => s.id)), [rawShops]);

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<(Product & { shop?: Shop })[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
  });

  const categoryProducts = useMemo(() => {
    return allProducts.filter(p => p.shop_id && shopIds.has(p.shop_id) && p.is_active);
  }, [allProducts, shopIds]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return categoryProducts;
    return categoryProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.sub_category || "").toLowerCase().includes(q)
    );
  }, [categoryProducts, productSearch]);

  const sortShops = (arr: typeof rawShops) => {
    if (sortAZ === "az") return [...arr].sort((a, b) => a.name.localeCompare(b.name));
    if (sortAZ === "za") return [...arr].sort((a, b) => b.name.localeCompare(a.name));
    return arr;
  };
  const shops = sortShops(rawShops);
  const premiumShops = shops.filter(s => s.is_premium);
  const regularShops = shops.filter(s => !s.is_premium);

  const hasBanner = !!(categoryData as any)?.banner;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/categories")} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Categories
        </Button>

        {hasBanner ? (
          <div className="rounded-3xl mb-6 text-white relative overflow-hidden h-40 sm:h-52 shadow-xl">
            <img src={(categoryData as any).banner} alt={categoryData?.name} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8">
              <p className="text-white/70 text-sm mb-1">Category</p>
              <h1 className="text-3xl font-bold mb-1">{categoryData?.name || "Category"}</h1>
              <p className="text-white/80 text-sm">{rawShops.length} shops · {categoryProducts.length} products</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl p-8 mb-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-white/70 text-sm mb-1">Category</p>
              <h1 className="text-3xl font-bold mb-2">{categoryData?.name || "Category"}</h1>
              <p className="text-white/80">{rawShops.length} shops · {categoryProducts.length} products</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setActiveTab("shops")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === "shops" ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-md" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400"}`}
            data-testid="tab-shops"
          >
            <Store className="w-4 h-4" /> Shops
            {rawShops.length > 0 && <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "shops" ? "bg-white/25 text-white" : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"}`}>{rawShops.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === "products" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}
            data-testid="tab-products"
          >
            <ShoppingBag className="w-4 h-4" /> Products & Services
            {categoryProducts.length > 0 && <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "products" ? "bg-white/25 text-white" : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"}`}>{categoryProducts.length}</span>}
          </button>
        </div>

        {/* Shops Tab */}
        {activeTab === "shops" && (
          <>
            {rawShops.length > 0 && (
              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm text-muted-foreground font-medium">Sort:</span>
                <button onClick={() => setSortAZ(sortAZ === "az" ? "none" : "az")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sortAZ === "az" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`} data-testid="button-sort-az">
                  <ArrowUpAZ className="w-3.5 h-3.5" /> A → Z
                </button>
                <button onClick={() => setSortAZ(sortAZ === "za" ? "none" : "za")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sortAZ === "za" ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400"}`} data-testid="button-sort-za">
                  <ArrowDownAZ className="w-3.5 h-3.5" /> Z → A
                </button>
              </div>
            )}

            {shopsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
              </div>
            ) : shops.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🏪</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No shops yet</h3>
                <p className="text-muted-foreground">Shops are being added to this category soon.</p>
              </div>
            ) : (
              <>
                {premiumShops.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Premium Shops</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {premiumShops.map(shop => <ShopListCard key={shop.id} shop={shop} categoryId={id} />)}
                    </div>
                  </div>
                )}
                {regularShops.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Shops</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {regularShops.map(shop => <ShopListCard key={shop.id} shop={shop} categoryId={id} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div>
            {/* Search bar */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder={`Search products in ${categoryData?.name || "this category"}...`}
                className="pl-9 pr-9 rounded-xl h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                data-testid="input-product-search"
              />
              {productSearch && (
                <button onClick={() => setProductSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-product-search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">{productSearch ? "🔍" : "🛍️"}</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {productSearch ? `No results for "${productSearch}"` : "No products yet"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {productSearch ? "Try a different keyword" : "Products from shops in this category will appear here."}
                </p>
              </div>
            ) : (
              <>
                {productSearch && (
                  <p className="text-xs text-muted-foreground mb-3">{filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} for "<span className="text-blue-500 font-semibold">{productSearch}</span>"</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map(prod => (
                    <Card
                      key={prod.id}
                      className="rounded-2xl border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                      onClick={() => {
                        if (prod.shop_id) {
                          localStorage.setItem("lastCategoryId", id || "");
                          navigate(`/shop/${prod.shop_id}`);
                        }
                      }}
                      data-testid={`card-product-${prod.id}`}
                    >
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name} className="w-full h-28 object-cover" onError={e => { (e.target as any).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-28 bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center text-3xl">
                          🛍️
                        </div>
                      )}
                      <CardContent className="p-3">
                        <p className="font-semibold text-xs text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">{prod.name}</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{prod.price}</p>
                        {prod.sub_category && (
                          <Badge className="mt-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-0 text-[9px] px-1.5">{prod.sub_category}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopListCard({ shop, categoryId }: { shop: Shop & { category?: Category }; categoryId?: string }) {
  const [, navigate] = useLocation();
  return (
    <Card
      className="rounded-2xl border-0 shadow-md cursor-pointer hover-elevate overflow-visible"
      onClick={() => {
        if (categoryId) localStorage.setItem("lastCategoryId", categoryId);
        navigate(`/shop/${shop.id}`);
      }}
      data-testid={`card-shop-${shop.id}`}
    >
      <div className="h-32 rounded-t-2xl relative overflow-hidden bg-gradient-to-br from-blue-500/30 to-violet-600/30">
        {shop.banner_image ? (
          <img src={shop.banner_image} alt={shop.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 opacity-50" />
        )}
        {shop.is_premium && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-400 text-amber-900 text-xs gap-1 border-0">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {shop.logo && (
              <img 
                src={shop.logo} 
                alt={`${shop.name} logo`} 
                className="w-10 h-10 rounded-lg object-cover border border-gray-100 dark:border-gray-800 shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{shop.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{shop.description}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        </div>
        {shop.address && (
          <div className="flex items-center gap-1 mt-3">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{shop.address}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
