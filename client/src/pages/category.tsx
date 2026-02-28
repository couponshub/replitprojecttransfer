import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ArrowLeft, Crown, MapPin, ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import type { Category, Shop } from "@shared/schema";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [sortAZ, setSortAZ] = useState<"az" | "za" | "none">("none");

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const categoryData = allCategories.find(c => c.id === id);

  const { data: allShopsData = [], isLoading } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops"],
  });

  const rawShops = allShopsData.filter(s => s.category_id === id);

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/home")} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Button>

        {hasBanner ? (
          <div className="rounded-3xl mb-8 text-white relative overflow-hidden h-40 sm:h-52 shadow-xl">
            <img
              src={(categoryData as any).banner}
              alt={categoryData?.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8">
              <p className="text-white/70 text-sm mb-1">Category</p>
              <h1 className="text-3xl font-bold mb-1">{categoryData?.name || "Category"}</h1>
              <p className="text-white/80 text-sm">{rawShops.length} shops available</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-white/70 text-sm mb-1">Category</p>
              <h1 className="text-3xl font-bold mb-2">{categoryData?.name || "Category"}</h1>
              <p className="text-white/80">{rawShops.length} shops available</p>
            </div>
          </div>
        )}

        {rawShops.length > 0 && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-sm text-muted-foreground font-medium">Sort:</span>
            <button
              onClick={() => setSortAZ(sortAZ === "az" ? "none" : "az")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sortAZ === "az" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`}
              data-testid="button-sort-az"
            >
              <ArrowUpAZ className="w-3.5 h-3.5" /> A → Z
            </button>
            <button
              onClick={() => setSortAZ(sortAZ === "za" ? "none" : "za")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sortAZ === "za" ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400"}`}
              data-testid="button-sort-za"
            >
              <ArrowDownAZ className="w-3.5 h-3.5" /> Z → A
            </button>
          </div>
        )}

        {isLoading ? (
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
                  {premiumShops.map(shop => <ShopListCard key={shop.id} shop={shop} />)}
                </div>
              </div>
            )}
            {regularShops.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Shops</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {regularShops.map(shop => <ShopListCard key={shop.id} shop={shop} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShopListCard({ shop }: { shop: Shop & { category?: Category } }) {
  const [, navigate] = useLocation();
  return (
    <Card
      className="rounded-2xl border-0 shadow-md cursor-pointer hover-elevate overflow-visible"
      onClick={() => navigate(`/shop/${shop.id}`)}
      data-testid={`card-shop-${shop.id}`}
    >
      <div className="h-32 rounded-t-2xl relative overflow-hidden bg-gradient-to-br from-blue-500/30 to-violet-600/30">
        {shop.banner_image ? (
          <img src={shop.banner_image} alt={shop.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 opacity-50" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-white drop-shadow-md">{shop.name[0]}</span>
        </div>
        {shop.is_premium && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-400 text-amber-900 text-xs gap-1 border-0">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{shop.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{shop.description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
