// Shared calendar specific functionality
class SharedCalendarApp {
    constructor(shareCode) {
        this.shareCode = shareCode;
        this.calendar = null;
        this.calendarData = null;
        this.socket = null;
        
        this.init();
    }
    
    init() {
        this.initializeSocketIO();
        this.bindEvents();
        this.loadCalendar();
    }
    
    initializeSocketIO() {
        this.socket = io();
        
        this.socket.on('event_created', (event) => {
            if (this.calendar) {
                this.calendar.addEvent(event);
                this.showNotification('New event added: ' + event.title, 'success');
            }
        });
        
        this.socket.on('event_updated', (event) => {
            if (this.calendar) {
                this.calendar.updateEvent(event);
                this.showNotification('Event updated: ' + event.title, 'info');
            }
        });
        
        this.socket.on('event_deleted', (data) => {
            if (this.calendar) {
                this.calendar.removeEvent(data.event_id);
                this.showNotification('Event deleted', 'info');
            }
        });
        
        this.socket.on('joined_calendar', (data) => {
            console.log('Joined calendar:', data.calendar);
            this.calendarData = data.calendar;
        });
    }
    
    bindEvents() {
        // Add Event Modal
        document.getElementById('addEventBtn')?.addEventListener('click', () => {
            this.showAddEventModal();
        });
        
        document.getElementById('addEventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEvent();
        });
        
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadCalendar();
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // All day checkbox handler
        document.getElementById('allDay')?.addEventListener('change', (e) => {
            const timeInputs = document.querySelectorAll('#eventStartTime, #eventEndTime');
            timeInputs.forEach(input => {
                input.disabled = e.target.checked;
                if (e.target.checked) {
                    input.value = '';
                }
            });
        });
    }
    
    async loadCalendar() {
        try {
            this.showLoading();
            
            // Load calendar info
            const calendarResponse = await fetch(`/api/calendars/${this.shareCode}`);
            if (!calendarResponse.ok) {
                this.showNotification('Calendar not found', 'error');
                return;
            }
            
            this.calendarData = await calendarResponse.json();
            document.getElementById('calendarName').textContent = this.calendarData.name;
            
            // Initialize calendar widget
            if (!this.calendar) {
                this.calendar = new CalendarWidget('calendar');
            }
            
            // Load events
            const eventsResponse = await fetch(`/api/calendars/${this.shareCode}/events`);
            if (eventsResponse.ok) {
                const events = await eventsResponse.json();
                this.calendar.setEvents(events);
            }
            
            // Join the calendar room for real-time updates
            this.socket.emit('join_calendar', { share_code: this.shareCode });
            
        } catch (error) {
            console.error('Error loading calendar:', error);
            this.showNotification('Error loading calendar', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showAddEventModal() {
        if (!this.calendarData) {
            this.showNotification('Calendar not loaded yet', 'error');
            return;
        }
        
        // Pre-fill dates if a date is selected
        if (this.calendar && this.calendar.selectedDate) {
            const date = this.calendar.selectedDate;
            document.getElementById('eventStartDate').value = formatDateForInput(date);
            document.getElementById('eventEndDate').value = formatDateForInput(date);
        } else {
            const today = new Date();
            document.getElementById('eventStartDate').value = formatDateForInput(today);
            document.getElementById('eventEndDate').value = formatDateForInput(today);
        }
        
        // Set default times
        document.getElementById('eventStartTime').value = '09:00';
        document.getElementById('eventEndTime').value = '10:00';
        
        this.showModal('addEventModal');
    }
    
    async addEvent() {
        const formData = new FormData(document.getElementById('addEventForm'));
        
        const title = formData.get('title').trim();
        const description = formData.get('description').trim();
        const startDate = formData.get('startDate');
        const startTime = formData.get('startTime');
        const endDate = formData.get('endDate');
        const endTime = formData.get('endTime');
        const allDay = formData.has('allDay');
        const reminderMinutes = parseInt(formData.get('reminderMinutes'));
        
        if (!title || !startDate || !endDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            let startDateTime, endDateTime;
            
            if (allDay) {
                startDateTime = new Date(startDate + 'T00:00:00');
                endDateTime = new Date(endDate + 'T23:59:59');
            } else {
                if (!startTime || !endTime) {
                    this.showNotification('Please specify start and end times', 'error');
                    return;
                }
                startDateTime = combineDateAndTime(startDate, startTime);
                endDateTime = combineDateAndTime(endDate, endTime);
            }
            
            if (startDateTime >= endDateTime) {
                this.showNotification('End time must be after start time', 'error');
                return;
            }
            
            const eventData = {
                title,
                description,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                all_day: allDay,
                reminder_minutes: reminderMinutes,
                calendar_id: this.calendarData.id
            };
            
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });
            
            if (response.ok) {
                const event = await response.json();
                this.calendar.addEvent(event);
                this.closeModal('addEventModal');
                this.showNotification('Event added successfully!', 'success');
                
                // Reset form
                document.getElementById('addEventForm').reset();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error adding event', 'error');
            }
        } catch (error) {
            console.error('Error adding event:', error);
            this.showNotification('Error adding event', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                }
                .notification-success { background-color: #28a745; }
                .notification-error { background-color: #dc3545; }
                .notification-info { background-color: #2196F3; }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize shared calendar app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.SHARE_CODE) {
        window.sharedApp = new SharedCalendarApp(window.SHARE_CODE);
    }
});