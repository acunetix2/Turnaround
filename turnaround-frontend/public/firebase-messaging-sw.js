/* Firebase Messaging background worker. Config is passed by the app during registration. */
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

const config = JSON.parse(new URLSearchParams(self.location.search).get('config') || '{}');
firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'Turnaround notification';
  const options = {
    body: notification.body || '',
    icon: '/favicon.svg',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/notifications';
  event.waitUntil(clients.openWindow(new URL(link, self.location.origin).href));
});
