import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, X } from "lucide-react";
import type { Category } from "@shared/schema";

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

export default function CategoriesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const filtered = search.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : categories;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">All Categories</h1>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="pl-9 pr-9 rounded-xl h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              data-testid="input-category-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-category-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {search ? `${filtered.length} of ${categories.length}` : categories.length} categories in Eluru
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              No categories match &ldquo;<span className="text-blue-500">{search}</span>&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-8" data-testid="grid-categories">
            {filtered.map(cat => {
              const origIdx = categories.findIndex(c => c.id === cat.id);
              const gi = origIdx >= 0 ? origIdx : 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/category/${cat.id}`)}
                  className="flex flex-col items-center gap-2.5 group focus:outline-none"
                  data-testid={`button-category-${cat.id}`}
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${CATEGORY_GRADIENTS[gi % CATEGORY_GRADIENTS.length]} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-active:scale-95 overflow-hidden`}>
                    {cat.image && (cat.image.startsWith("http") || cat.image.startsWith("/")) ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="text-3xl">{CATEGORY_ICONS[gi % CATEGORY_ICONS.length]}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[80px]">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
