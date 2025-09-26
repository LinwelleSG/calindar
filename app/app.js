// CALINDAR - Vanilla JavaScript Application
const app = {
    // Initialize application variables
    currentView: 'calendar',
    currentMonth: new Date(),
    dayHeaders: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    calendarDays: [],
    reminders: [],
    upcomingReminders: [],
    shareCode: '',
    editingReminder: false,
    currentReminder: {},

    // Initialize application
    init: function() {
        this.generateShareCode();
        this.loadReminders();
        this.generateCalendar();
        this.updateUpcomingReminders();
        this.updateDisplay();
    },

    // View management
    setView: function(view) {
        this.currentView = view;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(view + '-nav').classList.add('active');
        
        // Show/hide views
        document.getElementById('calendar-view').style.display = view === 'calendar' ? 'block' : 'none';
        document.getElementById('reminders-view').style.display = view === 'reminders' ? 'block' : 'none';
    },

    // Update display elements
    updateDisplay: function() {
        // Update month display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthDisplay = document.getElementById('current-month-display');
        if (monthDisplay) {
            monthDisplay.textContent = monthNames[this.currentMonth.getMonth()] + ' ' + this.currentMonth.getFullYear();
        }
        
        // Update share code display
        const shareCodeDisplay = document.getElementById('share-code-display');
        if (shareCodeDisplay) {
            shareCodeDisplay.textContent = this.shareCode;
        }
        
        // Update reminders list
        this.renderRemindersList();
    },

    // Calendar functions
    generateCalendar: function() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const today = new Date();
        
        // First day of the month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Start from the first Sunday of the calendar view
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        
        this.calendarDays = [];
        
        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayObj = {
                date: new Date(currentDate),
                currentMonth: currentDate.getMonth() === month,
                isToday: currentDate.toDateString() === today.toDateString(),
                events: this.getEventsForDate(currentDate)
            };
            
            this.calendarDays.push(dayObj);
        }
        
        this.renderCalendar();
    },

    renderCalendar: function() {
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;
        
        let html = '';
        
        // Add day headers
        this.dayHeaders.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Add calendar days
        this.calendarDays.forEach((day, index) => {
            const classes = ['calendar-day'];
            if (!day.currentMonth) classes.push('other-month');
            if (day.isToday) classes.push('today');
            if (day.events.length > 0) classes.push('has-events');
            
            const eventDots = day.events.slice(0, 3).map(() => '<div class="event-dot"></div>').join('');
            
            html += `
                <div class="${classes.join(' ')}" onclick="app.selectDay(${index})">
                    <span class="day-number">${day.date.getDate()}</span>
                    <div class="day-events">
                        ${eventDots}
                    </div>
                </div>
            `;
        });
        
        calendarGrid.innerHTML = html;
    },

    getEventsForDate: function(date) {
        return this.reminders.filter(reminder => {
            const reminderDate = new Date(reminder.date);
            return reminderDate.toDateString() === date.toDateString();
        });
    },

    previousMonth: function() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.generateCalendar();
        this.updateDisplay();
    },

    nextMonth: function() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.generateCalendar();
        this.updateDisplay();
    },

    selectDay: function(dayIndex) {
        const day = this.calendarDays[dayIndex];
        if (day.currentMonth) {
            this.currentReminder = {
                date: this.formatDateForInput(day.date),
                title: '',
                description: ''
            };
            this.editingReminder = false;
            this.showAddReminderDialog();
        }
    },

    // Utility function for date formatting
    formatDateForInput: function(date) {
        return date.toISOString().slice(0, 16);
    },

    // Reminder functions
    showAddReminderDialog: function() {
        this.currentReminder = {
            date: this.formatDateForInput(new Date()),
            title: '',
            description: ''
        };
        this.editingReminder = false;
        this.openReminderModal();
    },

    openReminderModal: function() {
        document.getElementById('reminder-modal').style.display = 'block';
        document.getElementById('reminder-modal-title').textContent = 
            this.editingReminder ? 'Edit Reminder' : 'Add Reminder';
        
        // Fill form
        document.getElementById('reminder-title').value = this.currentReminder.title || '';
        document.getElementById('reminder-date').value = this.currentReminder.date || '';
        document.getElementById('reminder-description').value = this.currentReminder.description || '';
    },

    editReminder: function(reminder) {
        this.currentReminder = {
            id: reminder.id,
            date: this.formatDateForInput(new Date(reminder.date)),
            title: reminder.title,
            description: reminder.description
        };
        this.editingReminder = true;
        this.openReminderModal();
    },

    saveReminder: function() {
        const title = document.getElementById('reminder-title').value;
        const date = document.getElementById('reminder-date').value;
        const description = document.getElementById('reminder-description').value;
        
        if (!title) return;

        const reminder = {
            id: this.currentReminder.id || Date.now(),
            date: new Date(date),
            title: title,
            description: description || '',
            createdBy: 'user'
        };

        if (this.editingReminder) {
            // Update existing reminder
            const index = this.reminders.findIndex(r => r.id === reminder.id);
            if (index !== -1) {
                this.reminders[index] = reminder;
            }
        } else {
            // Add new reminder
            this.reminders.push(reminder);
        }

        this.saveReminders();
        this.generateCalendar();
        this.updateUpcomingReminders();
        this.closeReminderModal();
        this.updateDisplay();
    },

    deleteReminder: function(reminder) {
        if (confirm('Are you sure you want to delete this reminder?')) {
            this.reminders = this.reminders.filter(r => r.id !== reminder.id);
            this.saveReminders();
            this.generateCalendar();
            this.updateUpcomingReminders();
            this.updateDisplay();
        }
    },

    closeReminderModal: function() {
        document.getElementById('reminder-modal').style.display = 'none';
        this.currentReminder = {};
    },

    updateUpcomingReminders: function() {
        const now = new Date();
        this.upcomingReminders = this.reminders
            .filter(reminder => new Date(reminder.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 10); // Show only next 10 upcoming reminders
    },

    renderRemindersList: function() {
        const remindersList = document.getElementById('reminders-list');
        if (!remindersList) return;
        
        if (this.upcomingReminders.length === 0) {
            remindersList.innerHTML = '<p class="no-reminders">No upcoming reminders. Click "Add Reminder" to create one.</p>';
            return;
        }
        
        let html = '';
        this.upcomingReminders.forEach(reminder => {
            const date = new Date(reminder.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            html += `
                <div class="reminder-item">
                    <div class="reminder-date">${formattedDate}</div>
                    <div class="reminder-title">${reminder.title}</div>
                    <div class="reminder-description">${reminder.description}</div>
                    <div class="reminder-actions">
                        <button class="btn-small" onclick="app.editReminderById(${reminder.id})">Edit</button>
                        <button class="btn-small btn-danger" onclick="app.deleteReminderById(${reminder.id})">Delete</button>
                    </div>
                </div>
            `;
        });
        
        remindersList.innerHTML = html;
    },

    editReminderById: function(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            this.editReminder(reminder);
        }
    },

    deleteReminderById: function(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            this.deleteReminder(reminder);
        }
    },

    // Share functions
    generateShareCode: function() {
        // Check if we already have a share code
        const stored = localStorage.getItem('calindar_share_code');
        if (stored) {
            this.shareCode = stored;
            return;
        }
        
        // Generate a unique 6-character code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.shareCode = result;
        localStorage.setItem('calindar_share_code', this.shareCode);
    },

    showShareDialog: function() {
        document.getElementById('share-modal').style.display = 'block';
        this.updateDisplay();
    },

    closeShareModal: function() {
        document.getElementById('share-modal').style.display = 'none';
    },

    copyShareCode: function() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.shareCode).then(() => {
                alert('Share code copied to clipboard!');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.shareCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Share code copied to clipboard!');
        }
    },

    // Sync functions
    showSyncDialog: function() {
        document.getElementById('sync-modal').style.display = 'block';
        document.getElementById('partner-code').value = '';
    },

    closeSyncModal: function() {
        document.getElementById('sync-modal').style.display = 'none';
    },

    syncWithPartner: function() {
        const partnerCode = document.getElementById('partner-code').value;
        
        if (!partnerCode) {
            alert('Please enter a valid share code');
            return;
        }

        // In a real app, this would connect to a backend service
        // For now, we'll simulate syncing with localStorage
        const partnerData = localStorage.getItem('calindar_partner_' + partnerCode);
        
        if (partnerData) {
            try {
                const partnerReminders = JSON.parse(partnerData);
                // Merge partner's reminders with ours
                partnerReminders.forEach(reminder => {
                    reminder.createdBy = 'partner';
                    reminder.id = 'partner_' + reminder.id;
                    // Only add if we don't already have this reminder
                    if (!this.reminders.find(r => r.id === reminder.id)) {
                        // Convert date string back to Date object
                        reminder.date = new Date(reminder.date);
                        this.reminders.push(reminder);
                    }
                });
                
                this.saveReminders();
                this.generateCalendar();
                this.updateUpcomingReminders();
                this.updateDisplay();
                this.closeSyncModal();
                alert('Successfully synced with partner\'s calendar!');
            } catch (e) {
                alert('Invalid share code or sync data');
            }
        } else {
            alert('No calendar found for this share code. Make sure your partner has shared their calendar.');
        }
    },

    // Storage functions
    loadReminders: function() {
        const stored = localStorage.getItem('calindar_reminders');
        if (stored) {
            try {
                this.reminders = JSON.parse(stored);
                // Convert date strings back to Date objects
                this.reminders.forEach(reminder => {
                    reminder.date = new Date(reminder.date);
                });
            } catch (e) {
                this.reminders = [];
            }
        }
    },

    saveReminders: function() {
        localStorage.setItem('calindar_reminders', JSON.stringify(this.reminders));
        // Also save for sharing (simplified version without partner data)
        const shareableReminders = this.reminders.filter(r => r.createdBy === 'user');
        localStorage.setItem('calindar_partner_' + this.shareCode, JSON.stringify(shareableReminders));
    }
};