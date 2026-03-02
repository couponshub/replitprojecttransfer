import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Gift, ArrowLeft, Check, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type UserCoupon = {
  id: string;
  user_id: string;
  coupon_id: string;
  contest_id: string | null;
  is_claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  coupon?: any;
  contest?: any;
};

export default function MyCouponsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: userCoupons, isLoading } = useQuery<UserCoupon[]>({
    queryKey: ["/api/user/coupons"],
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/user/coupons/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/coupons"] });
      toast({ title: "Coupon claimed!", description: "You can now use this coupon on your next order." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
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
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back-coupons">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-my-coupons-title">My Coupons</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : !userCoupons?.length ? (
          <div className="text-center py-16" data-testid="text-no-coupons">
            <Gift className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No coupons yet</p>
            <p className="text-sm text-muted-foreground mt-1">Win contests to earn prize coupons!</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/contests")} data-testid="button-browse-contests">
              Browse Contests
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {userCoupons.map((uc) => (
              <Card key={uc.id} className="overflow-hidden" data-testid={`card-user-coupon-${uc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold" data-testid={`text-coupon-title-${uc.id}`}>
                          {uc.coupon?.title || "Prize Coupon"}
                        </h3>
                      </div>
                      {uc.coupon?.description && (
                        <p className="text-sm text-muted-foreground mb-2">{uc.coupon.description}</p>
                      )}
                      {uc.coupon?.code && (
                        <p className="text-xs font-mono bg-muted px-2 py-1 rounded inline-block mb-2" data-testid={`text-coupon-code-${uc.id}`}>
                          Code: {uc.coupon.code}
                        </p>
                      )}
                      {uc.coupon?.discount_type && (
                        <Badge variant="outline" className="text-xs mr-2">
                          {uc.coupon.discount_type === "percentage"
                            ? `${uc.coupon.discount_value}% off`
                            : uc.coupon.discount_type === "flat"
                            ? `₹${uc.coupon.discount_value} off`
                            : uc.coupon.discount_type}
                        </Badge>
                      )}
                      {uc.contest && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Won from: {uc.contest.title}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {uc.is_claimed ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" data-testid={`badge-claimed-${uc.id}`}>
                          <Check className="w-3 h-3 mr-1" /> Claimed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => claimMutation.mutate(uc.id)}
                          disabled={claimMutation.isPending}
                          data-testid={`button-claim-${uc.id}`}
                        >
                          <Gift className="w-4 h-4 mr-1" /> Claim
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(uc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
