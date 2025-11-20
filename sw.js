const CACHE_NAME = 'dayflow-v2';
const ASSETS = [
    './',
    './index.html',
    './main.css',
    './main.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    // Clone the response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
            })
            .catch(() => {
                // Return offline page if available
                return caches.match('./index.html');
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');

    let data = {
        title: 'DayFlow Reminder',
        body: 'Time to log your activities! 📝',
        icon: './icon-192.png',
        badge: './icon-192.png'
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || './icon-192.png',
        badge: data.badge || './icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'dayflow-reminder',
        requireInteraction: false,
        actions: [
            {
                action: 'open',
                title: 'Log Activity',
                icon: './icon-192.png'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ],
        data: {
            url: data.url || './index.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if app is already open
                for (let client of clientList) {
                    if (client.url === event.notification.data.url && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if not open
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url);
                }
            })
    );
});

// Background sync event (for offline support)
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);
    if (event.tag === 'sync-activities') {
        event.waitUntil(
            // Sync activities when back online
            syncActivities()
        );
    }
});

async function syncActivities() {
    // This can be extended to sync with a backend server
    console.log('[Service Worker] Syncing activities...');
    return Promise.resolve();
}

// Periodic background sync (for scheduled notifications)
self.addEventListener('periodicsync', (event) => {
    console.log('[Service Worker] Periodic sync:', event.tag);
    if (event.tag === 'daily-reminder') {
        event.waitUntil(
            sendDailyReminder()
        );
    }
});

async function sendDailyReminder() {
    const options = {
        body: '✨ Don\'t forget to log your achievements today!',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'daily-reminder',
        requireInteraction: false,
        data: {
            url: './index.html'
        }
    };

    return self.registration.showNotification('DayFlow Daily Reminder', options);
}
