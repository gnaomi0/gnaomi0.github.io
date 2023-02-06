let url;

self.addEventListener('push', function (e) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
      console.log("Notifications aren't supported or permission not granted!");
      return;
  }

  if (e.data) {
      var msg = e.data.json();
      e.waitUntil(self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: msg.icon,
        actions: msg.actions,
        tag: msg.tag
      }));

      return url = msg.data.url;
  }
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  return clients.openWindow(url);
});
