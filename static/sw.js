const CACHE_NAME = 'calindar-v1';
const urlsToCache = [
    '/',
    '/static/css/style.css',
    '/static/css/dropdown-enhancement.css',
    '/static/js/calendar.js',
    '/static/js/app.js',
    '/static/js/shared-calendar.js',
    '/static/js/reminder-service.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Files cached successfully');
                return self.skipWaiting(); // Activate immediately
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activated');
            return self.clients.claim(); // Take control immediately
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});

// Background sync for reminders
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'reminder-sync') {
        event.waitUntil(
            checkReminders()
        );
    }
});

// Push notifications for reminders
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'Event reminder!',
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Calendar',
                icon: '/static/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/static/icons/icon-192x192.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('🔔 Calindar Reminder', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();

    if (event.action === 'explore') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Function to check reminders in background
async function checkReminders() {
    console.log('Service Worker: Checking reminders in background');
    
    try {
        // This would typically fetch from your API
        // For now, we'll just log that we're checking
        console.log('Service Worker: Background reminder check completed');
    } catch (error) {
        console.error('Service Worker: Error checking reminders:', error);
    }
}