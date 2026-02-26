import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import type { Category, Shop } from "@shared/schema";

const CATEGORY_GRADIENTS = [
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

const CATEGORY_ICONS = ["🍔", "👗", "📱", "💄", "✈️", "🥦", "🏋️", "🎬", "🛋️", "📚", "🎂", "🍛", "🎓", "⚽"];

export default function AllShopsPage() {
  const [, navigate] = useLocation();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  const { data: categories = [], isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allShops = [], isLoading: loadingShops } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops"],
  });

  const shopsInCat = selectedCat
    ? allShops.filter(s => s.category_id === selectedCat.id)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Back button */}
        <button
          onClick={() => {
            if (selectedCat) {
              setSelectedCat(null);
            } else {
              navigate("/home");
            }
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-5 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedCat ? "All Categories" : "Back"}
        </button>

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedCat ? selectedCat.name : "Shop by Category"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {selectedCat
              ? `${shopsInCat.length} shop${shopsInCat.length !== 1 ? "s" : ""} available`
              : `${categories.length} categories`}
          </p>
        </div>

        {/* CATEGORIES VIEW */}
        {!selectedCat && (
          loadingCats ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-7">
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className="flex flex-col items-center gap-2.5 group focus:outline-none"
                  data-testid={`button-category-${cat.id}`}
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length]} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-active:scale-95 overflow-hidden`}>
                    {cat.image && cat.image.startsWith("http") ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : cat.image && cat.image.startsWith("/") ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="text-3xl">{CATEGORY_ICONS[idx % CATEGORY_ICONS.length]}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[80px]">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {/* SHOPS VIEW */}
        {selectedCat && (
          loadingShops ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : shopsInCat.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏪</div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">No shops yet</p>
              <p className="text-sm text-muted-foreground mt-1">No shops found in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-7">
              {shopsInCat.map((shop, idx) => (
                <button
                  key={shop.id}
                  onClick={() => navigate(`/shop/${shop.id}`)}
                  className="flex flex-col items-center gap-2.5 group focus:outline-none"
                  data-testid={`button-shop-${shop.id}`}
                >
                  <div className={`w-20 h-20 rounded-full overflow-hidden shadow-lg border-2 border-white dark:border-gray-800 bg-gradient-to-br ${CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length]} flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95`}>
                    {shop.logo ? (
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">{shop.name[0]}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[80px]">
                    {shop.name}
                  </span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
