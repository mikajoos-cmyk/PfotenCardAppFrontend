// sw.js
// Service Worker für PfotenCard Push-Benachrichtigungen

self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');

    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.title || 'PfotenCard';
            const options = {
                body: data.body || '',
                icon: data.icon || '/paw.png',
                badge: '/paw_icon.png', // Kleines Icon in der Statusleiste (Android)
                data: {
                    url: data.url || '/'
                },
                vibrate: [100, 50, 100],
                actions: [
                    { action: 'open', title: 'Anzeigen' }
                ]
            };

            event.waitUntil(
                self.registration.showNotification(title, options)
            );
        } catch (e) {
            console.error('[Service Worker] Error parsing push data', e);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const targetUrl = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // 1. Prüfen, ob bereits ein Fenster offen ist, das die URL (oder den Ursprung) zeigt
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // Wir fokussieren das erste Fenster der App
                if ('focus' in client) {
                    return client.focus();
                    // Optional: Navigiere zu targetUrl falls nötig
                    // return client.navigate(targetUrl).then(c => c.focus());
                }
            }

            // 2. Falls kein Fenster offen ist, öffne ein neues
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
