import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Bell, Check, Gift, Trophy, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  is_read: boolean;
  created_at: string;
};

function getIcon(type: string) {
  if (type === "contest_win") return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (type === "coupon") return <Gift className="w-5 h-5 text-green-500" />;
  return <Info className="w-5 h-5 text-blue-500" />;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="notifications-login-prompt">
        <div className="text-center space-y-4">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to view notifications</p>
          <Button onClick={() => navigate("/login")} data-testid="button-login-notifications">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back-notifications">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-notifications-title">Notifications</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !notifications?.length ? (
          <div className="text-center py-16" data-testid="text-no-notifications">
            <Bell className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">Join contests to get notified about wins!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-4 cursor-pointer transition-all ${n.is_read ? "opacity-70" : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"}`}
                onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id);
                  if (n.type === "contest_win") navigate("/my-coupons");
                }}
                data-testid={`card-notification-${n.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm" data-testid={`text-notification-title-${n.id}`}>{n.title}</h3>
                      {!n.is_read && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-notification-message-${n.id}`}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                      data-testid={`button-mark-read-${n.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
