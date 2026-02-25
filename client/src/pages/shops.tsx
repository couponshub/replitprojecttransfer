import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, MapPin, Search, ArrowLeft, SlidersHorizontal } from "lucide-react";
import type { Category, Shop } from "@shared/schema";

export default function AllShopsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const { data: shops = [], isLoading } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops"],
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const filtered = shops.filter(s => {
    const matchCat = selectedCat === "all" || s.category_id === selectedCat;
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || (s.description || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/home")} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Shops</h1>
          <p className="text-muted-foreground mt-1">{shops.length} shops available</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shops..."
            className="pl-10 rounded-2xl h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            data-testid="input-shop-search"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          <button
            onClick={() => setSelectedCat("all")}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              selectedCat === "all"
                ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-transparent shadow-md"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
            data-testid="filter-all"
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedCat === cat.id
                  ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-transparent shadow-md"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}
              data-testid={`filter-cat-${cat.id}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="h-28 w-full" />
                <div className="p-4 bg-white dark:bg-gray-900">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No shops found</p>
            <p className="text-muted-foreground mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(shop => (
              <Card
                key={shop.id}
                className="rounded-2xl border-0 shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
                onClick={() => navigate(`/shop/${shop.id}`)}
                data-testid={`card-shop-${shop.id}`}
              >
                <div className="h-28 bg-gradient-to-br from-blue-500/20 to-violet-500/20 relative overflow-hidden">
                  {shop.banner_image ? (
                    <img src={shop.banner_image} alt={shop.name} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">{shop.name[0]}</span>
                    </div>
                  )}
                  {shop.is_premium && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-400 text-amber-900 border-0 text-[10px] px-1.5 py-0 gap-0.5">
                        <Crown className="w-2.5 h-2.5" /> Premium
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  {shop.logo && (
                    <img src={shop.logo} alt="logo" className="w-8 h-8 rounded-xl object-cover -mt-6 mb-1.5 border-2 border-white shadow" onError={e => { (e.target as any).style.display = "none"; }} />
                  )}
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{shop.name}</h3>
                  {shop.category && (
                    <span className="text-xs text-muted-foreground">{shop.category.name}</span>
                  )}
                  {shop.address && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{shop.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
