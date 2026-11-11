// client/src/lib/firebase.ts
// Firebase client-side SDK initialisation for Cloud Messaging (FCM).
//
// ⚠️  Fill in your Firebase project config below (or via .env variables).
// The values come from: Firebase Console → Project Settings → Your Apps → Web App Config.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

// ---------------------------------------------------------------------------
// Firebase config – replace placeholder values or set VITE_FIREBASE_* env vars
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAQz24IjokglVy4vd8zJX1df7xSnKnx6k0",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "couponshub-a613d.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "couponshub-a613d",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "couponshub-a613d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1093165632446",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:1093165632446:web:49f7f2aa8261f8a48ec7ef",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "",
};

// ---------------------------------------------------------------------------
// Initialise (guard against hot-reload double-init)
// ---------------------------------------------------------------------------
let app: FirebaseApp;
let messaging: Messaging | null = null;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Messaging is only available in browser environments that support it
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn("[Firebase] Messaging not supported in this browser:", err);
  }
}

// ---------------------------------------------------------------------------
// Request notification permission and return the FCM registration token.
// Call this after the user grants notification permission.
// `vapidKey` comes from: Firebase Console → Project Settings → Cloud Messaging → Web Push Certificates
// ---------------------------------------------------------------------------
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[Firebase] Notification permission denied or dismissed.");
      return null;
    }

    if (!messaging || !("serviceWorker" in navigator)) {
      console.warn("[Firebase] Messaging or Service Worker not available, browser notifications enabled.");
      return null;
    }

    let registration: ServiceWorkerRegistration | undefined;
    try {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    } catch (swErr) {
      console.warn("[Firebase] Service Worker register warning:", swErr);
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      ...(vapidKey && vapidKey !== "YOUR_VAPID_KEY" ? { vapidKey } : {}),
      ...(registration ? { serviceWorkerRegistration: registration } : {}),
    });

    return token || null;
  } catch (err) {
    console.error("[Firebase] Failed to get FCM token:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Listen for foreground messages (app is open)
// ---------------------------------------------------------------------------
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export { app, messaging };
