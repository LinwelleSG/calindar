# Calindar - Family Calendar PWA

A lightweight Progressive Web Application (PWA) for family and partner calendar sharing built with Python Flask.

## Features

- 📅 **Calendar Management**: Create and manage multiple calendars
- 🔗 **Easy Sharing**: Generate unique share codes to invite family members
- ⚡ **Real-time Sync**: Live updates across all connected devices using WebSockets
- 📱 **PWA Support**: Install as a mobile app with offline capabilities
- 🔔 **Reminders**: Set custom reminders for events
- 📊 **Event Management**: Create, edit, and delete events with detailed information
- 🎨 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Project Structure

```
calindar/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── models.py                # Database models
│   ├── api/
│   │   ├── __init__.py
│   │   ├── calendar_routes.py   # Calendar API endpoints
│   │   └── event_routes.py      # Event API endpoints with WebSocket
│   └── main/
│       ├── __init__.py
│       └── routes.py            # Main routes and PWA manifest
├── static/
│   ├── css/
│   │   └── style.css           # Main stylesheet
│   ├── js/
│   │   ├── app.js              # Main application logic
│   │   ├── calendar.js         # Calendar widget
│   │   └── shared-calendar.js  # Shared calendar functionality
│   └── icons/                  # PWA icons (add your own)
├── templates/
│   ├── index.html              # Main application interface
│   ├── calendar.html           # Shared calendar view
│   └── sw.js                   # Service worker for PWA
├── requirements.txt            # Python dependencies
├── config.py                   # Application configuration
├── app.py                      # Application entry point
└── .env                        # Environment variables
```

## Installation & Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   - Edit `.env` file with your preferred settings
   - Change the `SECRET_KEY` in production

3. **Initialize the database:**
   ```bash
   python app.py
   ```
   The app will automatically create the SQLite database and tables.

4. **Run the application:**
   ```bash
   python app.py
   ```
   
   The app will be available at `http://127.0.0.1:5000`

## Usage

### Creating a Calendar
1. Click "Create New Calendar" on the homepage
2. Enter a calendar name
3. A unique 8-character share code will be generated

### Sharing a Calendar
1. Open your calendar
2. Click the "Share" button
3. Copy the share code and send it to family members
4. Others can join using "Join with Share Code"

### Adding Events
1. Open a calendar
2. Click "Add Event"
3. Fill in event details including:
   - Title and description
   - Start/end dates and times
   - All-day event option
   - Reminder settings (5 min to 1 day before)

### Real-time Updates
- All connected users see updates instantly
- Events added, modified, or deleted sync across all devices
- No manual refresh needed

## Technical Details

### Backend (Python Flask)
- **Flask**: Web framework
- **SQLAlchemy**: Database ORM
- **Flask-SocketIO**: Real-time WebSocket communication
- **Flask-Migrate**: Database migrations
- **SQLite**: Default database (easily configurable to PostgreSQL/MySQL)

### Frontend
- **Vanilla JavaScript**: No heavy frameworks, lightweight and fast
- **WebSocket**: Real-time updates
- **Service Worker**: PWA offline functionality
- **CSS Grid/Flexbox**: Responsive design
- **Font Awesome**: Icons

### Database Schema
- **Calendar**: Stores calendar information and share codes
- **Event**: Stores event details with foreign key to calendar
- **Reminder**: Stores reminder settings for events

### PWA Features
- Installable on mobile devices
- Offline capability with service worker
- App-like experience
- Custom icons and splash screens

## API Endpoints

### Calendars
- `POST /api/calendars` - Create new calendar
- `GET /api/calendars/{share_code}` - Get calendar by share code
- `GET /api/calendars/{id}/events` - Get events for calendar

### Events
- `POST /api/events` - Create new event
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event

### WebSocket Events
- `event_created` - Broadcast when event is created
- `event_updated` - Broadcast when event is updated
- `event_deleted` - Broadcast when event is deleted
- `join_calendar` - Join calendar room for updates

## Customization

### Adding Icons
Place your PWA icons in `static/icons/`:
- `icon-192x192.png` - For mobile home screen
- `icon-512x512.png` - For app install prompt

### Changing Colors
Edit the CSS variables in `static/css/style.css`:
```css
:root {
    --primary-color: #2196F3;
    --secondary-color: #1976D2;
    /* Add more custom colors */
}
```

### Database Configuration
For production, update the database URL in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost/calindar
```

## Production Deployment

1. **Set environment variables:**
   ```bash
   export FLASK_ENV=production
   export SECRET_KEY=your-very-secret-production-key
   export DATABASE_URL=your-production-database-url
   ```

2. **Use a production WSGI server:**
   ```bash
   gunicorn --worker-class eventlet -w 1 app:app
   ```

3. **Set up a reverse proxy (Nginx) for HTTPS**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Future Enhancements

- [ ] User authentication and personal accounts
- [ ] Email/SMS notifications for reminders
- [ ] Calendar export (iCal format)
- [ ] Event categories and color coding
- [ ] Recurring events
- [ ] File attachments for events
- [ ] Integration with Google Calendar
- [ ] Multiple timezone support
- [ ] Dark mode theme