import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Gift, ArrowLeft, Check, Clock, Tag, Copy, Store, Bookmark, CheckCircle2, Ticket, ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function getCouponLabel(coupon: any) {
  if (!coupon) return "Coupon";
  if (coupon.type === "percentage") return `${coupon.value}% OFF`;
  if (coupon.type === "flat") return `₹${Number(coupon.value).toLocaleString()} OFF`;
  if (coupon.type === "bogo") return "BUY 1 GET 1";
  if (coupon.type === "free_item") return "FREE ITEM";
  if (coupon.type === "combo") return `Combo ₹${Number(coupon.value).toLocaleString()}`;
  if (coupon.type === "min_order") return `${coupon.value}% on Min Order`;
  if (coupon.type === "category_offer") return "Category Offer";
  return coupon.type;
}

export default function MyCouponsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"saved" | "offline">("saved");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savedSearch, setSavedSearch] = useState("");
  const [offlineSearch, setOfflineSearch] = useState("");

  const { data: userCoupons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/coupons"],
    enabled: !!user,
  });

  const { data: offlineDownloads = [], isLoading: offlineLoading } = useQuery<any[]>({
    queryKey: ["/api/user/my-downloads"],
    enabled: !!user,
  });

  const markUsedMutation = useMutation({
    mutationFn: (codeId: string) => apiRequest("POST", `/api/offline-coupon-codes/${codeId}/use`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/my-downloads"] });
      toast({ title: "Marked as used!" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    toast({ title: "Code copied!", description: code });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredUserCoupons = userCoupons.filter((uc: any) => {
    if (!savedSearch.trim()) return true;
    const q = savedSearch.trim().toLowerCase();
    const coupon = uc.coupon;
    const shop = coupon?.shop;
    return (
      (coupon?.description || "").toLowerCase().includes(q) ||
      (coupon?.code || "").toLowerCase().includes(q) ||
      (shop?.name || "").toLowerCase().includes(q)
    );
  });

  const filteredOfflineDownloads = offlineDownloads.filter((item: any) => {
    if (!offlineSearch.trim()) return true;
    const q = offlineSearch.trim().toLowerCase();
    const campaign = item.campaign;
    const shop = campaign?.shop;
    return (
      (campaign?.title || "").toLowerCase().includes(q) ||
      (campaign?.description || "").toLowerCase().includes(q) ||
      (item.code || "").toLowerCase().includes(q) ||
      (shop?.name || "").toLowerCase().includes(q)
    );
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="coupons-login-prompt">
        <div className="text-center space-y-4">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to view your coupons</p>
          <Button onClick={() => navigate("/login")} data-testid="button-login-coupons">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back-coupons">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-my-coupons-title">My Coupons</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "saved" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-muted-foreground"}`}
            data-testid="tab-my-coupons"
          >
            <Bookmark className="w-4 h-4" />
            My Coupons
            {userCoupons.length > 0 && (
              <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{userCoupons.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("offline")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "offline" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-muted-foreground"}`}
            data-testid="tab-offline-coupons"
          >
            <Ticket className="w-4 h-4" />
            Offline Coupons
            {offlineDownloads.length > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{offlineDownloads.length}</span>
            )}
          </button>
        </div>

        {/* Tab: My Coupons */}
        {activeTab === "saved" && (
          <>
            {/* Search Box */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={savedSearch}
                onChange={e => setSavedSearch(e.target.value)}
                placeholder="Search coupons, shops..."
                className="pl-9 pr-9 rounded-xl h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                data-testid="input-saved-coupons-search"
              />
              {savedSearch && (
                <button onClick={() => setSavedSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-saved-search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : userCoupons.length === 0 ? (
              <div className="text-center py-16" data-testid="text-no-coupons">
                <Bookmark className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg font-semibold">No saved coupons</p>
                <p className="text-sm text-muted-foreground mt-1">Save coupons from shops or win contests to see them here</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/")} data-testid="button-browse-shops">
                  Browse Shops
                </Button>
              </div>
            ) : filteredUserCoupons.length === 0 ? (
              <div className="text-center py-8" data-testid="text-no-filtered-coupons">
                <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No coupons match your search</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUserCoupons.map((uc: any) => {
                  const coupon = uc.coupon;
                  const shop = coupon?.shop;
                  const isContest = !!uc.contest_id;
                  const label = getCouponLabel(coupon);
                  return (
                    <div key={uc.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm" data-testid={`card-user-coupon-${uc.id}`}>
                      {coupon?.banner_image && (
                        <img src={coupon.banner_image} alt="Banner" className="w-full h-24 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {shop?.logo && (
                            <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-bold border-0" data-testid={`badge-coupon-label-${uc.id}`}>
                                {label}
                              </Badge>
                              {isContest && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs border-0">
                                  Contest Prize
                                </Badge>
                              )}
                            </div>
                            {shop && (
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1" data-testid={`text-shop-name-${uc.id}`}>
                                <Store className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                {shop.name}
                              </p>
                            )}
                            {coupon?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{coupon.description}</p>
                            )}
                            {coupon?.expiry_date && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Valid till {new Date(coupon.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Coupon Code */}
                        {coupon?.code && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600">
                              <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                              <span className="font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-white" data-testid={`text-coupon-code-${uc.id}`}>{coupon.code}</span>
                            </div>
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="shrink-0 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                              data-testid={`button-copy-code-${uc.id}`}
                            >
                              {copiedCode === coupon.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                            </button>
                          </div>
                        )}

                        {/* Use button */}
                        {shop?.id && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (coupon?.code) copyCode(coupon.code);
                              navigate(`/shop/${shop.id}`);
                            }}
                            className="w-full mt-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 border-0 text-white gap-2 h-9"
                            data-testid={`button-use-coupon-${uc.id}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Use at {shop.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: Offline Coupons */}
        {activeTab === "offline" && (
          <>
            {/* Search Box */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={offlineSearch}
                onChange={e => setOfflineSearch(e.target.value)}
                placeholder="Search coupons, shops..."
                className="pl-9 pr-9 rounded-xl h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                data-testid="input-offline-coupons-search"
              />
              {offlineSearch && (
                <button onClick={() => setOfflineSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-offline-search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {offlineLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : offlineDownloads.length === 0 ? (
              <div className="text-center py-16" data-testid="text-no-offline-coupons">
                <Ticket className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg font-semibold">No offline coupons</p>
                <p className="text-sm text-muted-foreground mt-1">Download store coupons to show at shops and get discounts</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/")} data-testid="button-browse-offline">
                  Browse Shops
                </Button>
              </div>
            ) : filteredOfflineDownloads.length === 0 ? (
              <div className="text-center py-8" data-testid="text-no-filtered-offline">
                <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No coupons match your search</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOfflineDownloads.map((item: any) => {
                  const campaign = item.campaign;
                  const shop = campaign?.shop;
                  const isUsed = !!item.used_at;
                  return (
                    <div key={item.id} className={`rounded-2xl border overflow-hidden shadow-sm ${isUsed ? "border-gray-200 dark:border-gray-700 opacity-60" : "border-emerald-200 dark:border-emerald-800"} bg-white dark:bg-gray-900`} data-testid={`card-offline-coupon-${item.id}`}>
                      {campaign?.banner_image && (
                        <div className="relative">
                          <img src={campaign.banner_image} alt="Banner" className="w-full h-24 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          {isUsed && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Badge className="bg-gray-700 text-white text-xs">Used</Badge>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          {shop?.logo && (
                            <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1" data-testid={`text-offline-title-${item.id}`}>{campaign?.title || "Offline Coupon"}</p>
                            {shop && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Store className="w-3 h-3" />{shop.name}
                              </p>
                            )}
                            {campaign?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{campaign.description}</p>
                            )}
                          </div>
                          {isUsed ? (
                            <Badge className="shrink-0 bg-gray-100 text-gray-500 dark:bg-gray-800 border-0 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Used
                            </Badge>
                          ) : (
                            <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0">Active</Badge>
                          )}
                        </div>

                        {/* Unique code */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600">
                            <Ticket className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-white" data-testid={`text-offline-code-${item.id}`}>{item.code}</span>
                          </div>
                          <button
                            onClick={() => copyCode(item.code)}
                            className="shrink-0 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                            data-testid={`button-copy-offline-code-${item.id}`}
                          >
                            {copiedCode === item.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                          </button>
                        </div>

                        {!isUsed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markUsedMutation.mutate(item.id)}
                            disabled={markUsedMutation.isPending}
                            className="w-full mt-3 rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 gap-2 h-9"
                            data-testid={`button-mark-used-${item.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark as Used at Shop
                          </Button>
                        )}

                        {item.claimed_at && (
                          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Downloaded {new Date(item.claimed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
