import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function getServiceWorkerUrl() {
  const config = encodeURIComponent(JSON.stringify(firebaseConfig));
  return `/firebase-messaging-sw.js?config=${config}`;
}

function isConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);
}

async function getMessagingClient(): Promise<Messaging | null> {
  if (!isConfigured() || typeof window === 'undefined' || !window.isSecureContext || !(await isSupported())) return null;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export async function requestMessagingToken(): Promise<string | null> {
  if (!isConfigured()) throw new Error('Firebase push is not configured. Check the VITE_FIREBASE_* environment variables.');
  if (typeof window === 'undefined' || !window.isSecureContext) {
    throw new Error('Push notifications require HTTPS or localhost.');
  }
  const messaging = await getMessagingClient();
  if (!messaging || !('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('This browser does not support Firebase push notifications.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked for this site. Allow them in the browser site settings, then try again.'
      : 'Notification permission was not granted.');
  }
  const registration = await navigator.serviceWorker.register(getServiceWorkerUrl());
  await navigator.serviceWorker.ready;
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

export async function getExistingMessagingToken(): Promise<string | null> {
  const messaging = await getMessagingClient();
  if (!messaging || Notification.permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.register(getServiceWorkerUrl());
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

export async function listenForForegroundMessages(onNotification: (payload: MessagePayload) => void) {
  const messaging = await getMessagingClient();
  if (!messaging || Notification.permission !== 'granted') return () => {};
  return onMessage(messaging, onNotification);
}

export function isMessagingConfigured() {
  return isConfigured();
}
