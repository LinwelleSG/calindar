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
            checkRemindersInBackground()
        );
    }
});

// Push notifications for reminders
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    
    let notificationData = {
        title: '🔔 Calindar Reminder',
        body: 'You have an upcoming event!',
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/icon-192x192.png'
    };

    if (event.data) {
        try {
            notificationData = { ...notificationData, ...event.data.json() };
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }
    
    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        vibrate: [200, 100, 200],
        tag: 'calindar-reminder',
        requireInteraction: true,
        data: {
            dateOfArrival: Date.now(),
            url: '/'
        },
        actions: [
            {
                action: 'view',
                title: 'View Calendar'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

// Periodic background sync for PWA reminders
self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic background sync:', event.tag);
    
    if (event.tag === 'reminder-check') {
        event.waitUntil(
            checkRemindersInBackground()
        );
    }
});

// Background reminder checking
async function checkRemindersInBackground() {
    console.log('Service Worker: Checking reminders in background...');
    
    try {
        // Get reminders from IndexedDB or localStorage
        const reminders = await getStoredReminders();
        const now = new Date();
        
        for (const reminder of reminders) {
            const reminderTime = new Date(reminder.reminderTime);
            
            if (!reminder.notified && now >= reminderTime) {
                // Trigger notification
                await self.registration.showNotification('🔔 Calindar Reminder', {
                    body: `"${reminder.title}" starts in ${reminder.reminderMinutes} minutes`,
                    icon: '/static/icons/icon-192x192.png',
                    badge: '/static/icons/icon-192x192.png',
                    vibrate: [200, 100, 200],
                    tag: `reminder-${reminder.eventId}`,
                    requireInteraction: true,
                    data: {
                        eventId: reminder.eventId,
                        url: '/'
                    }
                });
                
                // Mark as notified
                reminder.notified = true;
                await updateStoredReminder(reminder);
                
                console.log('Service Worker: Background reminder triggered for:', reminder.title);
            }
        }
    } catch (error) {
        console.error('Service Worker: Error checking background reminders:', error);
    }
}

// Helper functions for reminder storage
async function getStoredReminders() {
    return new Promise((resolve) => {
        const request = indexedDB.open('CalindarDB', 1);
        
        request.onerror = () => resolve([]);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('reminders')) {
                resolve([]);
                return;
            }
            
            const transaction = db.transaction(['reminders'], 'readonly');
            const store = transaction.objectStore('reminders');
            const getAll = store.getAll();
            
            getAll.onsuccess = () => resolve(getAll.result || []);
            getAll.onerror = () => resolve([]);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('reminders')) {
                db.createObjectStore('reminders', { keyPath: 'eventId' });
            }
        };
    });
}

async function updateStoredReminder(reminder) {
    return new Promise((resolve) => {
        const request = indexedDB.open('CalindarDB', 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['reminders'], 'readwrite');
            const store = transaction.objectStore('reminders');
            store.put(reminder);
            resolve();
        };
        
        request.onerror = () => resolve();
    });
}

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