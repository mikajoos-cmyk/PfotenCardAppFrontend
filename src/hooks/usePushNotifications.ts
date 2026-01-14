// src/hooks/usePushNotifications.ts
import { useCallback } from 'react';
import { apiClient } from '../lib/api'; // Zentraler API-Service

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const usePushNotifications = () => {
    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = useCallback(async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // 1. Subscription prüfen oder neu anfordern
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey,
                });
            }

            // 2. An Backend senden
            const subscriptionJSON = subscription.toJSON();

            // Token aus localStorage holen (wie in anderen Hooks)
            const token = localStorage.getItem('authToken');

            await apiClient.post('/api/notifications/subscribe', {
                endpoint: subscriptionJSON.endpoint,
                keys: {
                    p256dh: subscriptionJSON.keys?.p256dh,
                    auth: subscriptionJSON.keys?.auth,
                },
            }, token);

            console.log('Push-Subscription erfolgreich gespeichert.');
            return true;
        } catch (error) {
            console.error('Fehler bei der Push-Subscription:', error);
            return false;
        }
    }, []);

    return { subscribeToPush };
};
