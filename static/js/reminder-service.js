class ReminderService {
    constructor() {
        this.reminders = new Map();
        this.checkInterval = null;
        this.isRunning = false;
        this.debug = true; // Enable debug logging
        console.log('🔔 ReminderService: Initializing...');
        this.initBrowserNotifications();
    }

    async initBrowserNotifications() {
        console.log('🔔 ReminderService: Initializing browser notifications...');
        
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.error('🔔 This browser does not support notifications');
            return false;
        }

        console.log('🔔 Current notification permission:', Notification.permission);

        // Request notification permission immediately
        if (Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('🔔 Notification permission requested:', permission);
                
                if (permission === 'granted') {
                    // Show a test notification to confirm it works
                    new Notification('🔔 Calindar Notifications Enabled', {
                        body: 'You will now receive event reminders!',
                        icon: '/static/icons/icon-192x192.png'
                    });
                }
            } catch (error) {
                console.error('🔔 Error requesting notification permission:', error);
            }
        } else if (Notification.permission === 'granted') {
            console.log('🔔 Notifications already granted');
        } else {
            console.warn('🔔 Notifications denied by user');
        }

        return Notification.permission === 'granted';
    }

    start() {
        if (this.isRunning) {
            console.log('🔔 ReminderService: Already running');
            return;
        }
        
        this.isRunning = true;
        // Check every 10 seconds for testing (was 30 seconds)
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 10000);
        
        console.log('🔔 ReminderService: Started - checking every 10 seconds');
        
        // Do an immediate check
        this.checkReminders();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('Reminder service stopped');
    }

    addEvent(event) {
        if (event.reminder_minutes && event.reminder_minutes > 0) {
            const eventStart = new Date(event.start_time);
            const reminderTime = new Date(eventStart.getTime() - (event.reminder_minutes * 60000));
            const now = new Date();
            
            console.log(`[Reminder Service] Processing event "${event.title}"`);
            console.log(`[Reminder Service] Event start: ${eventStart.toLocaleString()}`);
            console.log(`[Reminder Service] Reminder time: ${reminderTime.toLocaleString()}`);
            console.log(`[Reminder Service] Current time: ${now.toLocaleString()}`);
            console.log(`[Reminder Service] Minutes before: ${event.reminder_minutes}`);
            
            // Add reminder regardless of time for debugging
            this.reminders.set(event.id, {
                eventId: event.id,
                title: event.title,
                description: event.description,
                reminderTime: reminderTime,
                eventStart: eventStart,
                reminderMinutes: event.reminder_minutes,
                notified: false
            });
            
            console.log(`[Reminder Service] Reminder set for "${event.title}" at ${reminderTime.toLocaleString()}`);
            console.log(`[Reminder Service] Total reminders: ${this.reminders.size}`);
        } else {
            console.log(`[Reminder Service] No reminder needed for "${event.title}" (reminder_minutes: ${event.reminder_minutes})`);
        }
    }

    removeEvent(eventId) {
        if (this.reminders.has(eventId)) {
            this.reminders.delete(eventId);
            console.log(`Reminder removed for event ${eventId}`);
        }
    }

    updateEvent(event) {
        // Remove old reminder and add new one
        this.removeEvent(event.id);
        this.addEvent(event);
    }

    checkReminders() {
        const now = new Date();
        console.log(`[Reminder Service] Checking reminders at ${now.toLocaleString()}`);
        console.log(`[Reminder Service] Total reminders to check: ${this.reminders.size}`);
        
        for (const [eventId, reminder] of this.reminders.entries()) {
            const timeDiff = reminder.reminderTime - now;
            const secondsUntil = Math.floor(timeDiff / 1000);
            
            console.log(`[Reminder Service] Event "${reminder.title}": ${secondsUntil}s until reminder (notified: ${reminder.notified})`);
            
            if (!reminder.notified && now >= reminder.reminderTime) {
                console.log(`[Reminder Service] Triggering reminder for "${reminder.title}"`);
                this.triggerReminder(reminder);
                reminder.notified = true;
            }
            
            // Clean up old reminders (remove after event has passed)
            if (now > reminder.eventStart) {
                console.log(`[Reminder Service] Cleaning up past event: "${reminder.title}"`);
                this.reminders.delete(eventId);
            }
        }
    }

    triggerReminder(reminder) {
        const title = `🔔 Event Reminder`;
        const message = `"${reminder.title}" starts in ${reminder.reminderMinutes} minutes`;
        
        console.log(`🔔 TRIGGERING REMINDER: ${message}`);
        console.log(`🔔 Notification permission: ${Notification.permission}`);
        
        // Show browser notification if available
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                console.log('🔔 Creating browser notification...');
                try {
                    const notification = new Notification(title, {
                        body: message,
                        icon: '/static/icons/icon-192x192.png',
                        badge: '/static/icons/icon-192x192.png',
                        tag: `reminder-${reminder.eventId}`,
                        requireInteraction: true,
                        vibrate: [200, 100, 200]
                    });

                    notification.onclick = () => {
                        console.log('🔔 Notification clicked');
                        window.focus();
                        notification.close();
                    };

                    notification.onshow = () => {
                        console.log('🔔 Notification shown successfully');
                    };

                    notification.onerror = (error) => {
                        console.error('🔔 Notification error:', error);
                    };

                    // Auto-close after 15 seconds
                    setTimeout(() => {
                        notification.close();
                    }, 15000);
                } catch (error) {
                    console.error('🔔 Error creating notification:', error);
                }
            } else {
                console.warn('🔔 Notification permission not granted:', Notification.permission);
                // Try to request permission again
                Notification.requestPermission().then(permission => {
                    console.log('🔔 Permission request result:', permission);
                });
            }
        } else {
            console.error('🔔 Notifications not supported in this browser');
        }

        // Also show in-app notification
        if (window.sharedApp && window.sharedApp.showNotification) {
            window.sharedApp.showNotification(message, 'reminder');
        } else if (window.app && window.app.showNotification) {
            window.app.showNotification(message, 'reminder');
        }

        // Play notification sound
        this.playNotificationSound();

        console.log(`Reminder triggered: ${message}`);
    }

    playNotificationSound() {
        try {
            // Create a simple notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    }

    // Load reminders from events
    loadReminders(events) {
        this.reminders.clear();
        
        if (Array.isArray(events)) {
            events.forEach(event => {
                this.addEvent(event);
            });
        }
        
        console.log(`Loaded ${this.reminders.size} reminders`);
    }

    // Get status info
    getStatus() {
        return {
            isRunning: this.isRunning,
            reminderCount: this.reminders.size,
            upcomingReminders: Array.from(this.reminders.values())
                .filter(r => !r.notified)
                .sort((a, b) => a.reminderTime - b.reminderTime)
                .slice(0, 5)
                .map(r => ({
                    title: r.title,
                    reminderTime: r.reminderTime.toLocaleString(),
                    minutesUntil: Math.ceil((r.reminderTime - new Date()) / 60000)
                }))
        };
    }

    // Debug method to test reminders immediately
    testReminder() {
        console.log('🔔 Testing reminder system...');
        
        const testReminder = {
            eventId: 'test-' + Date.now(),
            title: 'Test Event',
            description: 'This is a test reminder',
            reminderTime: new Date(),
            eventStart: new Date(Date.now() + 5 * 60000), // 5 minutes from now
            reminderMinutes: 5,
            notified: false
        };
        
        console.log('🔔 Triggering test reminder...');
        this.triggerReminder(testReminder);
    }

    // Debug method to create a test event with reminder in 10 seconds
    createTestEvent() {
        const now = new Date();
        const testEvent = {
            id: 'test-' + Date.now(),
            title: 'Test Event - Will Remind in 10 seconds',
            description: 'This is a test event for reminder testing',
            start_time: new Date(now.getTime() + 70000).toISOString(), // Start in 70 seconds
            end_time: new Date(now.getTime() + 130000).toISOString(), // End in 2 minutes 10 seconds
            reminder_minutes: 1 // Remind 1 minute before (so 10 seconds from now)
        };
        
        console.log('🔔 Creating test event that will remind in 10 seconds...');
        this.addEvent(testEvent);
        
        if (!this.isRunning) {
            this.start();
        }
        
        return testEvent;
    }

    // Test method - create a reminder that triggers in 30 seconds
    createTestReminder() {
        const now = new Date();
        const testEvent = {
            id: 'test-' + Date.now(),
            title: 'Test Reminder',
            description: 'This is a test reminder',
            start_time: new Date(now.getTime() + 60000).toISOString(), // 1 minute from now
            reminder_minutes: 0.5 // 30 seconds before
        };
        
        console.log('[Reminder Service] Creating test reminder...');
        this.addEvent(testEvent);
        return testEvent;
    }
}

// Notification manager to handle permissions and initialization
class NotificationManager {
    static async initialize() {
        console.log('🔔 NotificationManager: Initializing...');
        
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.error('🔔 This browser does not support notifications');
            return false;
        }

        // Request permission immediately on page load
        if (Notification.permission === 'default') {
            console.log('🔔 Requesting notification permission...');
            
            // Show a user-friendly message first
            const userAccepts = confirm('Would you like to receive notifications for your calendar reminders?');
            
            if (userAccepts) {
                try {
                    const permission = await Notification.requestPermission();
                    console.log('🔔 Permission granted:', permission);
                    
                    if (permission === 'granted') {
                        // Show confirmation notification
                        new Notification('🔔 Calindar Notifications Enabled!', {
                            body: 'You will now receive event reminders.',
                            icon: '/static/icons/icon-192x192.png'
                        });
                        return true;
                    }
                } catch (error) {
                    console.error('🔔 Error requesting permission:', error);
                }
            }
        } else if (Notification.permission === 'granted') {
            console.log('🔔 Notifications already granted');
            return true;
        }

        console.warn('🔔 Notifications not available');
        return false;
    }

    static testNotification() {
        if (Notification.permission === 'granted') {
            new Notification('🔔 Test Notification', {
                body: 'This is a test notification from Calindar!',
                icon: '/static/icons/icon-192x192.png'
            });
        } else {
            console.warn('🔔 Cannot show test notification - permission not granted');
        }
    }
}

// Initialize notifications when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔔 DOM loaded, initializing notifications...');
    NotificationManager.initialize();
});

// Create global reminder service instance
window.reminderService = new ReminderService();

// Expose NotificationManager globally for testing
window.NotificationManager = NotificationManager;