// Main application logic
class CalendarApp {
    constructor() {
        this.currentCalendar = null;
        this.calendars = [];
        this.calendar = null;
        this.socket = null;
        this.currentUser = null;
        
        this.init();
    }
    
    // Helper function to format date as local datetime string
    formatLocalDateTime(date) {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0') + 'T' + 
               String(date.getHours()).padStart(2, '0') + ':' + 
               String(date.getMinutes()).padStart(2, '0') + ':' + 
               String(date.getSeconds()).padStart(2, '0');
    }
    
    // Helper function to format time without seconds
    formatTimeWithoutSeconds(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            month: 'numeric',
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
    
    // Helper function to format reminder minutes into readable text
    formatReminderText(minutes) {
        if (minutes === 0) return 'No reminder';
        if (minutes < 60) return `${minutes} minutes before`;
        if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''} before`;
        }
        const days = Math.floor(minutes / 1440);
        return `${days} day${days > 1 ? 's' : ''} before`;
    }
    
    init() {
        this.initializeSocketIO();
        this.bindEvents();
        this.checkUser();
        this.checkForSharedCalendar();
    }
    
    initializeSocketIO() {
        this.socket = io();
        
        this.socket.on('event_created', (event) => {
            if (this.calendar) {
                this.calendar.addEvent(event);
                // Only show notification if this is from another user
                // The event creator already gets a success notification
            }
        });
        
        this.socket.on('event_updated', (event) => {
            if (this.calendar) {
                this.calendar.updateEvent(event);
                // Only show notification if this is from another user
                // The event updater already gets a success notification
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
        });
    }
    
    bindEvents() {
        // Create Calendar Modal
        document.getElementById('createCalendarBtn')?.addEventListener('click', () => {
            this.showModal('createCalendarModal');
        });
        
        document.getElementById('createCalendarForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCalendar();
        });
        
        // Join Calendar Modal
        document.getElementById('joinCalendarBtn')?.addEventListener('click', () => {
            this.showModal('joinCalendarModal');
        });
        
        document.getElementById('joinCalendarForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinCalendar();
        });
        
        // Add Event Modal
        document.getElementById('addEventBtn')?.addEventListener('click', () => {
            this.showAddEventModal();
        });
        
        // Note: Form submission handler is set dynamically in showAddEventModal() and editEvent()
        
        // Share Calendar
        document.getElementById('shareCalendarBtn')?.addEventListener('click', () => {
            this.showShareModal();
        });
        
        // Copy Share Code
        document.getElementById('copyShareCode')?.addEventListener('click', () => {
            this.copyShareCode();
        });
        
        // Back to calendars
        document.getElementById('backToCalendars')?.addEventListener('click', () => {
            this.showCalendarsList();
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
    
    async checkUser() {
        try {
            const response = await fetch('/api/users/current');
            if (response.ok) {
                this.currentUser = await response.json();
                document.getElementById('currentUserName').textContent = `Hello, ${this.currentUser.username}!`;
                this.showMainApp();
                this.loadCalendars();
            } else {
                this.showUsernameSetup();
            }
        } catch (error) {
            console.error('Error checking user:', error);
            this.showUsernameSetup();
        }
    }
    
    showUsernameSetup() {
        this.hideAllSections();
        document.getElementById('usernameSection').style.display = 'block';
        
        // Focus on username input
        const usernameInput = document.getElementById('usernameInput');
        usernameInput.focus();
        
        // Allow Enter key to submit
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setUsername();
            }
        });
    }
    
    async setUsername() {
        const username = document.getElementById('usernameInput').value.trim();
        
        if (!username) {
            this.showNotification('Please enter your name', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
                document.getElementById('currentUserName').textContent = `Hello, ${this.currentUser.username}!`;
                this.showMainApp();
                this.loadCalendars();
                this.showNotification(`Welcome, ${username}!`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error setting username', 'error');
            }
        } catch (error) {
            console.error('Error setting username:', error);
            this.showNotification('Error setting username', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showMainApp() {
        this.hideAllSections();
        // Check if user has calendars to show appropriate section
        if (this.calendars && this.calendars.length > 0) {
            this.showCalendarsList();
        } else {
            this.showWelcomeSection();
        }
    }
    
    checkForSharedCalendar() {
        const path = window.location.pathname;
        const match = path.match(/\/calendar\/(.+)/);
        if (match) {
            const shareCode = match[1];
            this.loadSharedCalendar(shareCode);
        }
    }
    
    async loadCalendars() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch('/api/users/calendars');
            if (response.ok) {
                this.calendars = await response.json();
                this.renderCalendarsList();
                
                if (this.calendars.length > 0) {
                    this.showCalendarsList();
                } else {
                    this.showWelcomeSection();
                }
            }
        } catch (error) {
            console.error('Error loading calendars:', error);
            this.showNotification('Error loading calendars', 'error');
        }
    }
    
    async loadSharedCalendar(shareCode) {
        try {
            this.showLoading();
            const response = await fetch(`/api/calendars/${shareCode}`);
            if (response.ok) {
                const calendar = await response.json();
                this.currentCalendar = calendar;
                await this.showCalendarView(calendar);
                
                // Join the calendar room for real-time updates
                this.socket.emit('join_calendar', { share_code: shareCode });
            } else {
                this.showNotification('Calendar not found', 'error');
            }
        } catch (error) {
            console.error('Error loading shared calendar:', error);
            this.showNotification('Error loading calendar', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    renderCalendarsList() {
        const container = document.getElementById('calendarsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.calendars.forEach(calendar => {
            const card = document.createElement('div');
            card.className = 'calendar-card';
            
            const ownerBadge = calendar.is_owner ? '<span class="calendar-owner-badge">Owner</span>' : '';
            const membersText = calendar.members_count ? `${calendar.members_count} members` : '1 member';
            
            // Create tooltips
            const memberTooltip = calendar.member_names ? calendar.member_names.join(', ') : 'No members';
            const eventsTooltip = calendar.recent_event_titles && calendar.recent_event_titles.length > 0 
                ? calendar.recent_event_titles.join(', ') 
                : 'No events';
            
            card.innerHTML = `
                <div class="calendar-header">
                    <h3>${calendar.name}</h3>
                    ${ownerBadge}
                </div>
                <div class="calendar-meta">
                    <span>Code: ${calendar.share_code}</span>
                    <span class="tooltip-container" title="${eventsTooltip}">${calendar.events_count} events</span>
                    <span class="tooltip-container" title="${memberTooltip}">${membersText}</span>
                </div>
                <div class="calendar-actions">
                    <button class="btn btn-primary" onclick="app.openCalendar(${calendar.id})">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    <button class="btn btn-outline" onclick="app.shareCalendar('${calendar.share_code}')">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                    ${calendar.is_owner && calendar.members_count === 1 ? `<button class="btn btn-danger" onclick="deleteCalendar(${calendar.id}, '${calendar.name}')" title="Delete Calendar">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>` : ''}
                    ${!calendar.is_owner ? `<button class="btn leave-calendar-btn" onclick="leaveCalendar(${calendar.id}, '${calendar.name}')" title="Leave Calendar">
                        <i class="fas fa-sign-out-alt"></i>
                        Leave
                    </button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    async createCalendar() {
        const formData = new FormData(document.getElementById('createCalendarForm'));
        const name = formData.get('name').trim();
        
        if (!name) {
            this.showNotification('Please enter a calendar name', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch('/api/calendars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });
            
            if (response.ok) {
                const calendar = await response.json();
                this.calendars.push(calendar);
                this.renderCalendarsList();
                this.closeModal('createCalendarModal');
                this.showNotification('Calendar created successfully!', 'success');
                this.showCalendarsList();
                
                // Automatically open the new calendar
                setTimeout(() => this.openCalendar(calendar.id), 500);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error creating calendar', 'error');
            }
        } catch (error) {
            console.error('Error creating calendar:', error);
            this.showNotification('Error creating calendar', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async joinCalendar() {
        const formData = new FormData(document.getElementById('joinCalendarForm'));
        const shareCode = formData.get('shareCode').trim().toUpperCase();
        
        if (!shareCode) {
            this.showNotification('Please enter a share code', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch('/api/calendars/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ share_code: shareCode }),
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Reload calendars to get updated list
                await this.loadCalendars();
                
                this.closeModal('joinCalendarModal');
                this.showNotification(result.message, 'success');
                this.showCalendarsList();
                
                // Automatically open the joined calendar
                setTimeout(() => this.openCalendar(result.calendar.id), 500);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Calendar not found. Please check the share code.', 'error');
            }
        } catch (error) {
            console.error('Error joining calendar:', error);
            this.showNotification('Error joining calendar', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async leaveCalendar(calendarId, calendarName) {
        // Confirm before leaving
        if (!confirm(`Are you sure you want to leave "${calendarName}"? This will remove it from your dashboard but won't affect other members.`)) {
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch(`/api/calendars/${calendarId}/leave`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                // Remove calendar from local list
                this.calendars = this.calendars.filter(c => c.id !== calendarId);
                this.renderCalendarsList();
                
                // If no calendars left, show welcome section
                if (this.calendars.length === 0) {
                    this.showWelcomeSection();
                }
                
                this.showNotification(`Left "${calendarName}" successfully`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error leaving calendar', 'error');
            }
        } catch (error) {
            console.error('Error leaving calendar:', error);
            this.showNotification('Error leaving calendar', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async deleteCalendar(calendarId, calendarName) {
        // Confirm before deleting
        if (!confirm(`Are you sure you want to permanently delete "${calendarName}"? This action cannot be undone and will remove all events and data.`)) {
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                // Remove calendar from local list
                this.calendars = this.calendars.filter(c => c.id !== calendarId);
                this.renderCalendarsList();
                
                // If no calendars left, show welcome section
                if (this.calendars.length === 0) {
                    this.showWelcomeSection();
                }
                
                this.showNotification(`"${calendarName}" deleted successfully`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error deleting calendar', 'error');
            }
        } catch (error) {
            console.error('Error deleting calendar:', error);
            this.showNotification('Error deleting calendar', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async openCalendar(calendarId) {
        const calendar = this.calendars.find(c => c.id === calendarId);
        if (calendar) {
            await this.showCalendarView(calendar);
        }
    }
    
    async showCalendarView(calendar) {
        this.currentCalendar = calendar;
        
        // Update UI
        document.getElementById('currentCalendarName').textContent = calendar.name;
        
        // Hide other sections and show calendar view
        this.hideAllSections();
        document.getElementById('calendarView').style.display = 'block';
        
        // Initialize calendar widget
        if (!this.calendar) {
            this.calendar = new CalendarWidget('calendar');
        }
        
        // Load calendar data
        await Promise.all([
            this.loadCalendarEvents(calendar.id),
            this.loadUpcomingEvents(calendar.id),
            this.loadCalendarMembers(calendar.id)
        ]);
        
        // Join the calendar room for real-time updates
        this.socket.emit('join_calendar', { share_code: calendar.share_code });
    }
    
    async loadCalendarEvents(calendarId) {
        try {
            const response = await fetch(`/api/calendars/${calendarId}/events`);
            if (response.ok) {
                const events = await response.json();
                this.calendar.setEvents(events);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.showNotification('Error loading events', 'error');
        }
    }
    
    async loadUpcomingEvents(calendarId) {
        try {
            const response = await fetch(`/api/calendars/${calendarId}/upcoming-events`);
            if (response.ok) {
                const events = await response.json();
                this.renderUpcomingEvents(events);
            }
        } catch (error) {
            console.error('Error loading upcoming events:', error);
            document.getElementById('upcomingEvents').innerHTML = '<div class="no-events">Error loading events</div>';
        }
    }
    
    async loadCalendarMembers(calendarId) {
        try {
            const response = await fetch(`/api/calendars/${calendarId}/members`);
            if (response.ok) {
                const members = await response.json();
                this.renderCalendarMembers(members);
            }
        } catch (error) {
            console.error('Error loading members:', error);
            document.getElementById('calendarMembers').innerHTML = '<div class="loading-placeholder">Error loading members</div>';
        }
    }
    
    renderUpcomingEvents(events) {
        const container = document.getElementById('upcomingEvents');
        if (!container) return;
        
        if (events.length === 0) {
            container.innerHTML = '<div class="no-events">No upcoming events</div>';
            return;
        }
        
        container.innerHTML = events.map(event => {
            const startDate = new Date(event.start_time);
            const formatDate = (date) => {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                if (date.toDateString() === today.toDateString()) {
                    return 'Today ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                } else if (date.toDateString() === tomorrow.toDateString()) {
                    return 'Tomorrow ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                } else {
                    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            };
            
            return `
                <div class="upcoming-event clickable" onclick="app.navigateToEventDate('${event.start_time}')">
                    <div class="event-title">${event.title}</div>
                    <div class="event-date">${formatDate(startDate)}</div>
                </div>
            `;
        }).join('');
    }
    
    renderCalendarMembers(members) {
        const container = document.getElementById('calendarMembers');
        if (!container) return;
        
        if (members.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No members</div>';
            return;
        }
        
        // Check if current user is owner
        const currentUserMember = members.find(m => m.username === this.currentUser.username);
        const isCurrentUserOwner = currentUserMember && currentUserMember.is_owner;
        
        container.innerHTML = members.map(member => {
            const initials = member.username.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
            const roleText = member.is_owner ? 'Owner' : 'Member';
            const isCurrentUser = member.username === this.currentUser.username;
            
            let actionButtons = '';
            if (isCurrentUserOwner && !isCurrentUser) {
                // Owner can remove other members and transfer ownership
                actionButtons = `
                    <div class="member-actions">
                        <button class="btn btn-small btn-outline" onclick="app.transferOwnership(${member.id}, '${member.username}')" title="Transfer Ownership">
                            <i class="fas fa-crown"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="app.removeMember(${member.id}, '${member.username}')" title="Remove Member">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                `;
            }
            
            return `
                <div class="member-item">
                    <div class="member-avatar">${initials}</div>
                    <div class="member-info">
                        <div class="member-name">${member.username}</div>
                        <div class="member-role">${roleText}</div>
                    </div>
                    ${actionButtons}
                </div>
            `;
        }).join('');
    }
    
    async removeMember(memberId, memberName) {
        if (!confirm(`Are you sure you want to remove ${memberName} from this calendar?`)) {
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch(`/api/calendars/${this.currentCalendar.id}/members/${memberId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                // Reload members list
                await this.loadCalendarMembers(this.currentCalendar.id);
                this.showNotification(`${memberName} removed from calendar`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error removing member', 'error');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            this.showNotification('Error removing member', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async transferOwnership(memberId, memberName) {
        if (!confirm(`Are you sure you want to transfer ownership of this calendar to ${memberName}? You will become a regular member.`)) {
            return;
        }
        
        try {
            this.showLoading();
            const response = await fetch(`/api/calendars/${this.currentCalendar.id}/transfer-ownership`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ new_owner_id: memberId }),
            });
            
            if (response.ok) {
                // Reload members list and calendar data
                await Promise.all([
                    this.loadCalendarMembers(this.currentCalendar.id),
                    this.loadCalendars() // Refresh calendar list to update owner status
                ]);
                this.showNotification(`Ownership transferred to ${memberName}`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error transferring ownership', 'error');
            }
        } catch (error) {
            console.error('Error transferring ownership:', error);
            this.showNotification('Error transferring ownership', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showAddEventModal() {
        if (!this.currentCalendar) {
            this.showNotification('Please select a calendar first', 'error');
            return;
        }
        
        // Reset form handler for creating new events
        const form = document.getElementById('addEventForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.addEvent();
        };
        
        // Reset modal title
        document.querySelector('#addEventModal .modal-header h3').textContent = 'Add Event';
        
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
                // For all-day events, create dates as local datetime
                startDateTime = new Date(startDate + 'T00:00:00');
                endDateTime = new Date(endDate + 'T23:59:59');
            } else {
                if (!startTime || !endTime) {
                    this.showNotification('Please specify start and end times', 'error');
                    return;
                }
                // Create dates as local datetime (Philippines time)
                startDateTime = new Date(startDate + 'T' + startTime + ':00');
                endDateTime = new Date(endDate + 'T' + endTime + ':00');
            }
            
            if (startDateTime >= endDateTime) {
                this.showNotification('End time must be after start time', 'error');
                return;
            }
            
            const eventData = {
                title,
                description,
                start_time: this.formatLocalDateTime(startDateTime),
                end_time: this.formatLocalDateTime(endDateTime),
                all_day: allDay,
                reminder_minutes: reminderMinutes,
                calendar_id: this.currentCalendar.id
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
                // Socket event will handle adding to calendar display
                
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
    
    async editEvent(eventId) {
        try {
            // Get event details
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                this.showNotification('Event not found', 'error');
                return;
            }
            
            const event = await response.json();
            
            // Populate form with event data
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description || '';
            
            // Use the dates directly - they should already be in the correct timezone
            const startDate = new Date(event.start_time);
            const endDate = new Date(event.end_time);
            
            document.getElementById('eventStartDate').value = formatDateForInput(startDate);
            document.getElementById('eventEndDate').value = formatDateForInput(endDate);
            
            if (event.all_day) {
                document.getElementById('allDay').checked = true;
                document.getElementById('eventStartTime').disabled = true;
                document.getElementById('eventEndTime').disabled = true;
                document.getElementById('eventStartTime').value = '';
                document.getElementById('eventEndTime').value = '';
            } else {
                document.getElementById('allDay').checked = false;
                document.getElementById('eventStartTime').disabled = false;
                document.getElementById('eventEndTime').disabled = false;
                document.getElementById('eventStartTime').value = startDate.toTimeString().slice(0, 5);
                document.getElementById('eventEndTime').value = endDate.toTimeString().slice(0, 5);
            }
            
            document.getElementById('reminderMinutes').value = event.reminder_minutes;
            
            // Change form submission to update instead of create
            const form = document.getElementById('addEventForm');
            form.onsubmit = (e) => {
                e.preventDefault();
                this.updateEvent(eventId);
            };
            
            // Change modal title
            document.querySelector('#addEventModal .modal-header h3').textContent = 'Edit Event';
            
            this.showModal('addEventModal');
        } catch (error) {
            console.error('Error loading event for edit:', error);
            this.showNotification('Error loading event', 'error');
        }
    }
    
    async updateEvent(eventId) {
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
                // For all-day events, create dates as local datetime
                startDateTime = new Date(startDate + 'T00:00:00');
                endDateTime = new Date(endDate + 'T23:59:59');
            } else {
                if (!startTime || !endTime) {
                    this.showNotification('Please specify start and end times', 'error');
                    return;
                }
                // Create dates as local datetime (Philippines time)
                startDateTime = new Date(startDate + 'T' + startTime + ':00');
                endDateTime = new Date(endDate + 'T' + endTime + ':00');
            }
            
            if (startDateTime >= endDateTime) {
                this.showNotification('End time must be after start time', 'error');
                return;
            }
            
            const eventData = {
                title,
                description,
                start_time: this.formatLocalDateTime(startDateTime),
                end_time: this.formatLocalDateTime(endDateTime),
                all_day: allDay,
                reminder_minutes: reminderMinutes
            };
            
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });
            
            if (response.ok) {
                const updatedEvent = await response.json();
                // Socket event will handle calendar display update
                
                this.closeModal('addEventModal');
                this.showNotification('Event updated successfully!', 'success');
                
                // Reset form for next use
                this.resetEventForm();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error updating event', 'error');
            }
        } catch (error) {
            console.error('Error updating event:', error);
            this.showNotification('Error updating event', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                // Remove event from calendar display
                if (this.calendar) {
                    this.calendar.removeEvent(eventId);
                }
                
                // Reload upcoming events
                await this.loadUpcomingEvents(this.currentCalendar.id);
                
                this.showNotification('Event deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error deleting event', 'error');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showNotification('Error deleting event', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    resetEventForm() {
        // Reset form to add mode
        const form = document.getElementById('addEventForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.addEvent();
        };
        
        // Reset modal title
        document.querySelector('#addEventModal .modal-header h3').textContent = 'Add New Event';
        
        // Clear form
        form.reset();
        document.getElementById('eventStartTime').disabled = false;
        document.getElementById('eventEndTime').disabled = false;
    }
    
    shareCalendar(shareCode) {
        document.getElementById('shareCodeDisplay').textContent = shareCode;
        this.showModal('shareCalendarModal');
    }
    
    showShareModal() {
        if (this.currentCalendar) {
            this.shareCalendar(this.currentCalendar.share_code);
        }
    }
    
    copyShareCode() {
        const shareCode = document.getElementById('shareCodeDisplay').textContent;
        navigator.clipboard.writeText(shareCode).then(() => {
            this.showNotification('Share code copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Could not copy to clipboard', 'error');
        });
    }
    
    showCalendarsList() {
        this.hideAllSections();
        document.getElementById('calendarsSection').style.display = 'block';
    }
    
    showWelcomeSection() {
        this.hideAllSections();
        document.getElementById('welcomeSection').style.display = 'block';
    }
    
    hideAllSections() {
        document.getElementById('usernameSection').style.display = 'none';
        document.getElementById('welcomeSection').style.display = 'none';
        document.getElementById('calendarsSection').style.display = 'none';
        document.getElementById('calendarView').style.display = 'none';
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
    
    navigateToEventDate(eventStartTime) {
        if (this.calendar) {
            const eventDate = new Date(eventStartTime);
            this.calendar.navigateToDate(eventDate);
        }
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
                .upcoming-event.clickable {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .upcoming-event.clickable:hover {
                    background-color: rgba(33, 150, 243, 0.1);
                    border-radius: 4px;
                }
                .calendar-day {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .calendar-day:hover {
                    background-color: rgba(33, 150, 243, 0.05);
                }
                .calendar-day.selected {
                    background-color: rgba(33, 150, 243, 0.2);
                    border-radius: 4px;
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

// Global functions for use in HTML
window.showCreateCalendarModal = () => app.showModal('createCalendarModal');
window.showJoinCalendarModal = () => app.showModal('joinCalendarModal');
window.closeModal = (modalId) => app.closeModal(modalId);
window.setUsername = (event) => {
    if (event) event.preventDefault();
    return app.setUsername(event);
};
window.leaveCalendar = (calendarId, calendarName) => app.leaveCalendar(calendarId, calendarName);
window.deleteCalendar = (calendarId, calendarName) => app.deleteCalendar(calendarId, calendarName);
window.editEvent = (eventId) => app.editEvent(eventId);
window.deleteEvent = (eventId) => app.deleteEvent(eventId);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CalendarApp();
});