import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, ChevronRight, ChevronLeft, Sparkles, Lock, CheckCircle2, Gift, Users } from "lucide-react";

const SLOT_COLORS = [
  "from-blue-400 to-blue-600", "from-violet-400 to-purple-600", "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-500", "from-emerald-400 to-teal-600", "from-cyan-400 to-sky-600",
  "from-red-400 to-rose-600", "from-indigo-400 to-indigo-600", "from-fuchsia-400 to-fuchsia-600",
  "from-lime-400 to-green-500",
];

function getSlotColor(userName: string) {
  let h = 0;
  for (let i = 0; i < userName.length; i++) h = (h * 31 + userName.charCodeAt(i)) % SLOT_COLORS.length;
  return SLOT_COLORS[h];
}

function ContestBannerSlider({ contests }: { contests: any[] }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<any>(null);

  const open = contests.filter(c => c.status === "open");
  useEffect(() => {
    if (open.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % open.length), 3500);
    return () => clearInterval(timerRef.current);
  }, [open.length]);

  if (!open.length) return null;
  const c = open[idx];
  const filledSlots = c.slots?.length || 0;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: 180 }}>
      {open.map((contest, i) => (
        <div
          key={contest.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, pointerEvents: i === idx ? "auto" : "none" }}
        >
          {contest.banner_image ? (
            <img src={contest.banner_image} className="w-full h-full object-cover" alt={contest.title} />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${["#4f46e5","#7c3aed"][i % 2]} 0%, ${["#ec4899","#f59e0b"][i % 2]} 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full">🏆 Contest Open</span>
              {contest.shop && <span className="text-xs text-white/70">{contest.shop.name}</span>}
            </div>
            <h3 className="text-lg font-black text-white leading-tight">{contest.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-white/70">{filledSlots}/{contest.total_slots} slots filled</span>
              {contest.prize_description && (
                <span className="text-xs text-amber-300 font-semibold">🎁 {contest.prize_description}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {open.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + open.length) % open.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setIdx(i => (i + 1) % open.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 right-4 flex gap-1">
            {open.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SlotGrid({ contest, userId, onJoin, joining }: { contest: any; userId?: string; onJoin: (n: number) => void; joining: boolean }) {
  const slots: Record<number, any> = {};
  for (const s of (contest.slots || [])) slots[s.slot_number] = s;
  const mySlot = userId ? Object.values(slots).find((s: any) => s.user_id === userId) : null;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${contest.total_slots <= 20 ? 5 : 6}, 1fr)` }}>
      {Array.from({ length: contest.total_slots }, (_, i) => i + 1).map(num => {
        const slot = slots[num];
        const isMine = mySlot?.slot_number === num;
        const isFilled = !!slot;
        const isEmpty = !isFilled && contest.status === "open";
        const isWinner = contest.winner_slot_number === num;

        return (
          <button
            key={num}
            data-testid={`slot-${num}`}
            disabled={isFilled || !isEmpty || joining}
            onClick={() => isEmpty && !mySlot && onJoin(num)}
            className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all
              ${isWinner ? "ring-4 ring-amber-400 ring-offset-2 scale-110 z-10" : ""}
              ${isMine ? "ring-2 ring-emerald-400 ring-offset-1" : ""}
              ${isEmpty && !mySlot ? "cursor-pointer hover:scale-105 active:scale-95 bg-gray-100 dark:bg-gray-800 hover:bg-gradient-to-br hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400" : ""}
              ${isFilled && !isMine ? "cursor-default" : ""}
              ${isMine ? "cursor-default" : ""}
              ${contest.status !== "open" && !isFilled ? "opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700" : ""}
            `}
          >
            {isFilled ? (
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${getSlotColor(slot.user_name)} flex flex-col items-center justify-center`}>
                {isWinner && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">🏆</span>}
                <span className="text-white font-black text-sm">{slot.user_name.charAt(0).toUpperCase()}</span>
                <span className="text-white/80 text-[9px] font-semibold leading-none mt-0.5 max-w-full truncate px-0.5">
                  {isMine ? "YOU" : slot.user_name.split(" ")[0].substring(0, 4)}
                </span>
              </div>
            ) : (
              <>
                <span className="text-gray-400 dark:text-gray-500 text-[11px] font-bold">{num}</span>
                {isEmpty && !mySlot && (
                  <span className="text-[8px] text-violet-400 font-semibold mt-0.5">Join</span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ContestsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  const { data: contests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/contests"],
  });

  const selectedContest = selectedId
    ? (contests.find((c: any) => c.id === selectedId) || null)
    : (contests.find((c: any) => c.status === "open") || contests[0] || null);

  const joinMutation = useMutation({
    mutationFn: ({ id, slot_number }: { id: string; slot_number: number }) =>
      apiRequest("POST", `/api/contests/${id}/join`, { slot_number }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({ title: "🎉 You joined the contest!", description: "Good luck!" });
    },
    onError: (e: any) => toast({ title: e.message || "Could not join", variant: "destructive" }),
  });

  function handleJoin(slotNumber: number) {
    if (!user) { setPendingSlot(slotNumber); setShowLoginPrompt(true); return; }
    if (!selectedContest) return;
    joinMutation.mutate({ id: selectedContest.id, slot_number: slotNumber });
  }

  const openContests = contests.filter((c: any) => c.status === "open");
  const completedContests = contests.filter((c: any) => c.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Contests</h1>
            <p className="text-xs text-muted-foreground">Pick a slot • Win exciting prizes from local shops</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          </div>
        ) : contests.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No Contests Yet</h2>
            <p className="text-muted-foreground text-sm">Check back soon — local shops are preparing exciting contests for you!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Banner carousel */}
            <ContestBannerSlider contests={contests} />

            {/* Contest tabs */}
            {contests.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {contests.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    data-testid={`tab-contest-${c.id}`}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      (selectedContest?.id === c.id)
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-transparent shadow-md shadow-amber-500/25"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-300"
                    }`}
                  >
                    {c.status === "completed" ? "✅" : c.status === "open" ? "🔥" : "⏸️"} {c.title}
                  </button>
                ))}
              </div>
            )}

            {/* Selected contest detail */}
            {selectedContest && (
              <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 rounded-3xl overflow-hidden">
                <CardContent className="p-5">
                  {/* Contest header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] font-bold border-0 ${
                          selectedContest.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          selectedContest.status === "completed" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {selectedContest.status === "open" ? "🔥 Open" : selectedContest.status === "completed" ? "🏆 Completed" : "⏸️ Closed"}
                        </Badge>
                        {selectedContest.shop && (
                          <span className="text-xs text-muted-foreground font-medium">{selectedContest.shop.name}</span>
                        )}
                      </div>
                      <h2 className="text-lg font-black text-gray-900 dark:text-white">{selectedContest.title}</h2>
                      {selectedContest.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{selectedContest.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 ml-3 text-right">
                      <div className="text-2xl font-black text-gray-900 dark:text-white">{selectedContest.slots?.length || 0}</div>
                      <div className="text-[10px] text-muted-foreground font-semibold">/{selectedContest.total_slots} joined</div>
                    </div>
                  </div>

                  {/* Prize */}
                  {selectedContest.prize_description && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2 mb-4">
                      <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{selectedContest.prize_description}</span>
                    </div>
                  )}

                  {/* Winner banner */}
                  {selectedContest.status === "completed" && selectedContest.winner_user_name && (
                    <div
                      className="rounded-2xl p-4 mb-4 text-center relative overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)" }}
                    >
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                      <div className="text-3xl mb-1">🏆</div>
                      <div className="text-amber-200/70 text-xs font-bold uppercase tracking-wider mb-1">Winner</div>
                      <div className="text-white font-black text-xl">{selectedContest.winner_user_name}</div>
                      <div className="text-amber-300/80 text-xs mt-0.5">Slot #{selectedContest.winner_slot_number}</div>
                      <div className="flex justify-center gap-2 mt-2">
                        {["✨", "🎉", "⭐", "🎊"].map((e, i) => (
                          <span key={i} className="text-lg" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Slot instruction */}
                  {selectedContest.status === "open" && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-muted-foreground font-semibold px-2">
                        {user
                          ? (selectedContest.slots?.find((s: any) => s.user_id === user.id)
                            ? "✅ You're in! Your slot is highlighted"
                            : "👇 Tap any empty slot to join")
                          : "Sign in to join the contest"
                        }
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                  )}

                  {/* Slot grid */}
                  <SlotGrid
                    contest={selectedContest}
                    userId={user?.id}
                    onJoin={handleJoin}
                    joining={joinMutation.isPending}
                  />

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selectedContest.slots?.length || 0} joined</span>
                      <span>{selectedContest.total_slots - (selectedContest.slots?.length || 0)} slots left</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((selectedContest.slots?.length || 0) / selectedContest.total_slots) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Login prompt */}
                  {showLoginPrompt && !user && (
                    <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-2xl text-center">
                      <Lock className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Sign in to join the contest</p>
                      <Button
                        onClick={() => navigate("/login")}
                        className="bg-gradient-to-r from-violet-500 to-purple-600 border-0 rounded-xl"
                        data-testid="button-contest-login"
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Completed contests */}
            {completedContests.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> Past Winners
                </h3>
                <div className="flex flex-col gap-3">
                  {completedContests.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-amber-300 transition-all"
                      data-testid={`completed-contest-${c.id}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.shop?.name} · Winner: <span className="text-amber-600 font-semibold">{c.winner_user_name || "TBD"}</span></p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
