import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search } from "lucide-react";
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

export default function AllShopsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  const { data: categories = [], isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allShops = [], isLoading: loadingShops } = useQuery<(Shop & { category?: Category })[]>({
    queryKey: ["/api/shops"],
  });

  const filtered = allShops.filter(s => {
    const matchesCat = selectedCatId === "all" || s.category_id === selectedCatId;
    const matchesSearch = search.trim() === "" || s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-5 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Shops</h1>
          <p className="text-muted-foreground mt-1 text-sm">{filtered.length} shops in Eluru</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search shops..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="input-shop-search"
          />
        </div>

        {/* Category filter chips */}
        {!loadingCats && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-5">
            <button
              onClick={() => setSelectedCatId("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCatId === "all" ? "bg-blue-600 text-white shadow" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}
              data-testid="chip-category-all"
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCatId === cat.id ? "bg-blue-600 text-white shadow" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}
                data-testid={`chip-category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Shops grid — logo icons */}
        {loadingShops ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-7">
            {Array(16).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏪</div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No shops found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-7" data-testid="grid-all-shops">
            {filtered.map((shop, idx) => (
              <ShopLogoIcon
                key={shop.id}
                shop={shop}
                gradientIdx={idx}
                onPress={() => navigate(`/shop/${shop.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopLogoIcon({
  shop,
  gradientIdx,
  onPress,
}: {
  shop: Shop & { category?: Category };
  gradientIdx: number;
  onPress: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const grad = CATEGORY_GRADIENTS[gradientIdx % CATEGORY_GRADIENTS.length];
  const showLogo = shop.logo && !imgErr;
  const shortName = shop.name
    .replace(/ Eluru$/i, "")
    .replace(/ Restaurant$/i, "")
    .replace(/ Studio$/i, "");
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex flex-col items-center gap-2 group focus:outline-none"
      data-testid={`button-shop-${shop.id}`}
    >
      <div className={`w-16 h-16 rounded-full overflow-hidden shadow-md border-2 border-white dark:border-gray-800 bg-gradient-to-br ${grad} flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95`}>
        {showLogo ? (
          <img
            src={shop.logo!}
            alt={shop.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-2xl font-bold text-white">{shop.name[0]}</span>
        )}
      </div>
      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight line-clamp-2 max-w-[68px]">
        {shortName}
      </span>
    </button>
  );
}
