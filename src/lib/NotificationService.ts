
import { apiClient } from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "DEIN_PUBLIC_KEY_HIER_EINFUEGEN";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeUserToPush(token: string) {
    if (!('serviceWorker' in navigator)) {
        throw new Error("Service Worker not supported");
    }

    const registration = await navigator.serviceWorker.ready;

    if (!registration.pushManager) {
        throw new Error("Push Manager not supported");
    }

    const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    };

    const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);

    // Send subscription to backend
    // Note: We need to use apiClient.post but we need to ensure we pass the correct structure
    // The backend expects: { endpoint: str, keys: { p256dh: str, auth: str } }
    // pushSubscription.toJSON() returns exactly this keys structure inside

    const subscriptionJSON = pushSubscription.toJSON();

    if (!subscriptionJSON.keys || !subscriptionJSON.endpoint) {
        throw new Error("Invalid subscription object");
    }

    await apiClient.post('/api/notifications/subscribe', {
        endpoint: subscriptionJSON.endpoint,
        keys: {
            p256dh: subscriptionJSON.keys.p256dh,
            auth: subscriptionJSON.keys.auth
        }
    }, token);

    return true;
}
