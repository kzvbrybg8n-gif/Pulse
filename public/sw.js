/**
 * Service Worker Pulse — Web Push notifications.
 *
 * Limite iOS : Web Push fonctionne uniquement en mode PWA (Safari 16.4+,
 * application ajoutée à l'écran d'accueil). Sur desktop (Chrome, Firefox,
 * Edge, Safari 17+) cela fonctionne nativement sans installation.
 */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // DevTools envoie du texte brut — on l'utilise comme titre
    data = { title: event.data?.text() ?? "Pulse" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Pulse", {
      body: data.body ?? "",
      icon: "/logo-dark.svg",
      badge: "/logo-dark.svg",
      data: { url: data.url ?? "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const url = event.notification.data?.url ?? "/today";
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            void client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
