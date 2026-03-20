// public/sw.js

// 1. AUTO-UPDATE: Sobald ein neuer Service Worker da ist, sofort installieren!
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. AUTO-UPDATE: Sofort die Kontrolle über alle offenen App-Fenster übernehmen
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 3. PUSH EMPFANGEN: Nachricht anzeigen & Live-Refresh triggern
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/paw_icon.png',
      badge: data.badge || '/paw_icon.png',
      data: data.data // Hier steckt die URL drin!
    };

    // Benachrichtigung auf dem Gerät anzeigen
    event.waitUntil(self.registration.showNotification(data.title, options));

    // Signal an die geöffnete React-App senden: "Lade deine Daten neu!"
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'REFRESH_DATA',
            message: 'Neue Push-Nachricht erhalten'
          });
        }
      })
    );
  }
});

// 4. KLICK-WEITERLEITUNG: Nutzer klickt auf die Benachrichtigung
self.addEventListener('notificationclick', (event) => {
  // Schließe das Benachrichtigungs-Popup
  event.notification.close();

  // Hole die URL aus den Daten der Benachrichtigung (Fallback auf Startseite)
  const targetUrl = event.notification.data && event.notification.data.url 
                    ? event.notification.data.url 
                    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Wenn die App schon irgendwo offen ist -> Fokusieren und zur URL navigieren
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // Wenn die App komplett geschlossen ist -> Neues Fenster mit der URL öffnen
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
