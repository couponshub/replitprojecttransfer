import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";
import { useLocation } from "wouter";

interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationListener() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // 1. Request browser notification permission & sync FCM token once authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let mounted = true;
    const registerPush = async () => {
      try {
        const token = await requestFcmToken();
        if (token && mounted) {
          await apiRequest("PATCH", "/api/user/fcm-token", { fcm_token: token }).catch(() => {});
        }
      } catch (e) {
        console.warn("[NotificationListener] Push registration error:", e);
      }
    };

    registerPush();

    // Listen to Firebase foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "Notification";
      const message = payload.notification?.body || payload.data?.message || "";
      toast({
        title,
        description: message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isAuthenticated, user?.id]);

  // 2. Poll for notifications every 4 seconds
  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated && !!user,
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!notifications || !Array.isArray(notifications)) return;

    // On very first fetch, just remember existing IDs so we don't alert old ones
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      knownIdsRef.current = new Set(notifications.map(n => n.id));
      return;
    }

    // Identify new incoming notifications
    const newItems = notifications.filter(n => !knownIdsRef.current.has(n.id) && !n.is_read);

    if (newItems.length > 0) {
      newItems.forEach(n => {
        knownIdsRef.current.add(n.id);

        // Show in-app Toast
        toast({
          title: n.title,
          description: n.message,
        });

        // Trigger vibration on mobile if supported
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate([150, 50, 150]); } catch {}
        }

        // Show native system/browser notification if permission granted
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            const notif = new Notification(n.title, {
              body: n.message,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
            });
            notif.onclick = () => {
              window.focus();
              if (n.type === "order_update") {
                navigate("/my-orders");
              } else {
                navigate("/notifications");
              }
            };
          } catch (err) {
            console.warn("[NotificationListener] Native notification display error:", err);
          }
        }
      });

      // Synchronize orders and badge counts immediately
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } else {
      // Keep knownIds set up to date
      notifications.forEach(n => knownIdsRef.current.add(n.id));
    }
  }, [notifications]);

  return null;
}
