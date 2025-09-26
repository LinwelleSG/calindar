// Calendar functionality
class CalendarWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.events = [];
        this.selectedDate = null;
        
        this.render();
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
    
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Create calendar header
        const header = this.createHeader(year, month);
        
        // Create calendar grid
        const grid = this.createGrid(year, month);
        
        // Clear container and add elements
        this.container.innerHTML = '';
        this.container.appendChild(header);
        this.container.appendChild(grid);
    }
    
    createHeader(year, month) {
        const header = document.createElement('div');
        header.className = 'calendar-navigation';
        
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Generate year options (current year ± 5 years)
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 5;
        let yearOptions = '';
        for (let y = startYear; y <= endYear; y++) {
            yearOptions += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
        }
        
        // Generate month options
        let monthOptions = '';
        monthNames.forEach((monthName, index) => {
            monthOptions += `<option value="${index}" ${index === month ? 'selected' : ''}>${monthName}</option>`;
        });
        
        header.innerHTML = `
            <div class="nav-controls">
                <button class="btn btn-outline" id="prevMonth">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="date-selectors">
                    <select id="monthSelect" class="month-select">
                        ${monthOptions}
                    </select>
                    <select id="yearSelect" class="year-select">
                        ${yearOptions}
                    </select>
                </div>
                <button class="btn btn-outline" id="nextMonth">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        header.querySelector('#prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });
        
        header.querySelector('#nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });
        
        // Month selector
        header.querySelector('#monthSelect').addEventListener('change', (e) => {
            this.currentDate.setMonth(parseInt(e.target.value));
            this.render();
        });
        
        // Year selector
        header.querySelector('#yearSelect').addEventListener('change', (e) => {
            this.currentDate.setFullYear(parseInt(e.target.value));
            this.render();
        });
        
        return header;
    }
    
    createGrid(year, month) {
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const headerRow = document.createElement('div');
        headerRow.className = 'calendar-header-row';
        
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            headerRow.appendChild(header);
        });
        
        grid.appendChild(headerRow);
        
        // Calendar days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const today = new Date();
        
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                
                // Add classes for styling
                if (currentDate.getMonth() !== month) {
                    dayElement.classList.add('other-month');
                }
                
                if (currentDate.toDateString() === today.toDateString()) {
                    dayElement.classList.add('today');
                }
                
                // Day number
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = currentDate.getDate();
                dayElement.appendChild(dayNumber);
                
                // Events for this day
                const eventsContainer = document.createElement('div');
                eventsContainer.className = 'day-events';
                
                const dayEvents = this.getEventsForDate(currentDate);
                dayEvents.forEach(event => {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'event-item';
                    eventElement.textContent = event.title;
                    eventElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showEventDetails(event);
                    });
                    eventsContainer.appendChild(eventElement);
                });
                
                dayElement.appendChild(eventsContainer);
                
                // Click handler for day
                dayElement.addEventListener('click', () => {
                    this.selectDate(currentDate);
                    // Open Add Event modal with selected date
                    if (window.app && window.app.currentCalendar) {
                        window.app.showAddEventModal();
                    }
                });
                
                grid.appendChild(dayElement);
            }
        }
        
        return grid;
    }
    
    selectDate(date) {
        this.selectedDate = date;
        
        // Remove previous selection
        this.container.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
        
        // Add selection to clicked day
        const dayElements = this.container.querySelectorAll('.calendar-day');
        dayElements.forEach(dayElement => {
            const dayNumber = parseInt(dayElement.querySelector('.day-number').textContent);
            if (dayNumber === date.getDate() && !dayElement.classList.contains('other-month')) {
                dayElement.classList.add('selected');
            }
        });
    }
    
    // Navigate to a specific date and highlight it
    navigateToDate(date) {
        // Change calendar to show the month of the target date
        this.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.render();
        
        // Select the specific date
        this.selectDate(date);
    }
    
    getEventsForDate(date) {
        return this.events.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate.toDateString() === date.toDateString();
        });
    }
    
    setEvents(events) {
        this.events = events;
        this.render();
    }
    
    addEvent(event) {
        // Check if event already exists to prevent duplicates
        const existingEvent = this.events.find(e => e.id === event.id);
        if (!existingEvent) {
            this.events.push(event);
            this.render();
        }
    }
    
    updateEvent(updatedEvent) {
        const index = this.events.findIndex(event => event.id === updatedEvent.id);
        if (index !== -1) {
            this.events[index] = updatedEvent;
            this.render();
        }
    }
    
    removeEvent(eventId) {
        this.events = this.events.filter(event => event.id !== eventId);
        this.render();
    }
    
    showEventDetails(event) {
        // Create and show event details modal
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${event.title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Description:</strong> ${event.description || 'No description'}</p>
                    <p><strong>Start:</strong> ${this.formatTimeWithoutSeconds(event.start_time)}</p>
                    <p><strong>End:</strong> ${this.formatTimeWithoutSeconds(event.end_time)}</p>
                    ${event.all_day ? '<p><strong>All Day Event</strong></p>' : ''}
                    ${event.reminder_minutes > 0 ? `<p><strong>Reminder:</strong> ${this.formatReminderText(event.reminder_minutes)}</p>` : ''}
                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                        <button class="btn btn-primary" onclick="editEvent(${event.id})">Edit</button>
                        <button class="btn btn-danger" onclick="deleteEvent(${event.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close modal when clicking close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        document.body.appendChild(modal);
    }
}

// Utility functions
function formatDateForInput(date) {
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTimeForInput(date) {
    return date.toTimeString().split(' ')[0].substring(0, 5);
}

function combineDateAndTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
}

// Philippines timezone utilities
function toPhilippinesTime(date) {
    return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
}

function formatDateForInputPH(date) {
    const phDate = toPhilippinesTime(date);
    return phDate.toISOString().split('T')[0];
}

function formatTimeForInputPH(date) {
    const phDate = toPhilippinesTime(date);
    return phDate.toTimeString().slice(0, 5);
}

// Export for use in other files
window.CalendarWidget = CalendarWidget;