import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy, Lock, Users, ChevronLeft, ChevronRight, Store, Gift, Tag, Sparkles, Download, CheckCircle2, PartyPopper
} from "lucide-react";

const SLOT_COLORS = [
  "from-blue-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-pink-400 to-rose-600",
  "from-emerald-400 to-teal-600",
  "from-cyan-400 to-sky-600",
  "from-red-400 to-rose-600",
  "from-indigo-400 to-indigo-600",
  "from-fuchsia-400 to-fuchsia-600",
  "from-lime-400 to-green-500",
  "from-orange-400 to-red-500",
];

function getSlotColor(userName: string) {
  let h = 0;
  for (let i = 0; i < userName.length; i++) h = (h * 31 + userName.charCodeAt(i)) % SLOT_COLORS.length;
  return SLOT_COLORS[h];
}

function ShopContestCard({ contest, onJoin }: { contest: any; onJoin: () => void }) {
  const filled = contest.slots?.length || 0;
  const pct = Math.min(100, (filled / contest.total_slots) * 100);
  return (
    <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-3xl overflow-hidden" data-testid={`shop-contest-card-${contest.id}`}>
      {contest.banner_image && (
        <div className="h-28 overflow-hidden relative">
          <img src={contest.banner_image} alt={contest.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {contest.shop?.logo ? (
            <img src={contest.shop.logo} alt={contest.shop.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-md shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate" data-testid={`text-shop-name-${contest.id}`}>{contest.shop?.name}</p>
            <h3 className="font-black text-gray-900 dark:text-white text-sm leading-tight" data-testid={`text-contest-title-${contest.id}`}>{contest.title}</h3>
          </div>
          <Badge className="shrink-0 text-[10px] font-bold border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Open
          </Badge>
        </div>

        {contest.attached_coupon && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 truncate">
              Prize: {contest.attached_coupon.code} — {contest.attached_coupon.discount_type === "percentage" ? `${contest.attached_coupon.discount_value}% off` : contest.attached_coupon.discount_type === "flat" ? `₹${contest.attached_coupon.discount_value} off` : contest.attached_coupon.discount_type || "Special Coupon"}
            </p>
          </div>
        )}

        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{filled} joined</span>
            <span>{contest.total_slots - filled} slots left</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <Button
          className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white font-bold shadow-md shadow-amber-500/25 h-10"
          onClick={onJoin}
          data-testid={`button-join-contest-${contest.id}`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Join Contest
        </Button>
      </CardContent>
    </Card>
  );
}

function ContestDetailView({ contest, userId, onBack }: { contest: any; userId?: string; onBack: () => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [slotNavIndex, setSlotNavIndex] = useState(0);

  const { data: freshContest } = useQuery<any>({
    queryKey: [`/api/contests/${contest.id}`],
    refetchInterval: 5000,
    initialData: contest,
  });

  const { data: userCoupons = [] } = useQuery<any[]>({
    queryKey: ["/api/user/coupons"],
    enabled: !!userId,
  });

  const claimMutation = useMutation({
    mutationFn: (ucId: string) => apiRequest("POST", `/api/user/coupons/${ucId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/my-downloads"] });
      toast({ title: "Prize claimed!", description: "Check My Coupons to use it." });
    },
    onError: (e: any) => toast({ title: e.message || "Could not claim", variant: "destructive" }),
  });

  const c = freshContest || contest;
  const slots: Record<number, any> = {};
  for (const s of (c.slots || [])) slots[s.slot_number] = s;
  const mySlot = userId ? Object.values(slots).find((s: any) => s.user_id === userId) : null;
  const filled = c.slots?.length || 0;
  const pct = Math.min(100, (filled / c.total_slots) * 100);
  const isWinner = !!userId && c.winner_user_id === userId;
  const myContestCoupon = isWinner ? (userCoupons as any[]).find((uc: any) => uc.contest_id === c.id) : null;

  const joinMutation = useMutation({
    mutationFn: ({ slot_number }: { slot_number: number }) =>
      apiRequest("POST", `/api/contests/${c.id}/join`, { slot_number }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests", c.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({ title: "You joined the contest!", description: "Good luck!" });
    },
    onError: (e: any) => toast({ title: e.message || "Could not join", variant: "destructive" }),
  });

  function handleSlot(num: number) {
    if (!userId) { setShowLoginPrompt(true); return; }
    if (mySlot) return;
    if (slots[num]) return;
    joinMutation.mutate({ slot_number: num });
  }

  const cols = c.total_slots <= 20 ? 5 : 6;
  const slotList = c.slots || [];
  const currentNavSlot = slotList[slotNavIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl" data-testid="button-back-contest">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {c.shop?.logo ? (
            <img src={c.shop.logo} alt={c.shop.name} className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-gray-700 shadow-sm shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{c.shop?.name}</p>
            <h2 className="font-black text-gray-900 dark:text-white text-base leading-tight truncate">{c.title}</h2>
          </div>
        </div>
        <Badge className={`shrink-0 text-[10px] font-bold border-0 ${
          c.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : c.status === "completed" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-gray-100 text-gray-600"
        }`}>
          {c.status === "open" ? "Open" : c.status === "completed" ? "Completed" : "Closed"}
        </Badge>
      </div>

      {c.description && (
        <p className="text-sm text-muted-foreground px-1">{c.description}</p>
      )}

      {/* Slot instruction */}
      {c.status === "open" && (
        <div className="text-center text-xs font-semibold text-muted-foreground">
          {mySlot
            ? `You are in Slot #${mySlot.slot_number}`
            : userId
            ? "Tap any empty slot to join"
            : "Sign in to join"
          }
        </div>
      )}

      {/* Slot grid */}
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 rounded-3xl overflow-hidden">
        <CardContent className="p-4">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: c.total_slots }, (_, i) => i + 1).map(num => {
              const slot = slots[num];
              const isMine = mySlot?.slot_number === num;
              const isFilled = !!slot;
              const isEmpty = !isFilled && c.status === "open";
              const isWinner = c.winner_slot_number === num && c.status === "completed";
              const canClick = isEmpty && !mySlot && c.status === "open";

              return (
                <button
                  key={num}
                  data-testid={`slot-${num}`}
                  disabled={!canClick || joinMutation.isPending}
                  onClick={() => handleSlot(num)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all select-none
                    ${isWinner ? "ring-4 ring-amber-400 ring-offset-2 scale-110 z-10 shadow-lg shadow-amber-500/40" : ""}
                    ${isMine && !isWinner ? "ring-2 ring-emerald-500 ring-offset-1" : ""}
                    ${canClick ? "cursor-pointer hover:scale-105 active:scale-95 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10" : ""}
                    ${isFilled ? "" : !canClick ? "opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700" : ""}
                  `}
                >
                  {isFilled ? (
                    <div className={`absolute inset-0 rounded-xl ${isWinner ? "bg-gradient-to-br from-amber-400 to-yellow-500" : `bg-gradient-to-br ${getSlotColor(slot.user_name)}`} flex flex-col items-center justify-center`}>
                      {isWinner && (
                        <Trophy className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-amber-900" />
                      )}
                      <span className="text-white font-black text-sm">
                        {slot.user_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-white/90 text-[9px] font-semibold leading-none mt-0.5 max-w-full truncate px-0.5">
                        {isMine ? "YOU" : slot.user_name.split(" ")[0].substring(0, 5)}
                      </span>
                    </div>
                  ) : (
                    <span className={`text-[11px] font-bold ${canClick ? "text-gray-400 dark:text-gray-500" : "text-gray-300 dark:text-gray-600"}`}>{num}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{filled} / {c.total_slots} joined</span>
              <span>{c.total_slots - filled} slots left</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot navigator — participants carousel */}
      {slotList.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <button
            onClick={() => setSlotNavIndex(i => (i - 1 + slotList.length) % slotList.length)}
            className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 hover:border-amber-400 transition-all shadow-sm"
            data-testid="button-slot-nav-prev"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2.5 flex items-center gap-3">
            {currentNavSlot ? (
              <>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                  c.winner_slot_number === currentNavSlot.slot_number
                    ? "from-amber-400 to-yellow-500"
                    : getSlotColor(currentNavSlot.user_name)
                } flex items-center justify-center text-white font-black text-sm shrink-0`}>
                  {c.winner_slot_number === currentNavSlot.slot_number
                    ? <Trophy className="w-4 h-4 text-amber-900" />
                    : currentNavSlot.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                    {c.winner_slot_number === currentNavSlot.slot_number ? "Winner — " : ""}{currentNavSlot.user_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Slot #{currentNavSlot.slot_number}</p>
                </div>
                {c.winner_slot_number === currentNavSlot.slot_number && (
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0 ml-auto" />
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No participants yet</p>
            )}
          </div>
          <button
            onClick={() => setSlotNavIndex(i => (i + 1) % slotList.length)}
            className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 hover:border-amber-400 transition-all shadow-sm"
            data-testid="button-slot-nav-next"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Winner banner */}
      {c.status === "completed" && c.winner_user_name && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-500 p-4 flex flex-col gap-3 shadow-lg shadow-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-900/20 flex items-center justify-center shrink-0">
              <PartyPopper className="w-6 h-6 text-amber-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber-900/70 font-bold uppercase tracking-widest">Contest Winner</p>
              <p className="text-xl font-black text-amber-900 leading-tight truncate" data-testid="text-winner-name">{c.winner_user_name}</p>
              <p className="text-xs text-amber-900/70 font-semibold">Slot #{c.winner_slot_number}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-900/20 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-900" />
            </div>
          </div>
          {isWinner && (
            <div className="bg-amber-900/10 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-sm font-black text-amber-900">Congratulations! You won this contest!</p>
            </div>
          )}
        </div>
      )}

      {/* Prize Coupon */}
      {(c.attached_coupon || c.prize_description) && (
        <div className={`rounded-3xl border-2 overflow-hidden transition-all ${
          c.status === "completed" && c.winner_user_name
            ? "border-amber-400 shadow-lg shadow-amber-500/20"
            : "border-dashed border-gray-300 dark:border-gray-700"
        }`}>
          <div className={`px-4 py-3 flex items-center gap-2 ${
            c.status === "completed" && c.winner_user_name
              ? "bg-gradient-to-r from-amber-400 to-yellow-500"
              : "bg-gray-100 dark:bg-gray-800"
          }`}>
            {c.status === "completed" && c.winner_user_name ? (
              <>
                <Gift className="w-4 h-4 text-amber-900" />
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Prize Coupon</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prize Coupon — Locked</span>
              </>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-gray-900">
            {c.status === "completed" && c.winner_user_name ? (
              <div className="flex flex-col gap-3">
                {isWinner ? (
                  <>
                    {c.attached_coupon && (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50">
                        <Tag className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-emerald-800 dark:text-emerald-300 text-base">{c.attached_coupon.code}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {c.attached_coupon.type === "percentage"
                              ? `${c.attached_coupon.value}% off`
                              : c.attached_coupon.type === "flat"
                              ? `₹${c.attached_coupon.value} off`
                              : c.attached_coupon.type || "Special Discount"}
                          </p>
                        </div>
                      </div>
                    )}
                    {c.prize_description && (
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 text-center">{c.prize_description}</p>
                    )}
                    {c.attached_coupon && myContestCoupon && (
                      <Button
                        onClick={() => claimMutation.mutate(myContestCoupon.id)}
                        disabled={claimMutation.isPending || !!myContestCoupon.claimed_at}
                        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 border-0 text-white font-bold shadow-md shadow-emerald-500/25"
                        data-testid="button-claim-prize"
                      >
                        {myContestCoupon.claimed_at ? (
                          <><CheckCircle2 className="w-4 h-4 mr-2" /> Coupon Claimed</>
                        ) : claimMutation.isPending ? (
                          "Claiming..."
                        ) : (
                          <><Download className="w-4 h-4 mr-2" /> Claim Your Prize Coupon</>
                        )}
                      </Button>
                    )}
                    {c.attached_coupon && !myContestCoupon && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-center">
                        <p className="text-xs text-amber-700 dark:text-amber-400">Your prize coupon is being prepared...</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Prize visible to winner only</p>
                        {c.attached_coupon && (
                          <p className="text-xs text-muted-foreground">
                            {c.attached_coupon.type === "percentage" ? "??% off" : c.attached_coupon.type === "flat" ? "₹?? off" : "Special"} coupon awarded to {c.winner_user_name}
                          </p>
                        )}
                        {c.prize_description && !c.attached_coupon && (
                          <p className="text-xs text-muted-foreground">{c.prize_description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2 select-none">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 text-center">
                  Revealed after winner is drawn
                </p>
                {c.attached_coupon && (
                  <p className="text-[11px] text-muted-foreground">
                    {c.attached_coupon.type === "percentage"
                      ? `??% off`
                      : c.attached_coupon.type === "flat"
                      ? `₹?? off`
                      : "Special prize"
                    } coupon waiting
                  </p>
                )}
                {c.prize_description && !c.attached_coupon && (
                  <p className="text-xs text-muted-foreground text-center">{c.prize_description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login prompt */}
      {showLoginPrompt && !userId && (
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-2xl text-center">
          <Lock className="w-6 h-6 text-violet-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Sign in to join the contest</p>
          <Button onClick={() => navigate("/login")} className="bg-gradient-to-r from-violet-500 to-purple-600 border-0 rounded-xl" data-testid="button-contest-login">
            Sign In
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ContestsPage() {
  const { user } = useAuth();
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);

  const { data: contests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/contests"],
    refetchInterval: 10000,
  });

  const openContests = contests.filter((c: any) => c.status === "open");
  const completedContests = contests.filter((c: any) => c.status === "completed");

  const selectedContest = selectedContestId
    ? contests.find((c: any) => c.id === selectedContestId) || null
    : null;

  if (selectedContest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
          <ContestDetailView
            contest={selectedContest}
            userId={user?.id}
            onBack={() => setSelectedContestId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Contests</h1>
            <p className="text-xs text-muted-foreground">Pick a slot from your favourite stores</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-52 rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : openContests.length === 0 && completedContests.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No Contests Yet</h2>
            <p className="text-muted-foreground text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Open contests */}
            {openContests.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Active Contests
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {openContests.map((c: any) => (
                    <ShopContestCard
                      key={c.id}
                      contest={c}
                      onJoin={() => setSelectedContestId(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed contests */}
            {completedContests.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Past Winners
                </h2>
                <div className="flex flex-col gap-3">
                  {completedContests.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContestId(c.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-amber-300 transition-all"
                      data-testid={`completed-contest-${c.id}`}
                    >
                      {c.shop?.logo ? (
                        <img src={c.shop.logo} alt={c.shop.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{c.shop?.name}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.title}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          Winner: {c.winner_user_name || "TBD"}
                        </p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0 rotate-180" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
