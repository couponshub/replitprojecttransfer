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
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "YOUR_API_KEY",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "YOUR_PROJECT_ID",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "YOUR_APP_ID",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-28K8QK4ZN8",
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
  if (!messaging) {
    console.warn("[Firebase] Messaging is not available.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[Firebase] Notification permission denied.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "YOUR_VAPID_KEY",
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
